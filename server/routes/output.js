const express = require('express');
const router = express.Router();
const { load } = require('../store');
const tracker = require('../tracker');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderOverlays() {
  const DEFAULT_INSTRUCTION = 'Mini Pixel Canvas 32x32\n!pixel x,y,## (5 sec cooldown)\n## = 2 digits (00-63) for color';
  const textOverlays = load('text-overlays');
  const scrollOverlays = load('scroll-overlays');
  const godgamerSessions = load('godgamer-sessions');
  const canvasOverlays = load('canvas-overlays');
  
  const activeTextOverlays = textOverlays.filter(o => o.isActive);
  const activeScrollOverlays = scrollOverlays.filter(o => o.isActive);
  const activeGodgamer = godgamerSessions.filter(s => s.isActive || s.isFinished);
  const activeCanvas = canvasOverlays.filter(o => o.isActive);

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
          <span class="godgamer-name">${escapeHtml(game.displayName || game.name)}</span>
          ${resultText ? `<span class="godgamer-result ${resultClass}">${resultText}</span>` : ''}
          ${durationText ? `<span class="godgamer-duration">${durationText}</span>` : ''}
        </div>
      `;
    }).join('');

    const sessionTimerHtml = session.startedAt
      ? `<div class="godgamer-session-timer" data-started="${session.startedAt}" data-finished="${session.isFinished ? 'true' : 'false'}" data-ended-at="${session.endedAt || ''}"></div>`
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

  const canvasHtml = activeCanvas.map(overlay => {
    const opacity = overlay.opacity ?? 0.5;
    const position = overlay.position || { x: 1600, y: 300 };
    const enlargedPos = overlay.enlargedPosition || { x: 500, y: 50 };
    const titleHtml = overlay.showTitle
      ? `<div class="canvas-title">${escapeHtml(overlay.titleText || 'Mini Pixel Canvas')}</div>`
      : '';
    const instructionText = overlay.instructionText || DEFAULT_INSTRUCTION;
    const instructionHtml = overlay.showInstruction !== false && instructionText
      ? `<div class="canvas-instruction">${escapeHtml(instructionText)}</div>`
      : '';

    return `
      <div class="canvas-overlay" id="canvas-${overlay.id}"
        style="left:${position.x}px; bottom:${position.y}px; opacity:${opacity};"
        data-state-url="/api/canvas/${overlay.id}/pixels"
        data-palette-url="/api/canvas/${overlay.id}/palette"
        data-grid-width="${overlay.gridWidth || 32}"
        data-grid-height="${overlay.gridHeight || 32}"
        data-display-size="${overlay.displaySize || 300}"
        data-enlarged-size="${overlay.enlargedSize || 900}"
        data-enlarged-left="${enlargedPos.x}"
        data-enlarged-bottom="${enlargedPos.y}"
        data-fade-opacity="${opacity}"
        data-enlarge-on-click="${overlay.enlargeOnClick !== false ? 'true' : 'false'}">
        ${instructionHtml}
        ${titleHtml}
        <div class="canvas-grid"></div>
        <style>${overlay.customCSS || ''}</style>
      </div>
    `;
  }).join('');

  const archipelagoHtml = (() => {
    const archOverlays = load('archipelago-overlays').filter(o => o.isActive);
    return archOverlays.map(overlay => {
      let outlineStyle = '';
      if (overlay.outlineEnabled) {
        const w = overlay.outlineWidth || 2;
        const c = overlay.outlineColor || '#000000';
        outlineStyle = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
      }

      const status = tracker.getStatus(overlay);
      const fontSize = overlay.fontSize || 28;
      const gameSize = Math.max(10, Math.floor(fontSize * 0.62));

      const rows = status.rows.map(row => {
        const checks = row.total != null ? `${row.checked ?? 0}/${row.total}` : '--';
        const pct = row.pct != null ? `${row.pct}%` : '--';
        const currentClass = overlay.highlightCurrent !== false && row.current ? ' arch-current' : '';
        const playerState = row.playerOnline === true ? 'online' : row.playerOnline === false ? 'offline' : 'unknown';
        const playerHtml = overlay.showPlayer !== false ? `<span class="arch-player arch-player-${playerState}"></span>` : '';
        const nameHtml = `${overlay.showNumber !== false ? `<span class="arch-number">${row.slot}.</span>` : ''}${escapeHtml(row.name || row.serverName || `Slot ${row.slot}`)}`;
        const gameHtml = overlay.showGame !== false && row.game
          ? `<div class="arch-game">${escapeHtml(row.game)}</div>`
          : '';
        const rightHtml = [
          overlay.showChecks !== false ? `<span class="arch-checks">${checks}</span>` : '',
          overlay.showPercent !== false ? `<span class="arch-pct">${pct}</span>` : '',
          overlay.showStatus !== false ? `<span class="arch-dot arch-dot-${row.status}"></span>` : ''
        ].filter(Boolean).join('');

        return `
          <div class="arch-row${currentClass}">
            <div class="arch-left">
              <div class="arch-name">${playerHtml}${nameHtml}</div>
              ${gameHtml}
            </div>
            <div class="arch-right">${rightHtml}</div>
          </div>
        `;
      }).join('');

      const header = overlay.showHeader !== false
        ? `<div class="arch-header">${escapeHtml(overlay.name)}<span class="arch-header-stats">${status.header.checked}/${status.header.total != null ? status.header.total : '?'}${status.header.pct != null ? ` (${status.header.pct}%)` : ''}</span></div>`
        : '';

      return `
      <div class="arch-overlay" id="arch-${overlay.id}"
        style="left:${overlay.position.x}px; top:${overlay.position.y}px; opacity:${overlay.opacity ?? 1}; background-color:${overlay.backgroundColor || 'transparent'}; row-gap:${overlay.rowGap ?? 8}px; font-size:${fontSize}px; color:${overlay.fontColor}; font-family:${overlay.font}; ${outlineStyle} --arch-game-size:${gameSize}px;">
        ${header}
        <div class="arch-rows">
          ${rows}
        </div>
        <style>${overlay.customCSS || ''}</style>
      </div>
    `;
    }).join('');
  })();

  return textHtml + scrollHtml + godgamerHtml + canvasHtml + archipelagoHtml;
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
    .canvas-overlay {
      position: absolute;
    }
    .canvas-overlay .canvas-grid {
      display: grid;
    }
    .canvas-overlay .canvas-title {
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0.5;
      margin-bottom: 8px;
      font-family: sans-serif;
      color: #eee;
      font-size: 1.2em;
    }
    .canvas-overlay .canvas-instruction {
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0.5;
      margin-bottom: 8px;
      font-family: sans-serif;
      color: #eee;
      font-size: 1.2em;
      white-space: pre-line;
    }
    .arch-overlay {
      position: absolute;
      display: flex;
      flex-direction: column;
      min-width: 340px;
    }
    .arch-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 15px;
      font-weight: bold;
      font-size: 1.15em;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.25);
    }
    .arch-header-stats {
      font-size: 0.8em;
      opacity: 0.85;
    }
    .arch-rows {
      display: flex;
      flex-direction: column;
    }
    .arch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.3);
    }
    .arch-row.arch-current {
      background: rgba(77, 166, 255, 0.3);
      border: 1px solid rgba(77, 166, 255, 0.5);
    }
    .arch-left {
      min-width: 0;
    }
    .arch-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arch-number {
      opacity: 0.7;
      margin-right: 6px;
    }
    .arch-game {
      font-size: var(--arch-game-size, 0.62em);
      opacity: 0.75;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arch-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .arch-pct {
      min-width: 4.2em;
      text-align: right;
      opacity: 0.9;
    }
    .arch-checks {
      opacity: 0.9;
    }
    .arch-dot {
      width: 0.6em;
      height: 0.6em;
      border-radius: 50%;
      background: #888;
      display: inline-block;
      flex-shrink: 0;
    }
    .arch-dot.arch-dot-connected { background: #4dff4d; }
    .arch-dot.arch-dot-goal { background: #ffd700; }
    .arch-dot.arch-dot-disconnected { background: #ff4d4d; }
    .arch-dot.arch-dot-unknown { background: #888; }
    .arch-player {
      width: 0.5em;
      height: 0.5em;
      display: inline-block;
      border-radius: 2px;
      margin-right: 0.4em;
      vertical-align: middle;
      background: #666;
      flex-shrink: 0;
      transform: rotate(45deg);
    }
    .arch-player.arch-player-online { background: #4dff4d; }
    .arch-player.arch-player-offline { background: #ff6b6b; }
    .arch-player.arch-player-unknown { background: #666; }
  </style>
</head>
<body>
  <div id="overlays">${renderOverlays()}</div>
  <script src="/canvas-client.js"></script>
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
        const isFinished = timer.dataset.finished === 'true';
        if (!started) { timer.textContent = ''; return; }
        
        if (isFinished) {
          const endedAt = parseInt(timer.dataset.endedAt) || Date.now();
          const elapsed = Math.floor((endedAt - started) / 1000);
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          timer.textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        } else {
          const elapsed = Math.floor((Date.now() - started) / 1000);
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          timer.textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        }
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
          destroyCanvasOverlays(overlays);
          overlays.innerHTML = html;
          scrollWidths = {};
          initCanvasOverlays();
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
    initCanvasOverlays();
  </script>
</body>
</html>`);
});

router.get('/output/render', (req, res) => {
  res.send(renderOverlays());
});

module.exports = router;
