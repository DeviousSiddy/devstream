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

- `server/index.js` - Express app setup, route mounting
- `server/store.js` - JSON file persistence (load/save)
- `server/routes/api.js` - REST API for overlays
- `server/routes/console.js` - Console page
- `server/routes/output.js` - OBS output page
- `server/routes/debug.js` - Debug interface

### Static Files

- `public/text-display.html` - Settings page for overlays

### Data Files

- `data/text-overlays.json` - Persisted overlay configurations

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

## Module System (Planned)

Each overlay type is a module with:
- Settings page (HTML)
- API endpoints (CRUD)
- Output rendering
- Store schema

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
