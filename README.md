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

## Quick Start

### Using Docker Compose

```bash
docker-compose up -d
```

### Using Docker

```bash
docker build -t devstream .
docker run -d -p 3000:3000 -v ./data:/app/data --name devstream devstream
```

### Running Locally

```bash
npm install
npm start
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Console | `/console` | Main control panel for managing overlays |
| Text Settings | `/text-display?id=<id>` | Configure text display overlay |
| Scroll Settings | `/scroll-display?id=<id>` | Configure scrolling text overlay |
| Output | `/output` | Browser source URL for OBS |
| Debug | `/debug` | Debug and testing interface |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

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
POST /api/text/create    # Create overlay
POST /api/text/:id/start # Start countdown
POST /api/text/:id/stop  # Stop overlay
PUT /api/text/:id        # Update overlay
DELETE /api/text/:id     # Delete overlay
GET /api/text/:id        # Get overlay
GET /api/text            # Get all overlays

# Scrolling Text API
POST /api/scroll/create    # Create overlay
POST /api/scroll/:id/start # Start scrolling
POST /api/scroll/:id/stop  # Stop overlay
PUT /api/scroll/:id        # Update overlay
DELETE /api/scroll/:id     # Delete overlay
GET /api/scroll/:id        # Get overlay
GET /api/scroll            # Get all overlays
```

## Project Structure

```
devstream/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── data/                   # Runtime data (gitignored)
├── docs/                   # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── MODULES.md
├── public/
│   ├── text-display.html   # Text settings page
│   └── scroll-display.html # Scroll settings page
└── server/
    ├── index.js            # Express server
    ├── store.js            # JSON file persistence
    └── routes/
        ├── api.js          # Text API endpoints
        ├── scroll.js       # Scroll API endpoints
        ├── console.js      # Console page
        ├── debug.js        # Debug interface
        └── output.js       # OBS output
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
