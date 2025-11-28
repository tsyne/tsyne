# Pixel Editor for Tsyne

A pixel-based image editor ported from [fyne-io/pixeledit](https://github.com/fyne-io/pixeledit) to Tsyne.

## Original Project

This application is based on the Pixel Editor originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/pixeledit
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## About This Port

This is a Tsyne port of the pixeledit application, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in pure Go using the Fyne GUI toolkit. This version maintains the same conceptual structure but adapts it to Tsyne's declarative API.

### Key Features (from original)

- Pixel-level image editing
- Tool system (Pencil, Color Picker)
- Zoom controls (1x - 16x)
- Color palette
- File operations (Open, Save, Reset)

### Current Implementation Status

This is a **simplified demonstration port** that shows the architecture and structure:

✅ **Implemented:**
- Tool interface and basic tools (Pencil, Picker)
- UI layout with Border container (toolbar, palette, canvas, status)
- Zoom controls
- Color management
- File operation hooks

⚠️ **Requires Enhancement:**
- Interactive raster canvas (currently placeholder)
- Actual pixel manipulation UI
- File dialog integration
- Image file I/O operations

The original pixeledit uses Fyne's custom raster widgets for pixel-level manipulation. To fully replicate this functionality in Tsyne, a custom raster widget would need to be added to the Go bridge.

## Architecture

The port follows the original's architecture:

```
internal/api/editor.go    → PixelEditor class
internal/api/tool.go      → Tool interface
internal/tool/pencil.go   → PencilTool class
internal/tool/picker.go   → PickerTool class
internal/ui/main.go       → buildUI() and toolbar
internal/ui/palette.go    → buildPalette() with tools & zoom
internal/ui/editor.go     → Editor state management
internal/ui/raster.go     → Canvas area (needs custom widget)
main.go                   → Main app entry point
```

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the pixel editor
node examples/pixeledit/pixeledit.js
```

## Attribution

Original work by the Fyne.io team. Please visit the [original repository](https://github.com/fyne-io/pixeledit) for the full-featured Go implementation.

This Tsyne port is provided as a demonstration and starting point for pixel editing functionality in Tsyne applications.

## Future Enhancements

To make this a fully functional pixel editor, the following enhancements would be needed:

1. **Custom Raster Widget**: Add a custom raster canvas widget to the Go bridge that supports:
   - Pixel-level click detection
   - Image data updates
   - Zoom rendering
   - Checkered background pattern

2. **File Operations**: Integrate with Fyne's file dialogs through the bridge:
   - File open dialog
   - File save dialog
   - Recent files menu

3. **Additional Tools**: Port more tools from the original:
   - Fill tool
   - Line tool
   - Rectangle tool
   - Color inversion

4. **Canvas Enhancements**:
   - Grid overlay
   - Undo/redo history
   - Multiple layer support

## Credits

- **Original Pixeledit**: Fyne.io contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
