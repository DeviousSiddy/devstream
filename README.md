# DevStream

A modular OBS overlay system hosted in Docker with configurable endpoints for stream overlays.

## Features

- **Modular Architecture** - Build custom overlay modules
- **Docker Hosted** - Easy deployment and management
- **Transparent Backgrounds** - All overlays default to transparent for OBS integration
- **Live Preview** - Real-time preview in settings pages
- **Custom CSS** - Advanced customization for each overlay
- **Opacity Control** - Adjustable transparency (0-100%)
- **Text Outline** - Enable/disable with color and width
- **Duplicate** - Copy any overlay with numbered naming (Session 2, Session 3...)

## Modules

### Text Display

Text content with customizable display:
- Countdown timer with duration settings
- Text alignment (left, center, right)
- Font customization (family, size, color)
- Text outline (enable/disable, color, width)
- Position control (X, Y coordinates)
- Background color or transparent
- Opacity control
- Custom CSS injection

### Scrolling Text

Multiline text that scrolls right to left:
- Add/remove/reorder text lines
- Configurable scroll speed
- Separator between lines
- Randomize line order on each loop
- Font customization (family, size, color)
- Text outline (enable/disable, color, width)
- Position control (X, Y coordinates)
- Background color or transparent
- Opacity control
- Custom CSS injection

### God Gamer Challenge

Track gaming challenge sessions:
- Game search via TheGamesDB (TGDB) API with local caching
- Dual search: "Search Local" (fast) and "Search TGDB" (full API)
- Manual game entry via JSON for offline/uncatalogued games
- Boxart/title screen images from TGDB
- Configurable icon size (16-128px) for boxart on overlay
- Player management (defaults to devioussiddy)
- Session history with game results (win/loss)
- Duration tracking for sessions and individual games
- Numbered game list with icons on output overlay
- Session timer on output overlay (freezes on finish)
- Current game pointer with visual indicator
- Finish Session: freezes timers, keeps overlay visible
- Stop Session: ends session, hides overlay

### Canvas Overlay

Live pixel-art canvas for the stream (used with the mini_pixel_canvas bot):
- 32x32 pixel grid (configurable size) served from a mounted source folder
- Pixel change animations with author tags ([D]/[YT]/[T])
- Hover pixels to see the author, click to enlarge
- Configurable enlarged size and position when clicked
- Bottom/left origin positioning, opacity fade
- Optional instruction text (e.g. how to place pixels) shown above the canvas
- YouTube Chat Link setting feeds the pixel bot's live-chat scraper (never rendered on the overlay)
- **Start/Stop the pixel canvas bot** (Docker container) directly from the console or canvas settings page

## Quick Start

### 1. Get a TGDB API Key

