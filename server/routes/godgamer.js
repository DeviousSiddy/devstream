require('dotenv').config();
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { load, save } = require('../store');

const TGDB_API_KEY = process.env.TGDB_API_KEY;
const TGDB_BASE = 'https://api.thegamesdb.net/v1';

// Helper to get image URL from TGDB
function getBoxartUrl(image) {
  if (!image) return null;
  if (image.filename) return `https://cdn.thegamesdb.net/images/medium/${image.filename}`;
  return null;
}

// Search games via TGDB
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const url = `${TGDB_BASE}/Games/ByGameName?apikey=${TGDB_API_KEY}&name=${encodeURIComponent(q)}&include=boxart`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || !data.data.games) {
      return res.json([]);
    }

    const games = data.data.games.map(g => {
      // Boxart is in include.boxart.data[gameId]
      let boxartUrl = null;
      if (data.include && data.include.boxart && data.include.boxart.data) {
        const gameBoxart = data.include.boxart.data[g.id];
        if (gameBoxart && gameBoxart.length > 0) {
          const baseUrl = data.include.boxart.base_url?.medium || 'https://cdn.thegamesdb.net/images/medium/';
          boxartUrl = baseUrl + gameBoxart[0].filename;
        }
      }
      
      // Platform ID to name mapping
      const platforms = {
        1: 'PC', 3: 'Xbox', 4: 'Mac', 5: 'Mac', 6: 'Commodore 64',
        7: 'Amiga', 8: 'Atari ST', 9: 'Amstrad CPC', 11: 'ZX Spectrum',
        12: 'MSX', 13: 'ColecoVision', 14: 'Intellivision', 15: 'Vectrex',
        16: 'Magnavox Odyssey', 17: 'Nintendo GameBoy', 18: 'Nintendo NES',
        19: 'Nintendo SNES', 20: 'Nintendo 64', 21: 'GameCube', 22: 'Nintendo DS',
        23: 'Nintendo Wii', 24: 'Nintendo Wii U', 25: 'Nintendo Switch',
        26: 'Nintendo 3DS', 27: 'Game Boy Advance', 28: 'Nintendo GameBoy Color',
        29: 'Xbox 360', 30: 'Xbox', 31: 'Xbox One', 32: 'Xbox Series',
        33: 'PlayStation', 34: 'PlayStation 2', 35: 'PlayStation 3',
        36: 'PlayStation 4', 37: 'PlayStation 5', 38: 'PSP',
        39: 'PS Vita', 41: 'GameGear', 42: 'Neo Geo', 43: 'TurboGrafx-16',
        44: 'Sega Master System', 45: 'Sega Genesis', 46: 'Sega CD',
        47: 'Sega 32X', 48: 'Sega Saturn', 49: 'Sega Dreamcast',
        50: 'Sega Game Gear', 51: 'Sega Game Gear',
        4915: 'Linux', 4916: 'Android', 4917: 'iOS',
        4918: 'Windows Phone', 4919: 'PlayStation Network',
        4920: 'Xbox Live Arcade', 4921: 'Virtual Console',
        4922: 'Steam', 4923: 'GOG', 4924: 'Epic Games Store',
        4971: 'Xbox One', 4972: 'PlayStation 4'
      };

      return {
        tgdbId: g.id,
        name: g.game_title,
        platform: platforms[g.platform] || `Platform ${g.platform}`,
        boxartUrl: boxartUrl
      };
    });

    res.json(games);
  } catch (err) {
    console.error('TGDB search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get game details from TGDB
router.get('/game/:tgdbId', async (req, res) => {
  try {
    const url = `${TGDB_BASE}/Games/ByGameID?apikey=${TGDB_API_KEY}&id=${req.params.tgdbId}&include=boxart`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || !data.data.games || data.data.games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const g = data.data.games[0];
    
    // Extract boxart from include
    let boxartUrl = null;
    if (data.include && data.include.boxart && data.include.boxart.data) {
      const gameBoxart = data.include.boxart.data[g.id];
      if (gameBoxart && gameBoxart.length > 0) {
        const baseUrl = data.include.boxart.base_url?.medium || 'https://cdn.thegamesdb.net/images/medium/';
        boxartUrl = baseUrl + gameBoxart[0].filename;
      }
    }

    // Platform mapping
    const platforms = {
      1: 'PC', 3: 'Xbox', 4: 'Mac', 5: 'Mac', 6: 'Commodore 64',
      7: 'Amiga', 8: 'Atari ST', 9: 'Amstrad CPC', 11: 'ZX Spectrum',
      12: 'MSX', 13: 'ColecoVision', 14: 'Intellivision', 15: 'Vectrex',
      16: 'Magnavox Odyssey', 17: 'Nintendo GameBoy', 18: 'Nintendo NES',
      19: 'Nintendo SNES', 20: 'Nintendo 64', 21: 'GameCube', 22: 'Nintendo DS',
      23: 'Nintendo Wii', 24: 'Nintendo Wii U', 25: 'Nintendo Switch',
      26: 'Nintendo 3DS', 27: 'Game Boy Advance', 28: 'Nintendo GameBoy Color',
      29: 'Xbox 360', 30: 'Xbox', 31: 'Xbox One', 32: 'Xbox Series',
      33: 'PlayStation', 34: 'PlayStation 2', 35: 'PlayStation 3',
      36: 'PlayStation 4', 37: 'PlayStation 5', 38: 'PSP',
      39: 'PS Vita', 41: 'GameGear', 42: 'Neo Geo', 43: 'TurboGrafx-16',
      44: 'Sega Master System', 45: 'Sega Genesis', 46: 'Sega CD',
      47: 'Sega 32X', 48: 'Sega Saturn', 49: 'Sega Dreamcast',
      50: 'Sega Game Gear', 51: 'Sega Game Gear',
      4915: 'Linux', 4916: 'Android', 4917: 'iOS',
      4918: 'Windows Phone', 4919: 'PlayStation Network',
      4920: 'Xbox Live Arcade', 4921: 'Virtual Console',
      4922: 'Steam', 4923: 'GOG', 4924: 'Epic Games Store',
      4971: 'Xbox One', 4972: 'PlayStation 4'
    };

    const game = {
      tgdbId: g.id,
      name: g.game_title,
      platform: platforms[g.platform] || `Platform ${g.platform}`,
      steamId: g.steam_id || null,
      boxartUrl: boxartUrl,
      overview: g.overview
    };

    res.json(game);
  } catch (err) {
    console.error('TGDB game error:', err.message);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// --- Sessions ---

// Create session
router.post('/sessions', (req, res) => {
  const sessions = load('godgamer-sessions');
  const players = load('godgamer-players');

  // Handle player names
  const playerNames = (req.body.players && req.body.players.length > 0)
    ? req.body.players
    : ['devioussiddy'];

  const playerIds = playerNames.map(name => {
    const existing = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    const newPlayer = {
      id: uuidv4(),
      name: name,
      createdAt: Date.now()
    };
    players.push(newPlayer);
    return newPlayer.id;
  });

  save('godgamer-players', players);

  const session = {
    id: uuidv4(),
    playerIds,
    playerNames,
    cap: req.body.cap || 10,
    games: [],
    currentGameIndex: 0,
    isActive: false,
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),

    // Overlay settings
    name: req.body.name || 'God Gamer Session',
    fontSize: req.body.fontSize || 32,
    fontColor: req.body.fontColor || '#ffffff',
    font: req.body.font || 'Arial',
    backgroundColor: req.body.backgroundColor || 'transparent',
    position: req.body.position || { x: 100, y: 100 },
    opacity: req.body.opacity ?? 1,
    outlineEnabled: req.body.outlineEnabled || false,
    outlineColor: req.body.outlineColor || '#000000',
    outlineWidth: req.body.outlineWidth || 2,
    iconSize: req.body.iconSize || 32,
    customCSS: req.body.customCSS || ''
  };

  sessions.push(session);
  save('godgamer-sessions', sessions);
  res.json(session);
});

// Update session settings
router.put('/sessions/:id', (req, res) => {
  const sessions = load('godgamer-sessions');
  const index = sessions.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Session not found' });

  sessions[index] = { ...sessions[index], ...req.body, id: req.params.id };
  save('godgamer-sessions', sessions);
  res.json(sessions[index]);
});

// Delete session
router.delete('/sessions/:id', (req, res) => {
  let sessions = load('godgamer-sessions');
  sessions = sessions.filter(s => s.id !== req.params.id);
  save('godgamer-sessions', sessions);
  res.json({ success: true });
});

// Get all sessions
router.get('/sessions', (req, res) => {
  const sessions = load('godgamer-sessions');
  res.json(sessions);
});

// Get single session
router.get('/sessions/:id', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// Start session timer
router.post('/sessions/:id/start', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.isActive = true;
  session.startedAt = Date.now();
  save('godgamer-sessions', sessions);
  res.json(session);
});

// Stop session
router.post('/sessions/:id/stop', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.isActive = false;
  session.endedAt = Date.now();
  save('godgamer-sessions', sessions);
  res.json(session);
});

// Add game to session
router.post('/sessions/:id/games', (req, res) => {
  const sessions = load('godgamer-sessions');
  const games = load('godgamer-games');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { tgdbId, name, platform, steamId, boxartUrl } = req.body;

  // Save/update game in database
  const existingGame = games.find(g => g.tgdbId === tgdbId || (steamId && g.steamId === steamId));
  if (existingGame) {
    if (steamId && !existingGame.steamId) existingGame.steamId = steamId;
    if (boxartUrl && !existingGame.boxartUrl) existingGame.boxartUrl = boxartUrl;
    save('godgamer-games', games);
  } else {
    const newGame = {
      id: uuidv4(),
      tgdbId,
      steamId: steamId || null,
      name,
      platform,
      boxartUrl: boxartUrl || null,
      playCount: 0,
      createdAt: Date.now()
    };
    games.push(newGame);
    save('godgamer-games', games);
  }

  const gameEntry = {
    id: uuidv4(),
    tgdbId,
    name,
    platform,
    steamId: steamId || null,
    boxartUrl: boxartUrl || null,
    result: null,
    startedAt: null,
    endedAt: null,
    duration: null
  };

  session.games.push(gameEntry);
  save('godgamer-sessions', sessions);
  res.json(session);
});

// Remove game from session
router.delete('/sessions/:id/games/:gameId', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.games = session.games.filter(g => g.id !== req.params.gameId);
  if (session.currentGameIndex >= session.games.length) {
    session.currentGameIndex = Math.max(0, session.games.length - 1);
  }
  save('godgamer-sessions', sessions);
  res.json(session);
});

// Start current game
router.post('/sessions/:id/games/current/start', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const game = session.games[session.currentGameIndex];
  if (!game) return res.status(400).json({ error: 'No current game' });

  game.startedAt = Date.now();
  save('godgamer-sessions', sessions);
  res.json(session);
});

// End current game (win/loss)
router.post('/sessions/:id/games/current/end', (req, res) => {
  const sessions = load('godgamer-sessions');
  const games = load('godgamer-games');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const game = session.games[session.currentGameIndex];
  if (!game) return res.status(400).json({ error: 'No current game' });

  game.endedAt = Date.now();
  game.result = req.body.result || 'win'; // 'win' or 'loss'
  if (game.startedAt) {
    game.duration = Math.floor((game.endedAt - game.startedAt) / 1000);
  }

  // Update game play count in database
  const dbGame = games.find(g => g.tgdbId === game.tgdbId || (game.steamId && g.steamId === game.steamId));
  if (dbGame) {
    dbGame.playCount = (dbGame.playCount || 0) + 1;
    save('godgamer-games', games);
  }

  // Move to next game if not at cap
  if (session.currentGameIndex < session.games.length - 1 && session.currentGameIndex < session.cap - 1) {
    session.currentGameIndex++;
  }

  save('godgamer-sessions', sessions);
  res.json(session);
});

// Get session state
router.get('/sessions/:id/state', (req, res) => {
  const sessions = load('godgamer-sessions');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// --- Players ---

router.get('/players', (req, res) => {
  const players = load('godgamer-players');
  res.json(players);
});

router.post('/players', (req, res) => {
  const players = load('godgamer-players');
  const existing = players.find(p => p.name.toLowerCase() === req.body.name.toLowerCase());
  if (existing) return res.json(existing);

  const player = {
    id: uuidv4(),
    name: req.body.name,
    createdAt: Date.now()
  };
  players.push(player);
  save('godgamer-players', players);
  res.json(player);
});

router.delete('/players/:id', (req, res) => {
  let players = load('godgamer-players');
  players = players.filter(p => p.id !== req.params.id);
  save('godgamer-players', players);
  res.json({ success: true });
});

// --- Game Database ---

router.get('/games', (req, res) => {
  const games = load('godgamer-games');
  res.json(games);
});

router.delete('/games/:id', (req, res) => {
  let games = load('godgamer-games');
  games = games.filter(g => g.id !== req.params.id);
  save('godgamer-games', games);
  res.json({ success: true });
});

module.exports = router;
