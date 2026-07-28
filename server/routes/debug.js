const express = require('express');
const router = express.Router();
const { load, save } = require('../store');
const { v4: uuidv4 } = require('uuid');

router.get('/debug', (req, res) => {
  const textOverlays = load('text-overlays');

  const overlaysJson = JSON.stringify(textOverlays, null, 2);

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DevStream Debug</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; padding: 20px; background: #0a0a0a; color: #0f0; }
    h1 { margin-bottom: 20px; color: #0f0; }
    .section { margin-bottom: 30px; border: 1px solid #333; padding: 15px; }
    h2 { margin-bottom: 10px; color: #0ff; }
    pre { background: #111; padding: 10px; overflow-x: auto; font-size: 12px; }
    button { 
      padding: 8px 16px; margin: 5px; cursor: pointer; 
      background: #222; color: #0f0; border: 1px solid #0f0;
    }
    button:hover { background: #0f0; color: #000; }
    input, textarea { 
      background: #111; color: #0f0; border: 1px solid #333; 
      padding: 5px; font-family: monospace; margin: 5px;
    }
    .log { 
      background: #000; border: 1px solid #333; padding: 10px; 
      height: 200px; overflow-y: auto; margin-top: 10px;
    }
    .log-entry { margin: 2px 0; }
    .log-entry.error { color: #f00; }
    .log-entry.success { color: #0f0; }
    .log-entry.info { color: #0ff; }
  </style>
</head>
<body>
  <h1>DevStream Debug Console</h1>

  <div class="section">
    <h2>Current State</h2>
    <pre id="state">${overlaysJson}</pre>
    <button onclick="refreshState()">Refresh</button>
  </div>

  <div class="section">
    <h2>Quick Actions</h2>
    <button onclick="createTestOverlay()">Create Test Overlay</button>
    <button onclick="startAll()">Start All</button>
    <button onclick="stopAll()">Stop All</button>
    <button onclick="deleteAll()">Delete All</button>
  </div>

  <div class="section">
    <h2>Custom Request</h2>
    <select id="method">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="DELETE">DELETE</option>
    </select>
    <input type="text" id="endpoint" value="/api/text" placeholder="/api/text">
    <button onclick="sendRequest()">Send</button>
    <div class="log" id="log"></div>
  </div>

  <script>
    function log(msg, type = 'info') {
      const log = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      entry.textContent = new Date().toISOString() + ' - ' + msg;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }

    async function refreshState() {
      try {
        const res = await fetch('/api/text');
        const data = await res.json();
        document.getElementById('state').textContent = JSON.stringify(data, null, 2);
        log('State refreshed', 'success');
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }

    async function createTestOverlay() {
      try {
        const res = await fetch('/api/text/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test-' + Date.now(),
            text: 'TEST OVERLAY',
            duration: 60,
            fontSize: 72,
            fontColor: '#ff0000',
            position: { x: 100, y: 100 }
          })
        });
        const data = await res.json();
        log('Created: ' + data.id, 'success');
        refreshState();
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }

    async function startAll() {
      try {
        const res = await fetch('/api/text');
        const overlays = await res.json();
        for (const overlay of overlays) {
          await fetch('/api/text/' + overlay.id + '/start', { method: 'POST' });
          log('Started: ' + overlay.name, 'success');
        }
        refreshState();
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }

    async function stopAll() {
      try {
        const res = await fetch('/api/text');
        const overlays = await res.json();
        for (const overlay of overlays) {
          await fetch('/api/text/' + overlay.id + '/stop', { method: 'POST' });
          log('Stopped: ' + overlay.name, 'success');
        }
        refreshState();
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }

    async function deleteAll() {
      if (!confirm('Delete all overlays?')) return;
      try {
        const res = await fetch('/api/text');
        const overlays = await res.json();
        for (const overlay of overlays) {
          await fetch('/api/text/' + overlay.id, { method: 'DELETE' });
          log('Deleted: ' + overlay.name, 'success');
        }
        refreshState();
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }

    async function sendRequest() {
      const method = document.getElementById('method').value;
      const endpoint = document.getElementById('endpoint').value;
      try {
        const res = await fetch(endpoint, { method });
        const data = await res.text();
        log(method + ' ' + endpoint + ' -> ' + res.status, res.ok ? 'success' : 'error');
        log(data.substring(0, 500));
      } catch (e) {
        log('Error: ' + e.message, 'error');
      }
    }
  </script>
</body>
</html>`);
});

module.exports = router;
