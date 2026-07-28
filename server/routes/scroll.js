const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { load, save } = require('../store');

router.post('/create', (req, res) => {
  const overlays = load('scroll-overlays');
  const newOverlay = {
    id: uuidv4(),
    name: req.body.name || 'Untitled Scroll',
    lines: req.body.lines || ['Line 1', 'Line 2'],
    fontSize: req.body.fontSize || 36,
    fontColor: req.body.fontColor || '#ffffff',
    font: req.body.font || 'Arial',
    backgroundColor: req.body.backgroundColor || 'transparent',
    scrollSpeed: req.body.scrollSpeed || 2,
    separator: req.body.separator || ' • ',
    containerHeight: req.body.containerHeight || 50,
    position: req.body.position || { x: 0, y: 0 },
    textAlign: req.body.textAlign || 'left',
    outlineEnabled: req.body.outlineEnabled || false,
    outlineColor: req.body.outlineColor || '#000000',
    outlineWidth: req.body.outlineWidth || 2,
    opacity: req.body.opacity ?? 1,
    customCSS: req.body.customCSS || '',
    randomizeLines: req.body.randomizeLines || false,
    isActive: false,
    startedAt: null
  };
  overlays.push(newOverlay);
  save('scroll-overlays', overlays);
  res.json(newOverlay);
});

router.put('/:id', (req, res) => {
  const overlays = load('scroll-overlays');
  const index = overlays.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  overlays[index] = { ...overlays[index], ...req.body, id: req.params.id };
  save('scroll-overlays', overlays);
  res.json(overlays[index]);
});

router.delete('/:id', (req, res) => {
  let overlays = load('scroll-overlays');
  overlays = overlays.filter(o => o.id !== req.params.id);
  save('scroll-overlays', overlays);
  res.json({ success: true });
});

router.post('/:id/start', (req, res) => {
  const overlays = load('scroll-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = true;
  overlay.startedAt = Date.now();
  save('scroll-overlays', overlays);
  res.json(overlay);
});

router.post('/:id/stop', (req, res) => {
  const overlays = load('scroll-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  overlay.isActive = false;
  overlay.startedAt = null;
  save('scroll-overlays', overlays);
  res.json(overlay);
});

router.get('/:id/state', (req, res) => {
  const overlays = load('scroll-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

router.get('/', (req, res) => {
  const overlays = load('scroll-overlays');
  res.json(overlays);
});

router.get('/:id', (req, res) => {
  const overlays = load('scroll-overlays');
  const overlay = overlays.find(o => o.id === req.params.id);
  if (!overlay) return res.status(404).json({ error: 'Not found' });
  res.json(overlay);
});

module.exports = router;
