const express = require('express');
const router = express.Router();
const { load } = require('../store');

function renderOverlays() {
  const textOverlays = load('text-overlays');
  const scrollOverlays = load('scroll-overlays');
  
  const activeTextOverlays = textOverlays.filter(o => o.isActive);
  const activeScrollOverlays = scrollOverlays.filter(o => o.isActive);

  const textHtml = activeTextOverlays.map(overlay => {
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
        style="left:${overlay.position.x}px; top:${overlay.position.y}px; text-align:${overlay.textAlign || 'center'}; opacity:${overlay.opacity ?? 1}; background-color:${overlay.backgroundColor || 'transparent'};">
        <div class="text" style="font-size:${overlay.fontSize}px; color:${overlay.fontColor}; font-family:${overlay.font}; ${outlineStyle}">
          ${overlay.text}
        </div>
        ${timerHtml}
        <style>${overlay.customCSS || ''}</style>
      </div>
    `;
  }).join('');

  const scrollHtml = activeScrollOverlays.map(overlay => {
    let outlineStyle = '';
    if (overlay.outlineEnabled) {
      const w = overlay.outlineWidth || 2;
      const c = overlay.outlineColor || '#000000';
      outlineStyle = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
    }

    const scrollText = (overlay.lines || []).join(overlay.separator || ' • ');

    return `
      <div class="scroll-overlay" id="scroll-${overlay.id}"
        style="left:${overlay.position.x}px; top:${overlay.position.y}px; width:100%; overflow:hidden; white-space:nowrap; height:${overlay.containerHeight}px; line-height:${overlay.containerHeight}px; opacity:${overlay.opacity ?? 1}; background-color:${overlay.backgroundColor || 'transparent'};">
        <div class="scroll-text" 
          style="font-size:${overlay.fontSize}px; color:${overlay.fontColor}; font-family:${overlay.font}; ${outlineStyle}"
          data-speed="${overlay.scrollSpeed}"
          data-randomize="${overlay.randomizeLines ? 'true' : 'false'}"
          data-lines="${encodeURIComponent(JSON.stringify(overlay.lines || []))}"
          data-separator="${encodeURIComponent(overlay.separator || ' • ')}">
          ${scrollText}
        </div>
        <style>${overlay.customCSS || ''}</style>
      </div>
    `;
  }).join('');

  return textHtml + scrollHtml;
}

router.get('/output', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; width: 1920px; height: 1080px; }
    #overlays { width: 1920px; height: 1080px; position: relative; }
    .overlay {
      position: absolute;
      text-align: center;
    }
    .timer {
      margin-top: 8px;
    }
    .scroll-overlay {
      position: absolute;
      overflow: hidden;
      white-space: nowrap;
    }
    .scroll-text {
      display: inline-block;
      white-space: nowrap;
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

    let scrollPositions = {};
    let scrollWidths = {};

    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    function updateScroll() {
      document.querySelectorAll('.scroll-overlay').forEach(container => {
        const id = container.id;
        const text = container.querySelector('.scroll-text');
        const speed = parseFloat(text.dataset.speed) || 2;
        const shouldRandomize = text.dataset.randomize === 'true';
        
        if (!scrollWidths[id]) {
          scrollWidths[id] = text.scrollWidth;
        }
        
        if (!(id in scrollPositions)) {
          scrollPositions[id] = container.offsetWidth;
        }
        
        scrollPositions[id] -= speed;
        
        if (scrollPositions[id] < -scrollWidths[id]) {
          scrollPositions[id] = container.offsetWidth;
          
          if (shouldRandomize) {
            const lines = JSON.parse(decodeURIComponent(text.dataset.lines));
            const separator = decodeURIComponent(text.dataset.separator);
            const shuffled = shuffleArray(lines);
            text.textContent = shuffled.join(separator);
            scrollWidths[id] = text.scrollWidth;
          }
        }
        
        text.style.transform = 'translateX(' + scrollPositions[id] + 'px)';
      });
    }

    let lastHtml = '';
    async function refreshOverlays() {
      try {
        const res = await fetch('/output/render');
        const html = await res.text();
        if (html !== lastHtml) {
          lastHtml = html;
          const overlays = document.getElementById('overlays');
          overlays.innerHTML = html;
          scrollWidths = {};
        }
        updateTimers();
      } catch (e) {}
    }

    setInterval(updateTimers, 1000);
    setInterval(refreshOverlays, 2000);
    function animationLoop() {
      updateScroll();
      requestAnimationFrame(animationLoop);
    }
    updateTimers();
    animationLoop();
  </script>
</body>
</html>`);
});

router.get('/output/render', (req, res) => {
  res.send(renderOverlays());
});

module.exports = router;
