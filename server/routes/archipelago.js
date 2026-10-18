require('dotenv').config();
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { load, save } = require('../store');
const twitch = require('../twitch');
const tracker = require('../tracker');

const STORE = 'archipelago-overlays';
const GAMES = 'archipelago-games';

function getOverlays() {
  return load(STORE);
}

function getOverlay(id) {
  return getOverlays().find(o => o.id === id);
}

function sourceSignature(overlay) {
  return JSON.stringify({
    webhost: overlay.webhost,
    roomId: overlay.roomId,
    password: overlay.password,
    reconnectDelay: overlay.reconnectDelay,
    slots: (overlay.slots || []).filter(s => s.visible !== false).map(s => ({ slot: s.slot, name: s.name }))
  });
}

function defaultOverlay(body) {
  return {
    id: uuidv4(),
    name: body.name || 'Archipelago Tracker',
    isActive: false,
    webhost: body.webhost || 'http://127.0.0.1:38080',
    roomId: body.roomId || '',
    password: body.password || '',
    reconnectDelay: body.reconnectDelay || 5,
    slots: [],
    currentSlot: null,

    showHeader: body.showHeader !== false,
    showNumber: body.showNumber !== false,
    showGame: body.showGame !== false,
    showChecks: body.showChecks !== false,
    showPercent: body.showPercent !== false,
    showStatus: body.showStatus !== false,
    showPlayer: body.showPlayer !== false,
    showItemFeed: body.showItemFeed !== false,
    highlightCurrent: body.highlightCurrent !== false,

    twitchSync: body.twitchSync !== false,

    fontSize: body.fontSize || 28,
    fontColor: body.fontColor || '#ffffff',
    font: body.font || 'Arial',
    backgroundColor: body.backgroundColor || 'transparent',
    opacity: body.opacity ?? 1,
    position: body.position || { x: 100, y: 100 },
    outlineEnabled: body.outlineEnabled || false,
    outlineColor: body.outlineColor || '#000000',
    outlineWidth: body.outlineWidth || 2,
    rowGap: body.rowGap ?? 8,
    customCSS: body.customCSS || '',

    createdAt: Date.now()
  };
}

function cacheCategory(gameName, id, name) {
  if (!gameName || !id) return;
  const games = load(GAMES);
  const target = games.find(g => g.name && g.name.toLowerCase() === gameName.toLowerCase());
  if (target) {
    target.twitchCategoryId = id;
    target.twitchCategoryName = name;
  } else {
    games.push({ name: gameName, twitchCategoryId: id, twitchCategoryName: name });
  }
  save(GAMES, games);
}

async function applyOverlayCategory(overlay) {
  const row = (overlay.slots || []).find(s => s.slot === overlay.currentSlot);
  if (!row) return null;
  let id = row.twitchCategoryId || null;
  let name = row.twitchCategoryName || null;
  if (!id) {
    const gameName = row.game || row.name;
    if (!gameName) return null;
    const games = load(GAMES);
    const cached = games.find(g => g.name && g.name.toLowerCase() === gameName.toLowerCase() && g.twitchCategoryId);
    if (cached) {
      id = cached.twitchCategoryId;
      name = cached.twitchCategoryName;
    } else {
      const resolved = await twitch.resolveCategory(gameName);
      id = resolved.id;
      name = resolved.name;
      cacheCategory(gameName, id, name);
    }
    row.twitchCategoryId = id;
    row.twitchCategoryName = name;
    save(STORE, getOverlays());
  }
  if (!twitch.isConfigured()) return { categoryId: id, categoryName: name, skipped: true };
  const applied = await twitch.setChannelCategory(id);
  return { categoryId: id, categoryName: name, broadcasterId: applied.broadcasterId };
}

async function autoTwitch(overlay) {
  if (!overlay.twitchSync || !overlay.currentSlot) return null;
  try {
    return await applyOverlayCategory(overlay);
  } catch (e) {
    return { error: e.message };
  }
}

router.get('/twitch/status', async (req, res) => {
  const configured = twitch.isConfigured();
  let broadcaster = null;
  let error = null;
  if (configured) {
    try {
      const b = await twitch.getBroadcaster();
      broadcaster = { id: b.id, login: b.login, displayName: b.display_name || b.login };
    } catch (e) {
      error = e.message;
    }
  }
  res.json({ configured, broadcaster, error });
});

