# Modules

DevStream uses a modular architecture where each overlay type is a self-contained module.

## Common Features

All modules share these features:
- **Transparent Background** - Overlays default to transparent for OBS integration
- **Positioning** - X/Y coordinate placement
- **Custom CSS** - "Show CSS" button in settings for advanced styling
- **Start/Stop Control** - Toggle visibility from console
- **Persistence** - Settings saved to JSON files
- **Opacity** - Adjustable transparency (0-100%)
- **Background Color** - Optional background color
- **Text Outline** - Enable/disable with color and width
- **Font Customization** - Family, size, and color

---

## Text Display

**Status:** Complete  
**Settings:** `/text-display`  
**API:** `/api/text/*`

### Features
- Custom text display with configurable styling
- Countdown timer with MM:SS format
- Auto-hide when timer expires
- Text alignment (left, center, right)
- Font customization (family, size, color)
- Text outline (enable/disable, color, width)
- Position control
- Opacity control (0-100%)

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| name | string | "Untitled" | Display name in console |
| text | string | "Hello World" | Text to display |
| duration | number | 30 | Timer duration in seconds |
| fontSize | number | 48 | Font size in pixels |
| fontColor | string | "#ffffff" | Text color (hex) |
| font | string | "Arial" | Font family |
| textAlign | string | "center" | Text alignment |
| backgroundColor | string | "transparent" | Background color |
| position | object | {x: 100, y: 100} | X/Y coordinates |
| showTimer | boolean | true | Show countdown timer |
| outlineEnabled | boolean | false | Enable text outline |
| outlineColor | string | "#000000" | Outline color |
| outlineWidth | number | 2 | Outline width in pixels |
| opacity | number | 1 | Opacity (0-1) |
| customCSS | string | "" | Custom CSS injection |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/text | List all overlays |
| GET | /api/text/:id | Get single overlay |
| POST | /api/text/create | Create new overlay |
| PUT | /api/text/:id | Update overlay |
| DELETE | /api/text/:id | Delete overlay |
| POST | /api/text/:id/start | Start countdown |
| POST | /api/text/:id/stop | Stop/reset overlay |
| GET | /api/text/:id/state | Get current state |
| POST | /api/text/:id/duplicate | Duplicate overlay (numbered name) |

### Timer Implementation
- Server stores `startedAt` timestamp when starting
- Client calculates remaining time: `duration - (Date.now() - startedAt) / 1000`
- Updates every 1000ms via setInterval
- Overlay hidden when remaining <= 0

---

## Scrolling Text

**Status:** Complete  
**Settings:** `/scroll-display`  
**API:** `/api/scroll/*`  
**Complexity:** Medium

### Features
- Multiline text that scrolls right to left
- Configurable scroll speed
- Seamless looping
- Separator between lines
- Randomize line order on each loop
- Opacity control (0-100%)

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| name | string | "Untitled Scroll" | Display name in console |
| lines | array | [] | Array of text items |
| fontSize | number | 36 | Font size in pixels |
| fontColor | string | "#ffffff" | Text color |
| font | string | "Arial" | Font family |
| backgroundColor | string | "transparent" | Background color |
| scrollSpeed | number | 2 | Pixels per frame |
| separator | string | " • " | Separator between lines |
| containerHeight | number | 50 | Height in pixels |
| position | object | {x: 0, y: 0} | X/Y coordinates |
| textAlign | string | "left" | Text alignment |
| outlineEnabled | boolean | false | Enable text outline |
| outlineColor | string | "#000000" | Outline color |
| outlineWidth | number | 2 | Outline width in pixels |
| opacity | number | 1 | Opacity (0-1) |
| randomizeLines | boolean | false | Shuffle lines on each loop |
| customCSS | string | "" | Custom CSS injection |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scroll | List all overlays |
| GET | /api/scroll/:id | Get single overlay |
| POST | /api/scroll/create | Create new overlay |
| PUT | /api/scroll/:id | Update overlay |
| DELETE | /api/scroll/:id | Delete overlay |
| POST | /api/scroll/:id/start | Start scrolling |
| POST | /api/scroll/:id/stop | Stop scrolling |
| GET | /api/scroll/:id/state | Get current state |
| POST | /api/scroll/:id/duplicate | Duplicate overlay (numbered name) |

### Scroll Implementation
- Client-side animation using `requestAnimationFrame`
- Text starts off-screen right, scrolls left
- Resets to right edge when fully scrolled past
- Randomize: lines shuffled client-side on each reset
- Lines stored in `data-lines` attribute for client-side access

---

## God Gamer Challenge

**Status:** Complete  
**Settings:** `/godgamer-display`  
**API:** `/api/godgamer/*`  
**Complexity:** High

