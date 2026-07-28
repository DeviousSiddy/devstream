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
- Dual search: "Search Local" (fast, no API) and "Search TGDB" (full API)
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

## Adding a New Module

1. Create route file: `server/routes/{module-name}.js`
2. Create settings page: `public/{module-name}.html`
3. Create store file: `data/{module-name}-overlays.json` (auto-created)
4. Add API routes to `server/routes/api.js` or create separate route file
5. Mount routes in `server/index.js`
6. Add console entry in `server/routes/console.js`
7. Add output rendering in `server/routes/output.js`
8. Document in `docs/MODULES.md`