The God Gamer module requires a [TheGamesDB](https://thegamesdb.net/) API key for game search.

1. Create an account at https://thegamesdb.net
2. Go to https://thegamesdb.net/developer to generate an API key
3. Create a `.env` file in the project root:

```
TGDB_API_KEY=your_api_key_here
PORT=3000
```

### 2. Start the Server

**Docker Compose (recommended):**

```bash
docker-compose up -d
```

This starts both services:
- `devstream` - the overlay server (port 3000). The Docker socket is mounted into this container so it can control the bot.
- `pixel-canvas-bot` - the mini_pixel_canvas Python bot (Twitch/Discord/YouTube chat listeners for the canvas). `CANVAS_SOURCE_HOST` (in `.env`) points compose at the bot's source folder.

Start/Stop the bot from the Console (Canvas Overlays section) or the Canvas settings page.

**Docker:**

```bash
docker build -t devstream .
docker run -d -p 3000:3000 -v ./data:/app/data --name devstream devstream
```

**Local:**

```bash
npm install
npm start
```

### 3. Open the Console

Navigate to http://localhost:3000/console to manage your overlays.

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Console | `/console` | Main control panel for managing overlays |
| Text Settings | `/text-display?id=<id>` | Configure text display overlay |
| Scroll Settings | `/scroll-display?id=<id>` | Configure scrolling text overlay |
| God Gamer Settings | `/godgamer-display?id=<id>` | Configure God Gamer session |
| Canvas Settings | `/canvas-display?id=<id>` | Configure Canvas overlay |
| Output | `/output` | Browser source URL for OBS |
| Debug | `/debug` | Debug and testing interface |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `TGDB_API_KEY` | - | TheGamesDB API key (required for God Gamer game search) |
| `CANVAS_SOURCE_DIR` | `canvas-source/` | Folder with canvas_state.json / pallette.json (mounted in Docker) |
| `CANVAS_SOURCE_HOST` | - | Host path to the mini_pixel_canvas folder (used by docker-compose to mount/build the bot) |
| `DEVSTREAM_DATA_DIR` | - | Host path to DevStream's data folder (used by the pixel canvas bot) |
| `DEVSTREAM_ENV_FILE` | - | Path to the shared DevStream .env (used by the pixel canvas bot) |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket DevStream uses to start/stop the bot container |
| `BOT_CONTAINER_NAME` | `pixel-canvas-bot` | Bot container DevStream controls for start/stop |

## OBS Setup

1. Add a **Browser Source** in OBS
2. Set the URL to `http://localhost:3000/output`
3. Set width/height to match your canvas (default: 1920x1080)
4. Check **Shutdown source when not visible** (optional)

## API

See [docs/API.md](docs/API.md) for full API documentation.

### Quick Reference

```bash
# Text Display API
POST /api/text/create      # Create overlay
POST /api/text/:id/start   # Start countdown
POST /api/text/:id/stop    # Stop overlay
PUT /api/text/:id          # Update overlay
DELETE /api/text/:id       # Delete overlay
POST /api/text/:id/duplicate # Duplicate overlay

# Scrolling Text API
POST /api/scroll/create      # Create overlay
POST /api/scroll/:id/start   # Start scrolling
POST /api/scroll/:id/stop    # Stop overlay
PUT /api/scroll/:id          # Update overlay
DELETE /api/scroll/:id       # Delete overlay
POST /api/scroll/:id/duplicate # Duplicate overlay

# God Gamer Challenge API
GET /api/godgamer/search?q=           # Search games on TGDB
GET /api/godgamer/games               # List local game database
GET /api/godgamer/players             # List players
POST /api/godgamer/sessions           # Create session
POST /api/godgamer/sessions/:id/start # Start session
POST /api/godgamer/sessions/:id/stop  # Stop session
POST /api/godgamer/sessions/:id/finish # Finish session (freeze timers)
POST /api/godgamer/sessions/:id/games  # Add game to session
POST /api/godgamer/sessions/:id/games/current/start # Start current game
POST /api/godgamer/sessions/:id/games/current/end   # End current game (win/loss)
POST /api/godgamer/sessions/:id/duplicate # Duplicate session

# Canvas Overlay API
GET /api/canvas                    # List canvases
POST /api/canvas/create            # Create canvas
PUT /api/canvas/:id                # Update canvas
DELETE /api/canvas/:id             # Delete canvas
POST /api/canvas/:id/start         # Show on output
POST /api/canvas/:id/stop          # Hide from output
GET /api/canvas/:id/pixels         # Get pixel state
GET /api/canvas/:id/palette        # Get color palette
POST /api/canvas/:id/duplicate     # Duplicate canvas

# Canvas Bot Control (docker-compose only)
GET  /api/canvas/bot/status        # Bot container status
POST /api/canvas/bot/start         # Start the pixel-canvas-bot container
POST /api/canvas/bot/stop          # Stop the pixel-canvas-bot container
```

## Project Structure

```
devstream/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env                    # Environment variables (gitignored)
├── data/                   # Runtime data (gitignored)
│   ├── text-overlays.json
│   ├── scroll-overlays.json
│   ├── godgamer-sessions.json
│   ├── godgamer-players.json
│   ├── godgamer-games.json
│   └── canvas-overlays.json
├── docs/                   # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── MODULES.md
├── public/
│   ├── text-display.html   # Text settings page
│   ├── scroll-display.html # Scroll settings page
│   ├── godgamer-display.html # God Gamer settings page
│   ├── canvas-display.html # Canvas settings page
│   └── canvas-client.js    # Canvas renderer (output + preview)
└── server/
    ├── index.js            # Express server
    ├── store.js            # JSON file persistence
    └── routes/
        ├── api.js          # Text API endpoints
        ├── scroll.js       # Scroll API endpoints
        ├── godgamer.js     # God Gamer API endpoints
        ├── canvas.js       # Canvas API endpoints (+ bot start/stop via dockerode)
        ├── console.js      # Console page
        ├── debug.js        # Debug interface
        └── output.js       # OBS output
```

The `pixel-canvas-bot` is a separate container built from the mini_pixel_canvas source folder (see `CANVAS_SOURCE_HOST`). It has its own `Dockerfile`, `.dockerignore`, and `requirements-container.txt`.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