### Features
- Track gaming challenge sessions with game cap
- Dual search: "Search Local" (fast, no API), "Search TGDB" (full API), and "Search Twitch" (Helix category DB — great for indie/esports titles TGDB lacks; also pre-wires Twitch category sync so Start Game needs no live search)
- Display-name override per game (e.g. add "League of Legends", display/sync as "Teamfight Tactics")
- Drag-and-drop reordering of upcoming games (started games lock in place); shows on overlay immediately
- Auto Twitch category sync on Start Game **and** on Win/Loss (flips to the next game's category)
- Manual game entry via JSON textarea for uncatalogued games
- Local game database for quick search (saves API calls)
- Boxart/title screen images from TGDB
- Configurable icon size (16-128px) for boxart on overlay
- Player management (defaults to devioussiddy)
- Session history with game results (win/loss)
- Duration tracking for sessions and individual games
- Numbered game list with icons on output overlay
- Session timer on output overlay (freezes on finish)
- Current game pointer with visual indicator
- Finish Session: freezes timers, keeps overlay visible (`isFinished: true`)
- Stop Session: ends session, hides overlay (`isActive: false`)
- Duplicate sessions with auto-incremented names

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| name | string | "God Gamer Session" | Session display name |
| cap | number | 10 | Max games per session |
| fontSize | number | 32 | Font size in pixels |
| fontColor | string | "#ffffff" | Text color |
| font | string | "Arial" | Font family |
| backgroundColor | string | "transparent" | Background color |
| position | object | {x: 100, y: 100} | X/Y coordinates |
| opacity | number | 1 | Opacity (0-1) |
| outlineEnabled | boolean | false | Enable text outline |
| outlineColor | string | "#000000" | Outline color |
| outlineWidth | number | 2 | Outline width in pixels |
| customCSS | string | "" | Custom CSS injection |
| iconSize | number | 32 | Boxart icon size in pixels (16-128) |

### Data Models

**Player:**
```json
{
  "id": "uuid",
  "name": "devioussiddy",
  "createdAt": timestamp
}
```

**Game (Database):**
```json
{
  "id": "uuid",
  "tgdbId": 12345,
  "steamId": "76561198000000000",
  "name": "Game Name",
  "platform": "PC",
  "boxartUrl": "https://cdn.thegamesdb.net/images/medium/...",
  "playCount": 5,
  "createdAt": timestamp
}
```

**Session:**
```json
{
  "id": "uuid",
  "playerIds": ["uuid1", "uuid2"],
  "playerNames": ["devioussiddy", "player2"],
  "cap": 10,
  "games": [
    {
      "id": "uuid",
      "tgdbId": 12345,
      "name": "Game Name",
      "platform": "PC",
      "steamId": "76561198000000000",
      "boxartUrl": "url",
      "result": "win|loss",
      "startedAt": timestamp,
      "endedAt": timestamp,
      "duration": 120
    }
  ],
  "currentGameIndex": 0,
  "isActive": false,
  "startedAt": null,
  "endedAt": null,
  "createdAt": timestamp
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/godgamer/search?q= | Search games on TGDB |
| GET | /api/godgamer/game/:tgdbId | Get game details from TGDB |
| GET | /api/godgamer/games | List local game database |
| DELETE | /api/godgamer/games/:id | Delete game from database |
| GET | /api/godgamer/players | List players |
| POST | /api/godgamer/players | Create player |
| DELETE | /api/godgamer/players/:id | Delete player |
| GET | /api/godgamer/sessions | List all sessions |
| POST | /api/godgamer/sessions | Create new session |
| GET | /api/godgamer/sessions/:id | Get session |
| PUT | /api/godgamer/sessions/:id | Update session settings |
| DELETE | /api/godgamer/sessions/:id | Delete session |
| POST | /api/godgamer/sessions/:id/start | Start session timer |
| POST | /api/godgamer/sessions/:id/stop | Stop session (hide overlay) |
| POST | /api/godgamer/sessions/:id/finish | Finish session (freeze timers, keep visible) |
| POST | /api/godgamer/sessions/:id/duplicate | Duplicate session (numbered name) |
| POST | /api/godgamer/sessions/:id/games | Add game to session |
| DELETE | /api/godgamer/sessions/:id/games/:gameId | Remove game from session |
| POST | /api/godgamer/sessions/:id/games/current/start | Start current game |
| POST | /api/godgamer/sessions/:id/games/current/end | End current game (win/loss) |
| GET | /api/godgamer/sessions/:id/state | Get session state |

### Environment Variables

| Variable | Description |
|----------|-------------|
| TGDB_API_KEY | TheGamesDB API key (stored in .env) |

---

## Canvas Overlay

**Status:** Complete  
**Settings:** `/canvas-display`  
**API:** `/api/canvas/*`  
**Complexity:** Medium

### Features
- Displays a live pixel-art canvas (32x32 default) as an OBS overlay
- Pixel state and palette served from a mounted source folder (written by the mini_pixel_canvas bot)
- Pixel change animation: red blink + author tag with source prefix ([D]/[YT]/[T])
- Hover a pixel to show the author that placed it
- Click the canvas to enlarge it (configurable size and position)
- Optional instruction text (e.g. how to place pixels) shown above the canvas
- Opacity fades to the configured value 5s after a pixel change
- Bottom/left origin positioning (matches the original canvas layout)
- Configurable state/palette file names, grid size, display size, and title
- **YouTube Chat Link** setting: feeds the active link to the pixel canvas bot (which scrapes YouTube live chat with Selenium) — never rendered on the overlay
- Standard overlay features: opacity, custom CSS, start/stop, duplicate

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| name | string | "Untitled Canvas" | Display name in console |
| stateFile | string | "canvas_state.json" | Pixel state file in the source folder |
| paletteFile | string | "pallette.json" | Color palette file in the source folder |
| gridWidth | number | 32 | Grid width in pixels |
| gridHeight | number | 32 | Grid height in pixels |
| displaySize | number | 300 | Canvas display size in px |
| enlargedSize | number | 900 | Canvas size when enlarged (px) |
| position | object | {x: 1600, y: 300} | X (left) / Y (from bottom) in px |
| enlargedPosition | object | {x: 500, y: 50} | Position when enlarged (left / from bottom) in px |
| opacity | number | 0.5 | Opacity (0-1) |
| showTitle | boolean | false | Show title above canvas |
| titleText | string | "Mini Pixel Canvas" | Title text |
| showInstruction | boolean | true | Show interaction instructions above the canvas |
| instructionText | string | "Mini Pixel Canvas 32x32\n!pixel x,y,## (5 sec cooldown)\n## = 2 digits (00-63) for color" | Interaction instructions |
| enlargeOnClick | boolean | true | Click canvas to enlarge |
| youtubeChatLink | string | "" | YouTube live chat link for the pixel bot (not shown on overlay) |
| customCSS | string | "" | Custom CSS injection |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/canvas | List all canvases |
| GET | /api/canvas/:id | Get single canvas |
| POST | /api/canvas/create | Create new canvas |
| PUT | /api/canvas/:id | Update canvas |
| DELETE | /api/canvas/:id | Delete canvas |
| POST | /api/canvas/:id/start | Show canvas on output |
| POST | /api/canvas/:id/stop | Hide canvas |
| GET | /api/canvas/:id/state | Get current config |
| GET | /api/canvas/:id/pixels | Get pixel state (from stateFile) |
| GET | /api/canvas/:id/palette | Get color palette (from paletteFile) |
| GET | /api/canvas/preview/pixels?file= | Preview pixel state by file name |
| GET | /api/canvas/preview/palette?file= | Preview palette by file name |
| POST | /api/canvas/:id/duplicate | Duplicate canvas (numbered name) |
| GET | /api/canvas/bot/status | Bot container status ({available, running}) |
| POST | /api/canvas/bot/start | Start the pixel-canvas-bot container |
| POST | /api/canvas/bot/stop | Stop the pixel-canvas-bot container |

### Environment Variables

| Variable | Description |
|----------|-------------|
| CANVAS_SOURCE_DIR | Folder mounted into the container with canvas_state.json / pallette.json |
| CANVAS_SOURCE_HOST | Host path to the mini_pixel_canvas folder (compose interpolation) |
| DEVSTREAM_DATA_DIR | Host path to DevStream's data folder (used by the pixel bot) |
| DEVSTREAM_ENV_FILE | Path to the shared DevStream .env (used by the pixel bot) |
| DOCKER_SOCKET | Path to the Docker socket DevStream uses to control the bot (default /var/run/docker.sock) |
| BOT_CONTAINER_NAME | Container name DevStream controls for start/stop (default pixel-canvas-bot) |

### Data Source
- The mini_pixel_canvas Python bot writes `canvas_state.json`/`pallette.json` into its own folder
- That folder is volume-mounted into the container as `CANVAS_SOURCE_DIR`
- DevStream serves the files via `/api/canvas/:id/pixels` and `/api/canvas/:id/palette`
- The bot reads its credentials from `py/bot/OAUTH.txt` (falling back to env vars) and the active canvas' YouTube chat link from `data/canvas-overlays.json`
- **Bot control:** DevStream talks to the Docker socket (mounted at `/var/run/docker.sock`) to `start`/`stop` the `pixel-canvas-bot` container via dockerode; the console and canvas settings pages expose Start/Stop buttons.

---

## Adding a New Module

1. Create route file: `server/routes/{module-name}.js`
2. Create settings page: `public/{module-name}.html`
3. Create store file: `data/{module-name}-overlays.json` (auto-created)
4. Add API routes to `server/routes/api.js` or create separate route file
5. Mount routes in `server/index.js`
6. Add console entry in `server/routes/console.js`
7. Add output rendering in `server/routes/output.js`
8. Document in `docs/MODULES.md`
