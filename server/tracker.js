require('dotenv').config();
const crypto = require('crypto');
const { load } = require('./store');

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws').WebSocket;
}

const STORE = 'archipelago-overlays';
const HOST_ALIAS = process.env.AP_HOST_ALIAS || 'host.docker.internal';
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const WS_TIMEOUT = 10000;
const CLIENT_STATUS_GOAL = 30;
const TRACKER_TAGS = new Set(['Tracker', 'TextOnly', 'HintGame']);
const NON_GAME_PART = /stopped (tracking|viewing|hinting)/i;
const ITEM_FEED_MAX = 5;
const FEED_DEDUPE_WINDOW = 10000;
const FEED_PRUNE_AGE = 60000;

let ClientClass = null;
async function getClient() {
  if (!ClientClass) {
    ({ Client: ClientClass } = await import('archipelago.js'));
  }
  return ClientClass;
}

function getOverlays() {
  return load(STORE);
}

function getOverlay(id) {
  return getOverlays().find(o => o.id === id);
}

function rewriteLoopback(url) {
  try {
    const u = new URL(String(url).trim());
    if (LOOPBACK.has(u.hostname)) u.hostname = HOST_ALIAS;
    return u.toString().replace(/\/+$/, '');
  } catch {
    return String(url || '').trim().replace(/\/+$/, '');
  }
}

function wsUrl(webhost, port) {
  const u = new URL(rewriteLoopback(webhost));
  u.protocol = u.protocol === 'https:' || u.protocol === 'wss:' ? 'wss:' : 'ws:';
  u.port = String(port);
  u.pathname = '/';
  u.search = '';
  u.hash = '';
  return u.toString();
}

