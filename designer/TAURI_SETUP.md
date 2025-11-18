# Tauri Fat-App Setup for Tsyne Designer

The Tsyne Designer now supports building as a native desktop application using Tauri!

## What is Tauri?

Tauri is a framework for building tiny, blazingly fast desktop applications with a web frontend. Unlike Electron, Tauri uses the system's native webview and has a smaller bundle size.

## Prerequisites

### System Dependencies

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**Windows:**
- Install Microsoft Visual Studio C++ Build Tools
- Install WebView2 (usually pre-installed on Windows 10/11)

### Rust

Tauri requires Rust to be installed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Running the Designer as a Desktop App

### Development Mode

Start the designer in Tauri dev mode (with hot reload):

```bash
npm run tauri:dev
```

This will:
1. Build the TypeScript code
2. Start the designer server on port 3000
3. Launch the Tauri desktop window

### Production Build

Build a production-ready desktop application:

```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/`.

Bundle formats vary by platform:
- **macOS**: `.app` bundle and `.dmg` installer
- **Linux**: `.deb`, `.AppImage`
- **Windows**: `.msi` installer

## Features

The Tauri version of the designer includes:

- **File System Access**: Read and write Tsyne application files
- **Native Dialogs**: Open/Save file dialogs
- **Smaller Bundle Size**: ~10MB vs Electron's ~100MB+
- **Better Performance**: Uses native webview instead of Chromium
- **Auto-Updates** (when configured)

## Customization

### Application Icon

To set a custom application icon:

1. Create a 512x512 PNG icon
2. Run: `npm run tauri:icon path/to/your-icon.png`
3. This generates all required icon formats automatically

### Window Settings

Edit `tauri.conf.json` to customize:
- Window size and position
- Title bar style
- Fullscreen settings
- Minimum/maximum dimensions

### Permissions

The designer has these permissions enabled:
- **File System**: Read/write access to load and save Tsyne files
- **Dialogs**: Open and save file dialogs
- **Path**: Access to system paths

To modify permissions, edit the `allowlist` section in `tauri.conf.json`.

## Architecture

```
┌─────────────────────────────────────┐
│   Tauri Desktop Window              │
│  ┌───────────────────────────────┐  │
│  │   WebView (System Native)     │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Designer Web UI         │  │  │
│  │  │  (HTML/CSS/JavaScript)   │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕                      │
│  ┌───────────────────────────────┐  │
│  │   Tauri Core (Rust)           │  │
│  │   - File system operations    │  │
│  │   - Native dialogs            │  │
│  │   - System integration        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         ↕
┌─────────────────────────────────────┐
│   Designer Server (Node.js)         │
│   - Code transformations            │
│   - Widget metadata parsing         │
│   - TypeScript AST operations       │
└─────────────────────────────────────┘
```

## Comparison: Web vs Desktop

| Feature | Web Version | Tauri Desktop |
|---------|-------------|---------------|
| Bundle Size | N/A | ~10-15MB |
| File Access | Limited | Full |
| Offline | No | Yes |
| Installation | None | Platform-specific |
| Updates | Automatic | Manual/auto-update |
| Performance | Good | Better (native) |

## Troubleshooting

### Rust not found
```bash
rustc --version  # Check if Rust is installed
source $HOME/.cargo/env  # Load Rust environment
```

### Build fails on Linux
Ensure all webkit2gtk dependencies are installed:
```bash
sudo apt install libwebkit2gtk-4.0-dev
```

### Port 3000 already in use
The designer server runs on port 3000. Change it in `tauri.conf.json`:
```json
{
  "build": {
    "devPath": "http://localhost:YOUR_PORT"
  }
}
```

## Learn More

- [Tauri Documentation](https://tauri.app)
- [Tauri API Reference](https://tauri.app/v1/api/js/)
- [Security Best Practices](https://tauri.app/v1/guides/security)

## License

Same as Tsyne Designer - MIT
