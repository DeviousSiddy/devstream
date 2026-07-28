const express = require('express');
const router = express.Router();
const { load } = require('../store');

function renderOverlays() {
  const textOverlays = load('text-overlays');
  const activeOverlays = textOverlays.filter(o => o.isActive);

  return activeOverlays.map(overlay => {
    let timerOutlineStyle = '';
    if (overlay.outlineEnabled) {
      const w = overlay.outlineWidth || 2;
      const c = overlay.outlineColor || '#000000';
      timerOutlineStyle = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
    }

    const timerHtml = overlay.showTimer
      ? `<div class="timer" style="color:${overlay.fontColor || '#ffffff'}; font-size:${overlay.fontSize}px; font-family:${overlay.font}; ${timerOutlineStyle}" data-duration="${overlay.duration}" data-started="${overlay.startedAt || ''}"></div>`
      : '';

    let outlineStyle = '';
    if (overlay.outlineEnabled) {
      const w = overlay.outlineWidth || 2;
      const c = overlay.outlineColor || '#000000';
      outlineStyle = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
    }

    return `
      <div class="overlay" id="overlay-${overlay.id}"
        style="left:${overlay.position.x}px; top:${overlay.position.y}px; text-align:${overlay.textAlign || 'center'};">
        <div class="text" style="font-size:${overlay.fontSize}px; color:${overlay.fontColor}; font-family:${overlay.font}; ${outlineStyle}">
          ${overlay.text}
        </div>
        ${timerHtml}
        <style>${overlay.customCSS || ''}</style>
      </div>
    `;
  }).join('');
}

router.get('/output', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    .overlay {
      position: absolute;
      text-align: center;
    }
    .timer {
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div id="overlays">${renderOverlays()}</div>
  <script>
    function updateTimers() {
      document.querySelectorAll('.timer').forEach(timer => {
        const duration = parseInt(timer.dataset.duration);
        const started = parseInt(timer.dataset.started);
        if (!started) { timer.textContent = ''; return; }
        const elapsed = (Date.now() - started) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        if (remaining <= 0) {
          timer.closest('.overlay').style.display = 'none';
          return;
        }
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        timer.textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
      });
    }

    async function refreshOverlays() {
      try {
        const res = await fetch('/output/render');
        const html = await res.text();
        const overlays = document.getElementById('overlays');
        if (overlays.innerHTML !== html) {
          overlays.innerHTML = html;
        }
        updateTimers();
      } catch (e) {}
    }

    setInterval(updateTimers, 1000);
    setInterval(refreshOverlays, 2000);
    updateTimers();
  </script>
</body>
</html>`);
});

router.get('/output/render', (req, res) => {
  res.send(renderOverlays());
});

module.exports = router;
