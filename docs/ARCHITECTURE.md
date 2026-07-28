# Architecture

## Overview

DevStream is a modular OBS overlay system built with Node.js/Express, hosted in Docker. It uses a simple JSON file-based persistence layer and serves overlay content as browser sources for OBS.

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
- `server/routes/console.js` - Console page (all modules)
- `server/routes/output.js` - OBS output page (all modules)
- `server/routes/debug.js` - Debug interface

### Static Files

- `public/text-display.html` - Settings page for text overlays
- `public/scroll-display.html` - Settings page for scroll overlays
- `public/godgamer-display.html` - Settings page for God Gamer sessions

### Data Files

- `data/text-overlays.json` - Persisted text overlay configurations
- `data/scroll-overlays.json` - Persisted scroll overlay configurations
- `data/godgamer-sessions.json` - God Gamer sessions with game history
- `data/godgamer-players.json` - Player records
- `data/godgamer-games.json` - Local game database (cached from TGDB)

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
