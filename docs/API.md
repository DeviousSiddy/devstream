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

Returns JSON with `textRows` and `scrollRows` for auto-refresh.

---

## Debug Endpoint

### Debug Page

```http
GET /debug
```

Returns debug interface with quick actions and custom request builder.
