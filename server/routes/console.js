const express = require('express');
const router = express.Router();
const { load, save } = require('../store');

function renderTextRow(overlay) {
  let status = 'Inactive';
  let statusClass = '';
  if (overlay.isActive) {
    const elapsed = overlay.startedAt ? (Date.now() - overlay.startedAt) / 1000 : 0;
    const remaining = Math.max(0, overlay.duration - elapsed);
    if (remaining > 0) {
      status = 'On Screen';
      statusClass = 'status-active';
    } else {
      status = 'Expired';
      statusClass = 'status-expired';
    }
  }

  return `
    <tr>
      <td>${overlay.name}</td>
      <td>${overlay.text}</td>
      <td class="${statusClass}">${status}</td>
      <td>
        <a href="/text-display?id=${overlay.id}">Settings</a>
        <button class="btn btn-sm" onclick="toggleTextOverlay('${overlay.id}', ${!overlay.isActive})">${overlay.isActive ? 'Stop' : 'Start'}</button>
        <button class="btn btn-sm btn-stop" onclick="deleteTextOverlay('${overlay.id}', '${overlay.name}')">Delete</button>
      </td>
    </tr>
  `;
}

function renderScrollRow(overlay) {
  let status = 'Inactive';
  let statusClass = '';
  if (overlay.isActive) {
    status = 'On Screen';
    statusClass = 'status-active';
  }

  const preview = (overlay.lines || []).slice(0, 2).join(', ');
  const previewTruncated = preview.length > 40 ? preview.substring(0, 40) + '...' : preview;

  return `
    <tr>
      <td>${overlay.name}</td>
      <td>${previewTruncated}</td>
      <td class="${statusClass}">${status}</td>
      <td>
        <a href="/scroll-display?id=${overlay.id}">Settings</a>
        <button class="btn btn-sm" onclick="toggleScrollOverlay('${overlay.id}', ${!overlay.isActive})">${overlay.isActive ? 'Stop' : 'Start'}</button>
        <button class="btn btn-sm btn-stop" onclick="deleteScrollOverlay('${overlay.id}', '${overlay.name}')">Delete</button>
      </td>
    </tr>
  `;
}

function renderGodgamerRow(session) {
  let status = 'Inactive';
  let statusClass = '';
  if (session.isActive) {
    status = 'Active';
    statusClass = 'status-active';
  } else if (session.endedAt) {
    status = 'Completed';
    statusClass = 'status-expired';
  }

  const gamesPlayed = (session.games || []).filter(g => g.result).length;
  const totalGames = (session.games || []).length;
  const players = (session.playerNames || []).join(', ') || 'devioussiddy';

  return `
    <tr>
      <td>${session.name}</td>
      <td>${players}</td>
      <td>${gamesPlayed}/${totalGames}</td>
      <td class="${statusClass}">${status}</td>
      <td>
        <a href="/godgamer-display?id=${session.id}">Settings</a>
        <button class="btn btn-sm" onclick="toggleGodgamerSession('${session.id}', ${!session.isActive})">${session.isActive ? 'Stop' : 'Start'}</button>
        <button class="btn btn-sm btn-stop" onclick="deleteGodgamerSession('${session.id}', '${session.name}')">Delete</button>
      </td>
    </tr>
  `;
}

