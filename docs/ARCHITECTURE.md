# Architecture

## Overview

DevStream is a modular OBS overlay system built with Node.js/Express, hosted in Docker. It uses a simple JSON file-based persistence layer and serves overlay content as browser sources for OBS.

Compose runs two containers:
- **devstream** - the Express overlay server (port 3000)
- **pixel-canvas-bot** - the mini_pixel_canvas Python bot (Twitch/Discord/YouTube chat listeners for the canvas)

The devstream container mounts the host Docker socket (`/var/run/docker.sock`) and uses `dockerode` to start/stop the `pixel-canvas-bot` container from the console / canvas settings pages.

## System Components

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Container                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  Express Server                   │  │
│  │                   (port 3000)                     │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                             │
│          ┌────────────────┼────────────────┐            │
│          │                │                │            │
│  ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐    │
│  │  Console     │ │  Output      │ │  API         │    │
│  │  /console    │ │  /output     │ │  /api/*      │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                           │                             │
│                  ┌────────▼────────┐                    │
│                  │   Store Layer   │                    │
│                  │  (JSON Files)   │                    │
│                  └─────────────────┘                    │
│                           │                             │
│                  ┌────────▼────────┐                    │
│                  │   data/*.json   │                    │
│                  └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  devstream (port 3000)  │        │  pixel-canvas-bot        │
│  ─────────────────────  │        │  (Python)                │
│  serves /output /api/*  │        │  Twitch/Discord/YT chat  │
└───────────┬─────────────┘        └────────────┬─────────────┘
            │ Docker socket (dockerode)          │ shares canvas
            └─────────► start/stop container ◄───┘  state/palette
                     (mounted /var/run/docker.sock)  via mounted folder
```

## Request Flow

### Overlay Display (OBS)

```
Browser Source (/output)
    │
    ├── Initial render with active overlays
    │
    └── Polls /output/render every 2 seconds
        │
        └── Updates overlay HTML if changed
            │
            └── Timer updates every 1 second (client-side)
```

### Console Management

```
Console (/console)
    │
    ├── Initial render with overlay list
    │
    └── Polls /console/render every 2 seconds
        │
        └── Updates table rows
```

## File Structure

### Server Files

- `server/index.js` - Express app setup, route mounting, dotenv config
- `server/store.js` - JSON file persistence (load/save)
- `server/routes/api.js` - REST API for text overlays + duplicate
- `server/routes/scroll.js` - REST API for scroll overlays + duplicate
- `server/routes/godgamer.js` - REST API for God Gamer sessions, players, games DB, TGDB search, finish, duplicate
- `server/routes/canvas.js` - REST API for canvas overlays + bot start/stop via dockerode
- `server/routes/console.js` - Console page (all modules)
- `server/routes/output.js` - OBS output page (all modules)
- `server/routes/debug.js` - Debug interface

### Static Files

- `public/text-display.html` - Settings page for text overlays
- `public/scroll-display.html` - Settings page for scroll overlays
- `public/godgamer-display.html` - Settings page for God Gamer sessions
- `public/canvas-display.html` - Settings page for canvas overlays (+ bot Start/Stop)
- `public/canvas-client.js` - Canvas renderer shared by output + preview

### Data Files

- `data/text-overlays.json` - Persisted text overlay configurations
- `data/scroll-overlays.json` - Persisted scroll overlay configurations
- `data/godgamer-sessions.json` - God Gamer sessions with game history
- `data/godgamer-players.json` - Player records
- `data/godgamer-games.json` - Local game database (cached from TGDB)
- `data/canvas-overlays.json` - Canvas overlay configurations (also read by the bot for the active YouTube chat link)

## Key Design Decisions

### 1. JSON File Persistence

Using JSON files instead of a database for simplicity. Each module type gets its own JSON file in the `/data` directory.

**Pros:**
- Simple to implement and debug
- Easy to inspect and modify manually
- No external dependencies

**Cons:**
- Not suitable for high-concurrency
- No ACID guarantees
- File locking concerns

### 2. Server-Side Rendering with Client-Side Polling

Overlays are rendered server-side, then the client polls for updates. This ensures:
- Consistent rendering across clients
- Timer accuracy (client-side calculation)
- Simple implementation

### 3. Separate Render Endpoints

`/output` and `/output/render` are separate endpoints:
- `/output` - Full HTML page with scripts
- `/output/render` - Just the overlay HTML for polling

This allows the client to compare and only update when content changes.

### 4. Timer Implementation

Timers use a `data-started` timestamp and calculate remaining time client-side:
- Server sets `startedAt: Date.now()` when starting
- Client calculates `remaining = duration - (Date.now() - startedAt) / 1000`
- Timer updates every second via `setInterval`
- Overlay hidden when timer expires

### 5. Bot Control via Docker Socket

DevStream starts/stops the `pixel-canvas-bot` container by talking to the Docker socket mounted at `/var/run/docker.sock` using `dockerode`:
- DevStream cannot spawn host processes, so containerizing the bot is the chosen control path
- `GET /api/canvas/bot/status` inspects the container; `POST .../start` and `POST .../stop` call `container.start()` / `container.stop()`
- `docker stop` is an explicit stop, so the bot's `restart: always` policy does not fight the UI control
- If the socket/container is unavailable, the API reports `available: false` and the UI disables the buttons

## Module System

Each overlay type is a self-contained module with:
- Route file: `server/routes/{module}.js`
- Settings page: `public/{module}-display.html`
- Store file: `data/{module}-*.json`
- Console entries in `server/routes/console.js`
- Output rendering in `server/routes/output.js`

Modules share common features: transparent backgrounds, positioning, opacity, text outline, font customization, custom CSS, and duplicate support.

```javascript
// Example module structure
module.exports = {
  name: 'text-display',
  settingsPage: 'text-display.html',
  apiRoutes: require('./routes/api'),
  render: (data) => `<div>...</div>`
};
```

## Security Considerations

- No authentication (local network use)
- Custom CSS allows arbitrary JavaScript (trusted environment)
- API accepts any input (no validation beyond types)

## Scaling Considerations

- Single instance only (no clustering)
- File-based storage limits concurrent users
- Polling interval (2s) balances responsiveness vs load
