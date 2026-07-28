const express = require('express');
const router = express.Router();
const { load } = require('../store');

function renderOverlays() {
  const textOverlays = load('text-overlays');
  const scrollOverlays = load('scroll-overlays');
  const godgamerSessions = load('godgamer-sessions');
  
  const activeTextOverlays = textOverlays.filter(o => o.isActive);
  const activeScrollOverlays = scrollOverlays.filter(o => o.isActive);
  const activeGodgamer = godgamerSessions.filter(s => s.isActive);

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

  const godgamerHtml = activeGodgamer.map(session => {
    let outlineStyle = '';
    if (session.outlineEnabled) {
      const w = session.outlineWidth || 2;
      const c = session.outlineColor || '#000000';
      outlineStyle = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
    }

    const games = (session.games || []).map((game, i) => {
      let resultClass = '';
      let resultText = '';
      
      if (game.result === 'win') {
        resultClass = 'godgamer-win';
        resultText = 'W';
      } else if (game.result === 'loss') {
        resultClass = 'godgamer-loss';
        resultText = 'L';
      } else if (i === session.currentGameIndex && session.isActive) {
        resultClass = 'godgamer-current';
        resultText = '';
      }

      const durationText = game.duration ? formatDuration(game.duration) : '';
      const iconSize = session.iconSize || 32;
      const imgHtml = game.boxartUrl
        ? `<img class="godgamer-icon" src="${game.boxartUrl}" alt="" onerror="this.style.display='none'" style="width:${iconSize}px; height:${iconSize}px;">`
        : `<div class="godgamer-icon-placeholder" style="width:${iconSize}px; height:${iconSize}px;"></div>`;

      return `
        <div class="godgamer-game ${resultClass}">
          <span class="godgamer-number">${i + 1}.</span>
          ${imgHtml}
          <span class="godgamer-name">${game.name}</span>
          ${resultText ? `<span class="godgamer-result ${resultClass}">${resultText}</span>` : ''}
          ${durationText ? `<span class="godgamer-duration">${durationText}</span>` : ''}
        </div>
      `;
    }).join('');

    const sessionTimerHtml = session.startedAt
      ? `<div class="godgamer-session-timer" data-started="${session.startedAt}"></div>`
      : '';

    return `
      <div class="godgamer-overlay" id="godgamer-${session.id}"
        style="left:${session.position.x}px; top:${session.position.y}px; opacity:${session.opacity ?? 1}; background-color:${session.backgroundColor || 'transparent'};">
        <div class="godgamer-header" style="font-size:${session.fontSize}px; color:${session.fontColor}; font-family:${session.font}; ${outlineStyle}">
          ${session.name}
          ${sessionTimerHtml}
        </div>
        <div class="godgamer-games" style="font-size:${Math.floor(session.fontSize * 0.7)}px; color:${session.fontColor}; font-family:${session.font}; ${outlineStyle}">
          ${games}
        </div>
        <style>${session.customCSS || ''}</style>
      </div>
    `;
  }).join('');

  return textHtml + scrollHtml + godgamerHtml;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
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
    .godgamer-overlay {
      position: absolute;
      min-width: 300px;
    }
    .godgamer-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .godgamer-session-timer {
      font-size: 0.6em;
      opacity: 0.8;
    }
    .godgamer-games {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .godgamer-game {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.3);
    }
    .godgamer-game.godgamer-current {
      background: rgba(77, 166, 255, 0.3);
      border: 1px solid rgba(77, 166, 255, 0.5);
    }
    .godgamer-game.godgamer-win {
      background: rgba(77, 255, 77, 0.2);
    }
    .godgamer-game.godgamer-loss {
      background: rgba(255, 77, 77, 0.2);
    }
    .godgamer-number {
      font-weight: bold;
      min-width: 25px;
      opacity: 0.7;
    }
    .godgamer-icon {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 4px;
    }
    .godgamer-icon-placeholder {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .godgamer-name {
      flex: 1;
    }
    .godgamer-result {
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.8em;
    }
    .godgamer-result.godgamer-win {
      background: rgba(77, 255, 77, 0.3);
      color: #4dff4d;
    }
    .godgamer-result.godgamer-loss {
      background: rgba(255, 77, 77, 0.3);
      color: #ff4d4d;
    }
    .godgamer-duration {
      font-size: 0.8em;
      opacity: 0.7;
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

      document.querySelectorAll('.godgamer-session-timer').forEach(timer => {
        const started = parseInt(timer.dataset.started);
        if (!started) { timer.textContent = ''; return; }
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
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
