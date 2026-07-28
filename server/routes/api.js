const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { load, save } = require('../store');

router.post('/text/create', (req, res) => {
  const overlays = load('text-overlays');
  const newOverlay = {
    id: uuidv4(),
    name: req.body.name || 'Untitled',
    text: req.body.text || 'Hello World',
    duration: req.body.duration || 30,
    fontSize: req.body.fontSize || 48,
    fontColor: req.body.fontColor || '#ffffff',
    backgroundColor: req.body.backgroundColor || 'transparent',
    position: req.body.position || { x: 100, y: 100 },
    showTimer: req.body.showTimer !== false,
    font: req.body.font || 'Arial',
    textAlign: req.body.textAlign || 'center',
    outlineColor: req.body.outlineColor || '#000000',
    outlineEnabled: req.body.outlineEnabled || false,
    outlineWidth: req.body.outlineWidth || 2,
    customCSS: req.body.customCSS || '',
    isActive: false,
    startedAt: null
  };
  overlays.push(newOverlay);
  save('text-overlays', overlays);
  res.json(newOverlay);
});

router.put('/text/:id', (req, res) => {
  const overlays = load('text-overlays');
  const index = overlays.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  overlays[index] = { ...overlays[index], ...req.body, id: req.params.id };
  save('text-overlays', overlays);
  res.json(overlays[index]);
});

router.delete('/text/:id', (req, res) => {
  let overlays = load('text-overlays');
  overlays = overlays.filter(o => o.id !== req.params.id);
  save('text-overlays', overlays);
  res.json({ success: true });
});

router.post('/text/:id/start', (req, res) => {
  const overlays = load('text-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = true;
  overlay.startedAt = Date.now();
  save('text-overlays', overlays);
  res.json(overlay);
});

router.post('/text/:id/stop', (req, res) => {
  const overlays = load('text-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = false;
  overlay.startedAt = null;
  save('text-overlays', overlays);
  res.json(overlay);
});

router.get('/text/:id/state', (req, res) => {
  const overlays = load('text-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

router.get('/text', (req, res) => {
  const overlays = load('text-overlays');
  res.json(overlays);
});

router.get('/text/:id', (req, res) => {
  const overlays = load('text-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

module.exports = router;
