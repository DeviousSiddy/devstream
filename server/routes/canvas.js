const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { load, save } = require('../store');

const SOURCE_DIR = process.env.CANVAS_SOURCE_DIR || path.join(__dirname, '..', '..', 'canvas-source');

let Docker = null;
let dockerClient = null;
try {
  Docker = require('dockerode');
  dockerClient = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
} catch (e) {
  dockerClient = null;
}
const BOT_CONTAINER = process.env.BOT_CONTAINER_NAME || 'pixel-canvas-bot';

function botContainer() {
  return dockerClient ? dockerClient.getContainer(BOT_CONTAINER) : null;
}

async function getBotStatus() {
  if (!dockerClient) return { available: false, running: false, error: 'Docker socket unavailable' };
  const container = botContainer();
  try {
    const info = await container.inspect();
    return { available: true, running: !!(info.State && info.State.Running), error: null };
  } catch (e) {
    if (e && e.statusCode === 404) {
      return { available: false, running: false, error: 'Bot container not found (' + BOT_CONTAINER + ')' };
    }
    return { available: true, running: false, error: e.message };
  }
}

router.get('/bot/status', async (req, res) => {
  res.json(await getBotStatus());
});

router.post('/bot/start', async (req, res) => {
  const status = await getBotStatus();
  if (!status.available) return res.status(409).json(status);
  if (status.running) return res.json({ running: true });
  try {
    await botContainer().start();
    res.json({ running: true });
  } catch (e) {
    res.status(500).json({ running: false, error: e.message });
  }
});

router.post('/bot/stop', async (req, res) => {
  const status = await getBotStatus();
  if (!status.available) return res.status(409).json(status);
  if (!status.running) return res.json({ running: false });
  try {
    await botContainer().stop();
    res.json({ running: false });
  } catch (e) {
    res.status(500).json({ running: false, error: e.message });
  }
});

function getNextIterationName(baseName, existingNames) {
  const base = baseName.replace(/\s*\(\d+\)$/, '').replace(/\s+\d+$/, '').trim();
  let maxNum = 1;
  existingNames.forEach(name => {
    const match = name.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' (\\d+)$'));
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
  });
  return base + ' ' + (maxNum + 1);
}

function resolveSourceFile(filename) {
  const resolved = path.resolve(SOURCE_DIR, filename || '');
  const root = path.resolve(SOURCE_DIR);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  return resolved;
}

function readSourceFile(filename) {
  const filePath = resolveSourceFile(filename);
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function buildPalette(paletteData) {
  const palette = {};
  for (const key in paletteData) {
    palette[parseInt(key)] = paletteData[key].hex;
  }
  return palette;
}

router.post('/create', (req, res) => {
  const overlays = load('canvas-overlays');
  const newOverlay = {
    id: uuidv4(),
    name: req.body.name || 'Untitled Canvas',
    stateFile: req.body.stateFile || 'canvas_state.json',
    paletteFile: req.body.paletteFile || 'pallette.json',
    gridWidth: req.body.gridWidth || 32,
    gridHeight: req.body.gridHeight || 32,
    displaySize: req.body.displaySize || 300,
    position: req.body.position || { x: 1600, y: 300 },
    enlargedPosition: req.body.enlargedPosition || { x: 500, y: 50 },
    enlargedSize: req.body.enlargedSize || 900,
    opacity: req.body.opacity ?? 0.5,
    showTitle: req.body.showTitle || false,
    titleText: req.body.titleText || 'Mini Pixel Canvas',
    showInstruction: req.body.showInstruction !== false,
    instructionText: req.body.instructionText || 'Mini Pixel Canvas 32x32\n!pixel x,y,## (5 sec cooldown)\n## = 2 digits (00-63) for color',
    enlargeOnClick: req.body.enlargeOnClick !== false,
    youtubeChatLink: req.body.youtubeChatLink || '',
    customCSS: req.body.customCSS || '',
    isActive: false,
    startedAt: null
  };
  overlays.push(newOverlay);
  save('canvas-overlays', overlays);
  res.json(newOverlay);
});

router.get('/preview/pixels', (req, res) => {
  const data = readSourceFile(req.query.file || 'canvas_state.json');
  if (!data) return res.status(404).json({ error: 'Canvas state not found' });
  res.json(data);
});

router.get('/preview/palette', (req, res) => {
  const data = readSourceFile(req.query.file || 'pallette.json');
  if (!data) return res.status(404).json({ error: 'Palette not found' });
  res.json(buildPalette(data));
});

router.put('/:id', (req, res) => {
  const overlays = load('canvas-overlays');
  const index = overlays.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  overlays[index] = { ...overlays[index], ...req.body, id: req.params.id };
  save('canvas-overlays', overlays);
  res.json(overlays[index]);
});

router.delete('/:id', (req, res) => {
  let overlays = load('canvas-overlays');
  overlays = overlays.filter(o => o.id !== req.params.id);
  save('canvas-overlays', overlays);
  res.json({ success: true });
});

router.post('/:id/start', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = true;
  overlay.startedAt = Date.now();
  save('canvas-overlays', overlays);
  res.json(overlay);
});

router.post('/:id/stop', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = false;
  overlay.startedAt = null;
  save('canvas-overlays', overlays);
  res.json(overlay);
});

router.get('/:id/state', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

router.get('/:id/pixels', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  const data = readSourceFile(overlay.stateFile);
  if (!data) return res.status(404).json({ error: 'Canvas state not found' });
  res.json(data);
});

router.get('/:id/palette', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  const data = readSourceFile(overlay.paletteFile);
  if (!data) return res.status(404).json({ error: 'Palette not found' });
  res.json(buildPalette(data));
});

router.get('/', (req, res) => {
  const overlays = load('canvas-overlays');
  res.json(overlays);
});

router.get('/:id', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

router.post('/:id/duplicate', (req, res) => {
  const overlays = load('canvas-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });

  const newOverlay = {
    ...overlay,
    id: uuidv4(),
    name: getNextIterationName(overlay.name, overlays.map(o => o.name)),
    isActive: false,
    startedAt: null
  };
  overlays.push(newOverlay);
  save('canvas-overlays', overlays);
  res.json(newOverlay);
});

module.exports = router;
