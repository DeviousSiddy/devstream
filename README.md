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
- **Archipelago Tracker** - Direct AP protocol tracker connections with row layout and two indicators (tracker link + player presence)

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

### Archipelago Tracker

Track Archipelago multiworld slots directly via the AP protocol (no WebHost polling):
- Connects one tracker per visible slot (tags `["DevStream","Tracker"]`, `items:0`, `slotData:false`)
- Row layout: slot name (large), game (smaller second line), right-aligned checks/percent, status indicators
- Two indicators: colored dot (tracker link + goal state) and optional diamond (player game presence, toggleable)
- Twitch category integration for player/game context
- Per-slot visibility/current selection
- Live preview in settings
- Show player-online indicator toggle (`showPlayer`) in settings and persisted on overlays

See [docs/MODULES.md](docs/MODULES.md) and [docs/API.md](docs/API.md) for details.