function renderConsole() {
  const textOverlays = load('text-overlays');
  const scrollOverlays = load('scroll-overlays');
  const godgamerSessions = load('godgamer-sessions');
  
  const textRows = textOverlays.map(renderTextRow).join('');
  const scrollRows = scrollOverlays.map(renderScrollRow).join('');
  const godgamerRows = godgamerSessions.map(renderGodgamerRow).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DevStream Console</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
    h1 { margin-bottom: 20px; }
    h2 { margin-bottom: 10px; color: #aaa; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 10px; border: 1px solid #444; text-align: left; }
    th { background: #333; }
    a { color: #4da6ff; margin-right: 10px; }
    .btn { 
      display: inline-block; padding: 6px 12px; background: #4da6ff; color: #fff; 
      border: none; border-radius: 4px; cursor: pointer; text-decoration: none;
    }
    .btn-sm { padding: 4px 8px; font-size: 12px; }
    .btn-stop { background: #ff4d4d; }
    .section { margin-bottom: 30px; }
    .overlay-size { 
      margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px;
    }
    .overlay-size label { margin-right: 10px; }
    .overlay-size input { width: 80px; padding: 5px; background: #333; border: 1px solid #555; color: #fff; }
    .status-active { color: #4dff4d; font-weight: bold; }
    .status-expired { color: #ff994d; }
    .new-overlay-btn { margin-bottom: 15px; }
    .module-picker { display: none; margin-bottom: 15px; padding: 15px; background: #2a2a2a; border-radius: 4px; }
    .module-picker.show { display: block; }
    .module-picker h3 { margin-bottom: 10px; }
    .module-option { 
      display: inline-block; padding: 10px 20px; margin: 5px; background: #333; 
      border: 1px solid #555; border-radius: 4px; cursor: pointer; text-decoration: none; color: #fff;
    }
    .module-option:hover { background: #4da6ff; border-color: #4da6ff; }
  </style>
</head>
<body>
  <h1>DevStream Console</h1>
  
  <div class="overlay-size">
    <label>Browser Source Size (for OBS):</label>
    <label>Width: <input type="number" id="width" value="1920"></label>
    <label>Height: <input type="number" id="height" value="1080"></label>
  </div>

  <div class="new-overlay-btn">
    <button class="btn" onclick="showModulePicker()">+ New Overlay</button>
  </div>

  <div class="module-picker" id="modulePicker">
    <h3>Choose Module Type</h3>
    <a href="/text-display" class="module-option">Text Display</a>
    <a href="/scroll-display" class="module-option">Scrolling Text</a>
    <a href="/godgamer-display" class="module-option">God Gamer Challenge</a>
    <button class="btn btn-stop" onclick="hideModulePicker()" style="margin-left: 10px;">Cancel</button>
  </div>

  <div class="section">
    <h2>Text Display Overlays</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Preview</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody id="textTable">
        ${textRows || '<tr><td colspan="4">No overlays yet</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Scrolling Text Overlays</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Preview</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody id="scrollTable">
        ${scrollRows || '<tr><td colspan="4">No overlays yet</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>God Gamer Sessions</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Players</th><th>Games</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody id="godgamerTable">
        ${godgamerRows || '<tr><td colspan="5">No sessions yet</td></tr>'}
      </tbody>
    </table>
  </div>

  <script>
    function showModulePicker() {
      document.getElementById('modulePicker').classList.add('show');
    }

    function hideModulePicker() {
      document.getElementById('modulePicker').classList.remove('show');
    }

    async function toggleTextOverlay(id, activate) {
      const endpoint = activate 
        ? '/api/text/' + id + '/start'
        : '/api/text/' + id + '/stop';
      await fetch(endpoint, { method: 'POST' });
      refreshConsole();
    }

    async function deleteTextOverlay(id, name) {
      if (!confirm('Delete "' + name + '"?')) return;
      await fetch('/api/text/' + id, { method: 'DELETE' });
      refreshConsole();
    }

    async function toggleScrollOverlay(id, activate) {
      const endpoint = activate 
        ? '/api/scroll/' + id + '/start'
        : '/api/scroll/' + id + '/stop';
      await fetch(endpoint, { method: 'POST' });
      refreshConsole();
    }

    async function deleteScrollOverlay(id, name) {
      if (!confirm('Delete "' + name + '"?')) return;
      await fetch('/api/scroll/' + id, { method: 'DELETE' });
      refreshConsole();
    }

    async function toggleGodgamerSession(id, activate) {
      const endpoint = activate 
        ? '/api/godgamer/sessions/' + id + '/start'
        : '/api/godgamer/sessions/' + id + '/stop';
      await fetch(endpoint, { method: 'POST' });
      refreshConsole();
    }

    async function deleteGodgamerSession(id, name) {
      if (!confirm('Delete "' + name + '"?')) return;
      await fetch('/api/godgamer/sessions/' + id, { method: 'DELETE' });
      refreshConsole();
    }

    async function refreshConsole() {
      try {
        const res = await fetch('/console/render');
        const data = await res.json();
        document.getElementById('textTable').innerHTML = data.textRows || '<tr><td colspan="4">No overlays yet</td></tr>';
        document.getElementById('scrollTable').innerHTML = data.scrollRows || '<tr><td colspan="4">No overlays yet</td></tr>';
        document.getElementById('godgamerTable').innerHTML = data.godgamerRows || '<tr><td colspan="5">No sessions yet</td></tr>';
      } catch (e) {}
    }

    setInterval(refreshConsole, 2000);
  </script>
</body>
</html>`;
}

router.get('/console', (req, res) => {
  res.send(renderConsole());
});

router.get('/console/render', (req, res) => {
  const textOverlays = load('text-overlays');
  const scrollOverlays = load('scroll-overlays');
  const godgamerSessions = load('godgamer-sessions');
  
  const textRows = textOverlays.map(renderTextRow).join('');
  const scrollRows = scrollOverlays.map(renderScrollRow).join('');
  const godgamerRows = godgamerSessions.map(renderGodgamerRow).join('');
  
  res.json({ textRows, scrollRows, godgamerRows });
});

module.exports = router;