router.post('/twitch/search', async (req, res) => {
  try {
    const { q } = req.body;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await twitch.searchCategories(q);
    res.json(results.map(c => ({
      id: c.id,
      name: c.name,
      boxartUrl: (c.box_art_url || '').replace('{width}x{height}', '60x80') || null
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/twitch/apply', async (req, res) => {
  try {
    const { overlayId, slot, name } = req.body;
    if (overlayId && slot != null) {
      const overlays = getOverlays();
      const overlay = overlays.find(o => o.id === overlayId);
      if (!overlay) return res.status(404).json({ error: 'Overlay not found' });
      const row = (overlay.slots || []).find(s => s.slot === Number(slot));
      if (!row) return res.status(404).json({ error: 'Slot not found' });
      const gameName = row.game || row.name;
      if (!gameName) return res.status(400).json({ error: 'No game name for this slot' });
      const resolved = await twitch.resolveCategory(gameName);
      row.twitchCategoryId = resolved.id;
      row.twitchCategoryName = resolved.name;
      save(STORE, overlays);
      cacheCategory(gameName, resolved.id, resolved.name);
      const applied = twitch.isConfigured() ? await twitch.setChannelCategory(resolved.id) : null;
      return res.json({ categoryId: resolved.id, categoryName: resolved.name, broadcasterId: applied ? applied.broadcasterId : null });
    }
    const gameName = name;
    if (!gameName) return res.status(400).json({ error: 'Game name required' });
    const resolved = await twitch.resolveCategory(gameName);
    cacheCategory(gameName, resolved.id, resolved.name);
    const applied = twitch.isConfigured() ? await twitch.setChannelCategory(resolved.id) : null;
    res.json({ categoryId: resolved.id, categoryName: resolved.name, broadcasterId: applied ? applied.broadcasterId : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/overlays', (req, res) => {
  const overlays = getOverlays();
  const overlay = defaultOverlay(req.body);
  overlays.push(overlay);
  save(STORE, overlays);
  res.json(overlay);
});

router.get('/overlays', (req, res) => {
  res.json(getOverlays());
});

router.get('/overlays/:id', (req, res) => {
  const overlay = getOverlay(req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' });
  res.json(overlay);
});

router.put('/overlays/:id', async (req, res) => {
  try {
    const overlays = getOverlays();
    const index = overlays.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Overlay not found' });

    const before = overlays[index];
    const merged = { ...before, ...req.body, id: req.params.id };
    if (merged.slots && typeof merged.slots === 'object') {
      merged.slots = merged.slots.map(s => ({ ...s, slot: Number(s.slot) }));
    }
    overlays[index] = merged;
    save(STORE, overlays);

    const wasRunning = tracker.isRunning(merged.id);
    const needsRestart = wasRunning && sourceSignature(before) !== sourceSignature(merged);
    if (needsRestart) {
      await tracker.restart(merged).catch(e => console.error(`Archipelago tracker restart failed: ${e.message}`));
    }

    let twitchResult = null;
    if (merged.currentSlot !== before.currentSlot || req.body.twitchSync !== undefined) {
      if (merged.isActive || wasRunning) twitchResult = await autoTwitch(merged);
    }
    res.json({ ...merged, twitchResult, restarted: needsRestart });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/overlays/:id', (req, res) => {
  tracker.stopFor(req.params.id);
  let overlays = getOverlays();
  overlays = overlays.filter(o => o.id !== req.params.id);
  save(STORE, overlays);
  res.json({ success: true });
});

router.post('/overlays/:id/start', async (req, res) => {
  try {
    const overlays = getOverlays();
    const overlay = overlays.find(o => o.id === req.params.id);
    if (!overlay) return res.status(404).json({ error: 'Overlay not found' });
    overlay.isActive = true;
    save(STORE, overlays);
    await tracker.startFor(overlay);
    const twitchResult = await autoTwitch(overlay);
    res.json({ ...overlay, twitchResult, status: tracker.getStatus(overlay) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/overlays/:id/stop', (req, res) => {
  const overlays = getOverlays();
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' });
  overlay.isActive = false;
  save(STORE, overlays);
  tracker.stopFor(overlay.id);
  res.json(overlay);
});

router.post('/overlays/:id/duplicate', (req, res) => {
  const overlays = getOverlays();
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' });

  const names = overlays.map(o => o.name);
  const base = overlay.name.replace(/\s*\(\d+\)$/, '').trim();
  let maxNum = 1;
  names.forEach(n => {
    const match = n.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' (\\d+)$'));
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
  });

  const copy = {
    ...overlay,
    id: uuidv4(),
    name: base + ' ' + (maxNum + 1),
    isActive: false,
    slots: (overlay.slots || []).map(s => ({ ...s })),
    createdAt: Date.now()
  };
  overlays.push(copy);
  save(STORE, overlays);
  res.json(copy);
});

router.post('/overlays/:id/room/load', async (req, res) => {
  try {
    const overlays = getOverlays();
    const index = overlays.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Overlay not found' });

    const overlay = overlays[index];
    if (req.body.webhost) overlay.webhost = String(req.body.webhost).trim();
    if (req.body.roomId != null) overlay.roomId = String(req.body.roomId).trim();
    if (req.body.password !== undefined) overlay.password = req.body.password;

    if (!overlay.webhost || !overlay.roomId) {
      return res.status(400).json({ error: 'WebHost URL and Room ID required' });
    }

    const status = await tracker.fetchRoomStatus(overlay.webhost, overlay.roomId);
    const players = tracker.parsePlayers(status);

    if (!players.length) {
      return res.status(400).json({ error: 'No players found in room status (is the room running?)' });
    }

    const previous = overlay.slots || [];
    overlay.slots = players.map(p => {
      const old = previous.find(s => s.slot === p.slot);
      return {
        slot: p.slot,
        name: p.name,
        displayName: old ? old.displayName : null,
        game: p.game || (old ? old.game : null),
        visible: old ? old.visible !== false : true,
        twitchCategoryId: old ? old.twitchCategoryId : null,
        twitchCategoryName: old ? old.twitchCategoryName : null
      };
    });
    if (overlay.currentSlot != null && !overlay.slots.some(s => s.slot === overlay.currentSlot)) {
      overlay.currentSlot = null;
    }

    overlays[index] = overlay;
    save(STORE, overlays);

    if (tracker.isRunning(overlay.id)) {
      await tracker.restart(overlay).catch(e => console.error(`Archipelago tracker restart failed: ${e.message}`));
    }

    res.json({ overlay, players, lastPort: status.last_port });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/overlays/:id/status', (req, res) => {
  const overlay = getOverlay(req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' });
  res.json(tracker.getStatus(overlay));
});

module.exports = router;
