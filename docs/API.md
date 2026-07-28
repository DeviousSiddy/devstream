# API Documentation

Base URL: `http://localhost:3000`

## Text Display API

### Create Overlay

```http
POST /api/text/create
Content-Type: application/json
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | "Untitled" | Display name |
| `text` | string | "Hello World" | Text content |
| `duration` | number | 30 | Timer duration in seconds |
| `fontSize` | number | 48 | Font size in pixels |
| `fontColor` | string | "#ffffff" | Text color (hex) |
| `backgroundColor` | string | "transparent" | Background color or "transparent" |
| `position` | object | {x: 100, y: 100} | {x, y} coordinates |
| `showTimer` | boolean | true | Show countdown timer |
| `font` | string | "Arial" | Font family |
| `textAlign` | string | "center" | Text alignment: left, center, right |
| `outlineEnabled` | boolean | false | Enable text outline |
| `outlineColor` | string | "#000000" | Outline color (hex) |
| `outlineWidth` | number | 2 | Outline width in pixels |
| `opacity` | number | 1 | Opacity (0-1) |
| `customCSS` | string | "" | Custom CSS injection |

**Response:**

```json
{
  "id": "uuid",
  "name": "My Overlay",
  "text": "Hello World",
  "duration": 30,
  "fontSize": 48,
  "fontColor": "#ffffff",
  "backgroundColor": "transparent",
  "position": { "x": 100, "y": 100 },
  "showTimer": true,
  "font": "Arial",
  "textAlign": "center",
  "outlineEnabled": false,
  "outlineColor": "#000000",
  "outlineWidth": 2,
  "opacity": 1,
  "customCSS": "",
  "isActive": false,
  "startedAt": null
}
```

---

### Get All Overlays

```http
GET /api/text
```

**Response:** Array of overlay objects

---

### Get Overlay

```http
GET /api/text/:id
```

**Response:** Single overlay object

---

### Update Overlay

```http
PUT /api/text/:id
Content-Type: application/json
```

**Request Body:** Partial overlay object (only fields to update)

**Response:** Updated overlay object

---

### Delete Overlay

```http
DELETE /api/text/:id
```

**Response:**

```json
{ "success": true }
```

---

### Start Overlay

```http
POST /api/text/:id/start
```

Sets `isActive: true` and `startedAt: Date.now()`

**Response:** Updated overlay object

---

### Stop Overlay

```http
POST /api/text/:id/stop
```

Sets `isActive: false` and `startedAt: null`

**Response:** Updated overlay object

---

### Get Overlay State

```http
GET /api/text/:id/state
```

Returns current state including timer calculations.

**Response:** Overlay object with current state

---

### Duplicate Overlay

```http
POST /api/text/:id/duplicate
```

Creates a copy with an auto-incremented name (e.g., "My Overlay" -> "My Overlay 2"). Sets `isActive: false` and `startedAt: null` on the copy.

**Response:** New overlay object

---

## Scrolling Text API

### Create Overlay

```http
POST /api/scroll/create
Content-Type: application/json
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | "Untitled Scroll" | Display name |
| `lines` | array | [] | Array of text strings |
| `fontSize` | number | 36 | Font size in pixels |
| `fontColor` | string | "#ffffff" | Text color (hex) |
| `backgroundColor` | string | "transparent" | Background color |
| `scrollSpeed` | number | 2 | Pixels per frame |
| `separator` | string | " • " | Separator between lines |
| `containerHeight` | number | 50 | Height in pixels |
| `position` | object | {x: 0, y: 0} | {x, y} coordinates |
| `textAlign` | string | "left" | Text alignment: left, center, right |
| `font` | string | "Arial" | Font family |
| `outlineEnabled` | boolean | false | Enable text outline |
| `outlineColor` | string | "#000000" | Outline color (hex) |
| `outlineWidth` | number | 2 | Outline width in pixels |
| `opacity` | number | 1 | Opacity (0-1) |
| `randomizeLines` | boolean | false | Shuffle lines on each loop |
| `customCSS` | string | "" | Custom CSS injection |

**Response:**

```json
{
  "id": "uuid",
  "name": "My Scroll",
  "lines": ["Line 1", "Line 2", "Line 3"],
  "fontSize": 36,
  "fontColor": "#ffffff",
  "backgroundColor": "transparent",
  "scrollSpeed": 2,
  "separator": " • ",
  "containerHeight": 50,
  "position": { "x": 0, "y": 0 },
  "textAlign": "left",
  "font": "Arial",
  "outlineEnabled": false,
  "outlineColor": "#000000",
  "outlineWidth": 2,
  "opacity": 1,
  "randomizeLines": false,
  "customCSS": "",
  "isActive": false
}
```

---

### Get All Overlays

```http
GET /api/scroll
```

**Response:** Array of overlay objects

---

### Get Overlay

```http
GET /api/scroll/:id
```

**Response:** Single overlay object

---

### Update Overlay

```http
PUT /api/scroll/:id
Content-Type: application/json
```

**Request Body:** Partial overlay object (only fields to update)

**Response:** Updated overlay object

---

### Delete Overlay

```http
DELETE /api/scroll/:id
```

**Response:**

```json
{ "success": true }
```

---

### Start Overlay

```http
POST /api/scroll/:id/start
```

Sets `isActive: true`

**Response:** Updated overlay object

---

### Stop Overlay

```http
POST /api/scroll/:id/stop
```

