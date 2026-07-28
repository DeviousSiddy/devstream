const express = require('express');
const router = express.Router();
const { load, save } = require('../store');

function renderRow(overlay) {
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
      <td class="${statusClass}">${status}</td>
      <td>
        <a href="/text-display?id=${overlay.id}">Settings</a>
        <button class="btn btn-sm" onclick="toggleOverlay('${overlay.id}', ${!overlay.isActive})">${overlay.isActive ? 'Stop' : 'Start'}</button>
        <button class="btn btn-sm btn-stop" onclick="deleteOverlay('${overlay.id}', '${overlay.name}')">Delete</button>
      </td>
    </tr>
  `;
}

function renderConsole() {
  const textOverlays = load('text-overlays');
  const overlayRows = textOverlays.map(renderRow).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DevStream Console</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
    h1 { margin-bottom: 20px; }
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
  </style>
</head>
<body>
  <h1>DevStream Console</h1>
  
  <div class="overlay-size">
    <label>Browser Source Size (for OBS):</label>
    <label>Width: <input type="number" id="width" value="1920"></label>
    <label>Height: <input type="number" id="height" value="1080"></label>
  </div>

  <div class="section">
    <h2>Text Display Overlays</h2>
    <a href="/text-display" class="btn">+ New Overlay</a>
    <table>
      <thead>
        <tr><th>Name</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody id="overlayTable">
        ${overlayRows || '<tr><td colspan="3">No overlays yet</td></tr>'}
      </tbody>
    </table>
  </div>

  <script>
    async function toggleOverlay(id, activate) {
      const endpoint = activate 
        ? '/api/text/' + id + '/start'
        : '/api/text/' + id + '/stop';
      await fetch(endpoint, { method: 'POST' });
      refreshConsole();
    }

    async function deleteOverlay(id, name) {
      if (!confirm('Delete "' + name + '"?')) return;
      await fetch('/api/text/' + id, { method: 'DELETE' });
      refreshConsole();
    }

    async function refreshConsole() {
      try {
        const res = await fetch('/console/render');
        const html = await res.text();
        document.getElementById('overlayTable').innerHTML = html;
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
  const rows = textOverlays.map(renderRow).join('');
  res.send(rows);
});

module.exports = router;
