# Pixel Editor for Tsyne

A pixel-based image editor ported from [fyne-io/pixeledit](https://github.com/fyne-io/pixeledit) to Tsyne.

## Original Project

This application is based on the Pixel Editor originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/pixeledit
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## About This Port

This is a Tsyne port of the pixeledit application, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in pure Go using the Fyne GUI toolkit. This version maintains the same conceptual structure but adapts it to Tsyne's declarative API.

### Key Features

- **Main Menu**: File menu with Open, Save, Save As, Reset, and Open Recent submenu
- **File Dialogs**: Native file open/save dialogs via Tsyne
- **Recent Files**: Stores up to 5 recently opened files using preferences
- **Color Picker**: Dialog for choosing foreground color
- **FG Color Preview**: Visual rectangle showing current foreground color
- **Power-of-2 Zoom**: 100%, 200%, 400%, 800%, 1600% (matches original behavior)
- **Tool System**: Pencil and Picker tools
- **Border Layout**: Toolbar (top), Palette (left), Canvas (center), Status (bottom)

### Implementation Status

✅ **Implemented:**
- Main menu with File operations (Open, Save, Save As, Reset, Recent)
- File dialogs (Open, Save As) via `win.showFileOpen()` / `win.showFileSave()`
- Confirm dialog for Reset via `win.showConfirm()`
- Color picker dialog via `win.showColorPicker()`
- FG color preview rectangle using `canvasRectangle`
- Power-of-2 zoom (×2 / ÷2) like original
- Recent files using `app.setPreference()` / `app.getPreference()`
- Tool interface and tools (Pencil, Picker)
- UI layout with Border container
- Status bar with file info

⚠️ **Requires Enhancement:**
- Interactive raster canvas (needs click-to-pixel event handling)
- Actual image file loading/saving (needs bridge enhancement)

## Architecture

The port follows the original's architecture:

```
internal/api/editor.go    → PixelEditor class
internal/api/tool.go      → Tool interface
internal/tool/pencil.go   → PencilTool class
internal/tool/picker.go   → PickerTool class
internal/ui/main.go       → buildUI(), buildMainMenu(), toolbar
internal/ui/palette.go    → buildPalette() with tools & zoom
internal/ui/editor.go     → Editor state management
internal/ui/raster.go     → Canvas area (needs custom widget)
internal/ui/history.go    → Recent files (loadRecent, addRecent)
internal/ui/status.go     → Status bar
main.go                   → Main app entry point
```

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Run the pixel editor
npx ts-node ported-apps/pixeledit/pixeledit.ts
```

## Testing

```bash
# Run all pixeledit tests
npm test ported-apps/pixeledit/pixeledit.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test ported-apps/pixeledit/pixeledit.test.ts

# Run with screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/pixeledit/pixeledit.test.ts
```

## New Features (vs Original Port)

| Feature | Original Port | Current |
|---------|---------------|---------|
| Main Menu | Not present | ✅ File menu with all operations |
| File Dialogs | Hardcoded | ✅ Native dialogs |
| Recent Files | Not present | ✅ Stored in preferences |
| Confirm Dialog | Not present | ✅ For Reset operation |
| Color Picker | Not present | ✅ Dialog for FG color |
| FG Color Preview | Text only | ✅ Visual rectangle |
| Zoom | Linear (+1/-1) | ✅ Power-of-2 (×2/÷2) |

## Future Enhancements

To make this a fully functional pixel editor:

1. **Interactive Raster Canvas**: Add click event handling to CanvasRaster in the Go bridge
2. **Image I/O**: Add image load/save capabilities through the bridge
3. **Additional Tools**: Fill, Line, Rectangle tools
4. **Checkered Background**: Transparency indicator pattern

## Attribution

Original work by the Fyne.io team. Please visit the [original repository](https://github.com/fyne-io/pixeledit) for the full-featured Go implementation.

This Tsyne port demonstrates how Tsyne's expanded API can implement native GUI features like menus, dialogs, and preferences.

## Credits

- **Original Pixeledit**: Fyne.io contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