async function fetchRoomStatus(webhost, roomId) {
  const base = rewriteLoopback(webhost);
  try {
    await fetch(`${base}/room/${encodeURIComponent(roomId)}`, { signal: AbortSignal.timeout(6000) });
  } catch (e) {}
  const res = await fetch(`${base}/api/room_status/${encodeURIComponent(roomId)}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`WebHost room_status returned HTTP ${res.status} (check WebHost URL and Room ID)`);
  const data = await res.json();
  if (!data.last_port) throw new Error('Room status did not include last_port');
  return data;
}

function parsePlayers(status) {
  const players = status.players || [];
  const placeholder = players.length > 0 && String((players[0] || [])[0] || '').toLowerCase() === 'archipelago';
  return players
    .map((p, i) => ({ slot: placeholder ? i : i + 1, name: (p || [])[0] || null, game: (p || [])[1] || null }))
    .filter(p => p.name && p.name.toLowerCase() !== 'archipelago');
}

class Runner {
  constructor(overlayId) {
    this.overlayId = overlayId;
    this.stopped = true;
    this.clients = new Map();
    this.inFlight = new Set();
    this.reconnectTimers = new Map();
    this.attempts = new Map();
    this.tally = new Map();
    this.slotRuntime = new Map();
    this.globalRetryTimer = null;
    this.globalAttempts = 0;
    this.watchdog = null;
    this.port = null;
    this.lastError = null;
    this.startedAt = null;
    this.lastRoomAt = null;
    this.itemFeed = [];
    this.feedSeen = new Map();
    this.feedClient = null;
  }

  config() {
    return getOverlay(this.overlayId);
  }

  visibleSlots() {
    const overlay = this.config();
    return overlay ? (overlay.slots || []).filter(s => s.visible !== false) : [];
  }

  runtime(slot) {
    let rt = this.slotRuntime.get(slot);
    if (!rt) {
      rt = { name: null, game: null, status: 'unknown', online: false, playerOnline: null, team: null, checked: null, total: null, lastCheckAt: null, seed: null, lastConnectAt: null };
      this.slotRuntime.set(slot, rt);
    }
    return rt;
  }

  tallySet(slot) {
    let set = this.tally.get(slot);
    if (!set) {
      set = new Set();
      this.tally.set(slot, set);
    }
    return set;
  }

  async refreshRoom() {
    const overlay = this.config();
    if (!overlay || !overlay.webhost || !overlay.roomId) throw new Error('Room not configured (set WebHost URL and Room ID)');
    const data = await fetchRoomStatus(overlay.webhost, overlay.roomId);
    this.port = data.last_port;
    this.lastRoomAt = Date.now();
    return data;
  }

  wsUrl() {
    const overlay = this.config();
    return wsUrl(overlay.webhost, this.port);
  }

  async start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.startedAt = Date.now();
    this.globalAttempts = 0;
    let initialError = null;
    try {
      await this.refreshRoom();
      await this.connectAll();
    } catch (e) {
      initialError = e;
      this.lastError = e.message || String(e);
    }
    this.startWatchdog();
    if (initialError) this.scheduleGlobalRetry();
  }

  stop() {
    this.stopped = true;
    for (const t of this.reconnectTimers.values()) clearTimeout(t);
    this.reconnectTimers.clear();
    if (this.globalRetryTimer) {
      clearTimeout(this.globalRetryTimer);
      this.globalRetryTimer = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
    for (const client of this.clients.values()) {
      try { client.socket.disconnect(); } catch (e) {}
    }
    this.clients.clear();
    this.inFlight.clear();
    this.tally.clear();
    this.slotRuntime.clear();
    this.itemFeed = [];
    this.feedSeen.clear();
    this.feedClient = null;
    this.port = null;
    this.lastError = null;
  }

  async connectAll() {
    const slots = this.visibleSlots();
    if (!slots.length) throw new Error('No visible slots - Load a room and enable at least one slot');
    const results = await Promise.allSettled(slots.map(entry => this.connectSlot(entry)));
    const failure = results.find(r => r.status === 'rejected');
    if (failure) throw failure.reason;
  }

  async connectSlot(entry) {
    if (this.stopped || this.inFlight.has(entry.slot)) return;
    this.inFlight.add(entry.slot);
    try {
      const overlay = this.config();
      if (!overlay) return;
      const existing = this.clients.get(entry.slot);
      if (existing && existing.authenticated) return;

      const Client = await getClient();
      const rt = this.runtime(entry.slot);
      rt.name = rt.name || entry.name;

      const client = new Client({
        autoFetchDataPackage: false,
        timeout: WS_TIMEOUT,
        maximumMessages: 0
      });

      client.socket.on('disconnected', () => {
        rt.online = false;
        rt.status = 'disconnected';
        if (this.feedClient === client) {
          this.feedClient = null;
          if (!this.stopped) this.ensureFeedClient(null);
        }
        if (this.stopped) return;
        this.scheduleReconnect(entry.slot);
      });

      client.socket.on('connected', () => {
        this.onConnected(client, entry);
      });

      client.socket.on('printJSON', (pkt) => {
        if (this.stopped) return;
        if (pkt.type === 'ItemSend' && pkt.location && pkt.location.location != null && pkt.location.player != null) {
          this.addTally(pkt.location.player, pkt.location.location, false);
        }
      });

      client.messages.on('connected', (_text, player, tags) => {
        if (!player) return;
        if (Array.isArray(tags) && tags.some(t => TRACKER_TAGS.has(t))) return;
        this.runtime(player.slot).playerOnline = true;
      });
      client.messages.on('disconnected', (text, player) => {
        if (!player) return;
        if (typeof text === 'string' && NON_GAME_PART.test(text)) return;
        this.runtime(player.slot).playerOnline = false;
      });
      client.messages.on('goaled', (_text, player) => {
        if (!player) return;
        const goalRt = this.runtime(player.slot);
        goalRt.status = 'goal';
        goalRt.playerOnline = true;
      });

      client.messages.on('itemSent', (_text, item) => {
        if (this.stopped) return;
        if (client !== this.feedClient) return;
        this.captureFeed(item);
      });

      client.room.on('locationsChecked', (checked) => {
        if (this.stopped) return;
        const list = checked || client.room.checkedLocations || [];
        for (const loc of list) this.addTally(entry.slot, loc, true);
      });

      this.clients.set(entry.slot, client);

      try {
        await client.login(this.wsUrl(), entry.name, '', {
          uuid: crypto.randomUUID(),
          password: overlay.password || '',
          tags: ['DevStream', 'Tracker'],
          items: 0,
          slotData: false
        });
        this.attempts.set(entry.slot, 0);
        this.ensureFeedClient(client);
      } catch (e) {
        try { client.socket.disconnect(); } catch (e2) {}
        this.clients.delete(entry.slot);
        rt.online = false;
        this.lastError = `${entry.name}: ${e.message || e}`;
        this.scheduleReconnect(entry.slot);
        throw e;
      }
    } finally {
      this.inFlight.delete(entry.slot);
    }
  }

  onConnected(client, entry) {
    const rt = this.runtime(entry.slot);
    rt.online = true;
    rt.lastConnectAt = Date.now();
    this.lastError = null;

    const seed = client.room.seedName;
    const set = this.tallySet(entry.slot);
    if (rt.seed && seed && rt.seed !== seed) {
      set.clear();
      this.itemFeed = [];
      this.feedSeen.clear();
      rt.status = 'connected';
      rt.playerOnline = null;
    }
    if (seed) rt.seed = seed;
    if (rt.status !== 'goal') rt.status = 'connected';

    const checked = client.room.checkedLocations || [];
    const missing = client.room.missingLocations || [];
    rt.total = checked.length + missing.length;
    for (const loc of checked) set.add(loc);
    rt.checked = set.size;

    try {
      const info = client.players.slots || {};
      for (const [slotKey, meta] of Object.entries(info)) {
        const slotNum = Number(slotKey);
        if (!slotNum) continue;
        const other = this.runtime(slotNum);
        if (meta && meta.name) other.name = meta.name;
        if (meta && meta.game) other.game = meta.game;
      }
    } catch (e) {}

    try {
      const self = client.players.self;
      if (self && self.team != null) rt.team = self.team;
    } catch (e) {}

    if (rt.team != null && !client.__statusWatch) {
      client.__statusWatch = true;
      const key = `_read_client_status_${rt.team}_${entry.slot}`;
      const apply = (value) => {
        if (this.stopped) return;
        if (Number(value) === CLIENT_STATUS_GOAL) {
          const r = this.runtime(entry.slot);
          r.status = 'goal';
          r.playerOnline = true;
        }
      };
      try {
        client.storage.notify([key], (_k, value) => apply(value))
          .then(data => apply(data && data[key]))
          .catch(() => {});
      } catch (e) {}
    }
  }

  addTally(slot, loc, baseline) {
    const rt = this.runtime(slot);
    if (!baseline && rt.total == null) return;
    const set = this.tallySet(slot);
    if (set.has(loc)) return;
    set.add(loc);
    rt.checked = set.size;
    rt.lastCheckAt = Date.now();
  }

  ensureFeedClient(client) {
    const current = this.feedClient;
    if (current && current.authenticated) return;
    let target = client && client.authenticated ? client : null;
    if (!target) {
      for (const c of this.clients.values()) {
        if (c.authenticated) { target = c; break; }
      }
    }
    if (!target) return;
    this.feedClient = target;
    target.package.fetchPackage().catch(() => {});
  }

  captureFeed(item) {
    try {
      const sender = item.sender;
      const receiver = item.receiver;
      const senderName = (sender && sender.name) || '???';
      const receiverName = (receiver && receiver.name) || '???';
      const itemName = item.name || `Item ${item.id}`;
      const key = `${sender ? sender.slot : '?'}:${receiver ? receiver.slot : '?'}:${item.id}:${item.locationId}`;
      const now = Date.now();
      const last = this.feedSeen.get(key);
      if (last && now - last < FEED_DEDUPE_WINDOW) return;
      this.feedSeen.set(key, now);
      if (this.feedSeen.size > 50) {
        for (const [k, t] of this.feedSeen) {
          if (now - t > FEED_PRUNE_AGE) this.feedSeen.delete(k);
        }
      }
      this.itemFeed.unshift({ text: `${senderName} ➜ ${receiverName}: ${itemName}`, sender: senderName, receiver: receiverName, item: itemName, at: now });
      if (this.itemFeed.length > ITEM_FEED_MAX) this.itemFeed.length = ITEM_FEED_MAX;
    } catch (e) {}
  }

  scheduleReconnect(slot) {
    if (this.stopped) return;
    if (this.reconnectTimers.has(slot)) return;
    const overlay = this.config();
    if (!overlay) return;
    const base = Math.max(2, overlay.reconnectDelay || 5) * 1000;
    const n = this.attempts.get(slot) || 0;
    const delay = Math.min(60000, base * Math.pow(2, Math.min(n, 4)));
    this.attempts.set(slot, n + 1);
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(slot);
      if (this.stopped) return;
      const current = (this.config()?.slots || []).find(s => s.slot === slot);
      if (!current || current.visible === false) return;
      if (!this.port) {
        try { await this.refreshRoom(); } catch (e) { this.lastError = e.message; }
      }
      if (this.port) {
        try {
          await this.connectSlot(current);
          return;
        } catch (e) {}
      }
      this.scheduleReconnect(slot);
    }, delay);
    this.reconnectTimers.set(slot, timer);
  }

  scheduleGlobalRetry() {
    if (this.stopped || this.globalRetryTimer) return;
    const base = Math.max(2, this.config()?.reconnectDelay || 5) * 1000;
    const delay = Math.min(60000, base * Math.pow(2, Math.min(this.globalAttempts, 5)));
    this.globalAttempts++;
    this.globalRetryTimer = setTimeout(async () => {
      this.globalRetryTimer = null;
      if (this.stopped) return;
      try {
        await this.refreshRoom();
        await this.connectAll();
        this.globalAttempts = 0;
      } catch (e) {
        this.lastError = e.message || String(e);
        this.scheduleGlobalRetry();
      }
    }, delay);
  }

  startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.watchdog);
        this.watchdog = null;
        return;
      }
      try {
        const visible = this.visibleSlots();
        const visibleIds = new Set(visible.map(s => s.slot));
        for (const [slot, client] of this.clients) {
          if (!visibleIds.has(slot)) {
            try { client.socket.disconnect(); } catch (e) {}
            this.clients.delete(slot);
            this.tally.delete(slot);
            this.slotRuntime.delete(slot);
          }
        }
        for (const entry of visible) {
          const client = this.clients.get(entry.slot);
          const connected = client && client.authenticated;
          if (!connected && !this.reconnectTimers.has(entry.slot) && !this.inFlight.has(entry.slot)) {
            this.scheduleReconnect(entry.slot);
          }
        }
      } catch (e) {
        this.lastError = e.message;
      }
    }, 60000);
  }

  snapshot(overlay) {
    const running = !this.stopped;
    const rows = (overlay.slots || [])
      .filter(s => s.visible !== false)
      .map(s => {
        const rt = this.slotRuntime.get(s.slot);
        const checked = running && rt && rt.checked != null ? rt.checked : null;
        const total = running && rt && rt.total != null ? rt.total : null;
        return {
          slot: s.slot,
          name: s.displayName || (rt && rt.name) || s.name,
          serverName: s.name,
          game: (rt && rt.game) || s.game || null,
          twitchCategoryId: s.twitchCategoryId || null,
          twitchCategoryName: s.twitchCategoryName || null,
          visible: true,
          current: overlay.currentSlot === s.slot,
          checked,
          total,
          pct: checked != null && total ? +((checked / total * 100).toFixed(1)) : null,
          status: running && rt ? rt.status : 'unknown',
          online: running && rt ? !!rt.online : false,
          playerOnline: running && rt ? rt.playerOnline : null,
          lastCheckAt: rt ? rt.lastCheckAt : null
        };
      });

    const allKnown = rows.length > 0 && rows.every(r => r.total != null);
    const checkedSum = rows.reduce((sum, r) => sum + (r.checked || 0), 0);
    const totalSum = allKnown ? rows.reduce((sum, r) => sum + r.total, 0) : null;

    return {
      running,
      lastError: running ? this.lastError : null,
      port: running ? this.port : null,
      lastRoomAt: running ? this.lastRoomAt : null,
      startedAt: running ? this.startedAt : null,
      connectedCount: running ? [...this.clients.values()].filter(c => c.authenticated).length : 0,
      rowCount: rows.length,
      rows,
      items: running ? this.itemFeed.slice() : [],
      header: {
        checked: checkedSum,
        total: totalSum,
        pct: totalSum ? +((checkedSum / totalSum * 100).toFixed(1)) : null
      }
    };
  }
}

const runners = new Map();

function isRunning(id) {
  const runner = runners.get(id);
  return !!runner && !runner.stopped;
}

async function startFor(overlay) {
  let runner = runners.get(overlay.id);
  if (runner) {
    if (!runner.stopped) return runner;
    runner.stop();
  }
  runner = new Runner(overlay.id);
  runners.set(overlay.id, runner);
  await runner.start();
  return runner;
}

function stopFor(id) {
  const runner = runners.get(id);
  if (runner) {
    runner.stop();
    runners.delete(id);
  }
}

async function restart(overlay) {
  stopFor(overlay.id);
  return startFor(overlay);
}

function getStatus(overlay) {
  const runner = runners.get(overlay.id);
  if (runner && !runner.stopped) return runner.snapshot(overlay);
  const rows = (overlay.slots || [])
    .filter(s => s.visible !== false)
    .map(s => ({
      slot: s.slot,
      name: s.displayName || s.name,
      serverName: s.name,
      game: s.game || null,
      twitchCategoryId: s.twitchCategoryId || null,
      twitchCategoryName: s.twitchCategoryName || null,
      visible: true,
      current: overlay.currentSlot === s.slot,
      checked: null,
      total: null,
      pct: null,
      status: 'unknown',
      online: false,
      playerOnline: null,
      lastCheckAt: null
    }));
  return {
    running: false,
    lastError: null,
    port: null,
    lastRoomAt: null,
    startedAt: null,
    connectedCount: 0,
    rowCount: rows.length,
    rows,
    items: [],
    header: { checked: 0, total: null, pct: null }
  };
}

async function autoStart() {
  const overlays = getOverlays().filter(o => o.isActive);
  for (const overlay of overlays) {
    startFor(overlay).catch(e => {
      console.error(`Archipelago tracker auto-start failed for "${overlay.name}": ${e.message}`);
    });
  }
}

module.exports = {
  fetchRoomStatus,
  parsePlayers,
  isRunning,
  startFor,
  stopFor,
  restart,
  getStatus,
  autoStart
};