Sets `isActive: false`

**Response:** Updated overlay object

---

### Get Overlay State

```http
GET /api/scroll/:id/state
```

Returns current state.

**Response:** Overlay object with current state

---

### Duplicate Overlay

```http
POST /api/scroll/:id/duplicate
```

Creates a copy with an auto-incremented name (e.g., "My Scroll" -> "My Scroll 2"). Sets `isActive: false` and `startedAt: null` on the copy.

**Response:** New overlay object

---

## God Gamer Challenge API

### Search Games on TGDB

```http
GET /api/godgamer/search?q=game+name
```

Search for games on TheGamesDB.

**Response:** Array of game objects with tgdbId, name, platform, boxartUrl

---

### Get Game Details

```http
GET /api/godgamer/game/:tgdbId
```

Get detailed game information from TGDB.

**Response:** Game object with tgdbId, name, platform, steamId, boxartUrl, overview

---

### List Local Game Database

```http
GET /api/godgamer/games
```

**Response:** Array of games stored locally

---

### Delete Game from Database

```http
DELETE /api/godgamer/games/:id
```

**Response:** `{ "success": true }`

---

### List Players

```http
GET /api/godgamer/players
```

**Response:** Array of player objects

---

### Create Player

```http
POST /api/godgamer/players
Content-Type: application/json
```

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Player name |

**Response:** Player object (returns existing if name matches)

---

### Delete Player

```http
DELETE /api/godgamer/players/:id
```

**Response:** `{ "success": true }`

---

### Create Session

```http
POST /api/godgamer/sessions
Content-Type: application/json
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | "God Gamer Session" | Session name |
| `cap` | number | 10 | Max games |
| `players` | array | ["devioussiddy"] | Player names |
| `fontSize` | number | 32 | Font size |
| `fontColor` | string | "#ffffff" | Font color |
| `font` | string | "Arial" | Font family |
| `backgroundColor` | string | "transparent" | Background |
| `position` | object | {x: 100, y: 100} | Position |
| `opacity` | number | 1 | Opacity (0-1) |
| `outlineEnabled` | boolean | false | Text outline |
| `outlineColor` | string | "#000000" | Outline color |
| `outlineWidth` | number | 2 | Outline width |
| `customCSS` | string | "" | Custom CSS |

**Response:** Session object

---

### Get All Sessions

```http
GET /api/godgamer/sessions
```

**Response:** Array of session objects

---

### Get Session

```http
GET /api/godgamer/sessions/:id
```

**Response:** Session object

---

### Update Session

```http
PUT /api/godgamer/sessions/:id
Content-Type: application/json
```

**Request Body:** Partial session object (fields to update)

**Response:** Updated session object

---

### Delete Session

```http
DELETE /api/godgamer/sessions/:id
```

**Response:** `{ "success": true }`

---

### Start Session

```http
POST /api/godgamer/sessions/:id/start
```

Sets `isActive: true` and `startedAt: Date.now()`

**Response:** Updated session object

---

### Stop Session

```http
POST /api/godgamer/sessions/:id/stop
```

Sets `isActive: false` and `endedAt: Date.now()`. Session data remains but overlay is hidden.

**Response:** Updated session object

---

### Finish Session

```http
POST /api/godgamer/sessions/:id/finish
```

Freezes timers by setting `isFinished: true` and `endedAt: Date.now()`. Also freezes the current game's timer if it was running. Unlike stop, the overlay remains visible with frozen times.

**Response:** Updated session object

---

### Add Game to Session

```http
POST /api/godgamer/sessions/:id/games
Content-Type: application/json
```

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `tgdbId` | number | TGDB game ID |
| `name` | string | Game name |
| `platform` | string | Platform |
| `steamId` | string | Steam ID (optional) |
| `boxartUrl` | string | Boxart URL (optional) |

**Response:** Updated session object

---

### Remove Game from Session

```http
DELETE /api/godgamer/sessions/:id/games/:gameId
```

**Response:** Updated session object

---

### Start Current Game

```http
POST /api/godgamer/sessions/:id/games/current/start
```

Sets `startedAt: Date.now()` on current game.

**Response:** Updated session object

---

### End Current Game

```http
POST /api/godgamer/sessions/:id/games/current/end
Content-Type: application/json
```

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `result` | string | "win" or "loss" |

**Response:** Updated session object

---

### Get Session State

```http
GET /api/godgamer/sessions/:id/state
```

**Response:** Session object with current state

---

### Duplicate Session

```http
POST /api/godgamer/sessions/:id/duplicate
```

Creates a copy with an auto-incremented name (e.g., "God Gamer Session" -> "God Gamer Session 2"). Resets games (clears results/timing), `currentGameIndex: 0`, `isActive: false`, `isFinished: false`.

**Response:** New session object

---

## Output Endpoints

### Output Page (OBS Browser Source)

```http
GET /output
```

Returns HTML page with active overlays and timer JavaScript.

---

### Output Render (AJAX)

```http
GET /output/render
```

Returns rendered HTML of active overlays only.

---

## Console Endpoints

### Console Page

```http
GET /console
```

Returns console HTML page for managing overlays.

---

### Console Render (AJAX)

```http
GET /console/render
```

Returns JSON with `textRows`, `scrollRows`, and `godgamerSessions` for auto-refresh.

---

## Debug Endpoint

### Debug Page

```http
GET /debug
```

Returns debug interface with quick actions and custom request builder.
