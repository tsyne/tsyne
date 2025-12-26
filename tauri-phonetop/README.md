# Tauri Phonetop

Phonetop packaged as a Tauri desktop application with web-based rendering.

**Created:** 26 Dec 2025

## Architecture

```
┌─────────────────────────────────────┐
│  Tauri Window (WebView)             │
│  ┌───────────────────────────────┐  │
│  │  Web Renderer (HTML/CSS/JS)   │  │
│  │  - Receives widget commands   │  │
│  │  - Renders DOM elements       │  │
│  │  - Sends events back          │  │
│  └──────────────┬────────────────┘  │
└─────────────────│───────────────────┘
                  │ WebSocket (ws://localhost:9876)
                  │
┌─────────────────▼───────────────────┐
│  Node.js Backend                    │
│  ┌───────────────────────────────┐  │
│  │  phonetop.ts                  │  │
│  │  (TSYNE_BRIDGE_MODE=web-renderer)│
│  └──────────────┬────────────────┘  │
│                 │                   │
│  ┌──────────────▼────────────────┐  │
│  │  WebRendererBridge            │  │
│  │  (core/src/webrendererbridge.ts) │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Files

- `dist/` - Static web frontend
  - `index.html` - Main HTML page
  - `styles.css` - Fyne-like CSS styling
  - `renderer.js` - Widget rendering JavaScript
- `src-tauri/` - Tauri/Rust backend
- `launcher.js` - Development launcher
- `run-phonetop.sh` - Production run script

## Building

```bash
# Install dependencies
npm install
cd ../core && npm install ws @types/ws

# Build Tauri bundles
npx tauri build
```

## Output

After building:
- `src-tauri/target/release/bundle/deb/Phonetop_1.0.0_amd64.deb` (2.8 MB)
- `src-tauri/target/release/bundle/appimage/Phonetop_1.0.0_amd64.AppImage` (79 MB)

## Running

### Development mode
```bash
./run-phonetop.sh --dev
```

### With AppImage
```bash
./run-phonetop.sh --appimage
```

### Manual
```bash
# Terminal 1: Start backend
cd /home/paul/scm/tsyne
TSYNE_BRIDGE_MODE=web-renderer npx tsx phone-apps/phonetop.ts

# Terminal 2: Start Tauri frontend
cd tauri-phonetop
npx tauri dev
```

## How it Works

1. **phonetop.ts** runs with `TSYNE_BRIDGE_MODE=web-renderer`
2. **WebRendererBridge** starts a WebSocket server on port 9876
3. **Tauri window** loads `dist/index.html`
4. **renderer.js** connects to WebSocket and receives widget commands
5. Widgets are rendered as HTML elements styled with CSS
6. User events (clicks, input) are sent back to phonetop.ts

## Widget Mapping

| Tsyne Widget | HTML Element |
|--------------|--------------|
| vbox | `<div class="tsyne-vbox">` |
| hbox | `<div class="tsyne-hbox">` |
| button | `<button class="tsyne-button">` |
| label | `<span class="tsyne-label">` |
| entry | `<input class="tsyne-entry">` |
| scroll | `<div class="tsyne-scroll">` |
| grid | `<div class="tsyne-grid">` |
| separator | `<div class="tsyne-separator">` |
| image | `<img class="tsyne-image">` |

## Notes

- The Tauri app is just the renderer; the phonetop logic runs in Node.js
- For a fully standalone app, phonetop.ts would need to be bundled or use Tauri sidecars
- Current implementation requires Node.js + npm on the system

## TODO

- Bundle Node.js as a Tauri sidecar for standalone distribution
- Complete widget implementations in renderer.js
- Add theme switching support
- Test on Samsung Galaxy J5-2017 (Android)
- Test on iPhone SE (2020) (iOS via Capacitor?)
