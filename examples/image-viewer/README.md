# Image Viewer for Tsyne

An image viewer application ported from [Palexer/image-viewer](https://github.com/Palexer/image-viewer) to Tsyne.

## Original Project

This application is based on the Image Viewer originally created by Palexer:
- **Original Repository**: https://github.com/Palexer/image-viewer
- **Original Author**: Palexer
- **Original License**: MIT (see original repository)

## About This Port

This is a Tsyne port of the image viewer application, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in Go using the Fyne GUI toolkit with the GIFT (Go Image Filtering Toolkit) library for advanced image editing. This version maintains the UI structure and basic image editing interface adapted to Tsyne's declarative API.

## Features

The image viewer provides:
- **Image Display**: Central viewing area for loaded images
- **Information Panel**: Shows image metadata (width, height, size, last modified)
- **Edit Controls**: Brightness, Contrast, Saturation, and Hue adjustments
- **Zoom Controls**: Zoom in, zoom out, and reset zoom (10% increments, 10%-400% range)
- **Toolbar**: Quick access to Open, Reset Edits, and zoom operations
- **Tabbed Interface**: Information tab and Editor tab in side panel
- **Status Bar**: Displays current zoom level

### Current Implementation Status

This is a **simplified demonstration port** that shows the UI structure:

✅ **Implemented:**
- Complete UI layout with split view (70% image area, 30% side panel)
- Tabbed interface (Information tab, Editor tab)
- Image metadata display interface
- Edit parameter controls (brightness, contrast, saturation, hue)
- Zoom level management (10%-400% with 10% increments)
- Toolbar with all action buttons
- Generation tracking for edit parameters
- Status bar with zoom display
- Full test suite (14 tests)

⚠️ **Simplified from Original:**
- Simulated image loading (original has file dialog and actual image I/O)
- No actual image rendering (original displays real images)
- No actual image editing (original uses GIFT library for real-time editing)
- Edit controls update labels but don't modify pixels (original applies filters)
- No save/export functionality (original can save edited images)
- No undo/redo stack (original has full edit history)

The original uses the GIFT (Go Image Filtering Toolkit) library for sophisticated image manipulation with brightness, contrast, saturation, hue, gamma, and other filters. To fully replicate this in Tsyne, a custom image rendering widget and GIFT integration would need to be added to the Go bridge.

## Architecture

The port follows the original's architecture:

```
main.go         → Main app entry point
ui.go           → UI layout (toolbar, split view, tabs)
img.go          → Image management and editing
```

**TypeScript Implementation:**
- `ImageInfo` - Interface for image metadata
- `EditParams` - Interface for editing parameters (brightness, contrast, saturation, hue)
- `ImageViewer` - Core image viewer logic with state management
- `ImageViewerUI` - Tsyne UI implementation with split view and tabs
- `createImageViewerApp()` - Application factory function

## UI Structure

```
┌─────────────────────────────────────────────────────────┐
│ [Open] [Reset Edits] | [Zoom In] [Zoom Out] [Reset]   │ Toolbar
├──────────────────────────────┬──────────────────────────┤
│                              │ ┌─────────────────────┐  │
│                              │ │ Information│ Editor │  │ Tabs
│                              │ └─────────────────────┘  │
│                              │                          │
│      Image Display Area      │   Image Information:     │
│      (70% width)             │   Width: 1920px          │ Split View
│                              │   Height: 1080px         │
│                              │   Size: 2400 KB          │
│                              │   Last modified: ...     │
│                              │                          │
│                              │   (or Edit Controls)     │
├──────────────────────────────┴──────────────────────────┤
│ Zoom: 100%                                              │ Status Bar
└─────────────────────────────────────────────────────────┘
```

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the Image Viewer
node dist/examples/image-viewer/image-viewer.js
```

## Controls

### Toolbar
- **Open**: Load an image (simulated - loads sample metadata)
- **Reset Edits**: Reset all editing parameters to 0
- **Zoom In**: Increase zoom by 10% (up to 400%)
- **Zoom Out**: Decrease zoom by 10% (down to 10%)
- **Reset Zoom**: Return to 100% zoom

### Information Tab
Displays image metadata:
- Width (in pixels)
- Height (in pixels)
- File size (in KB)
- Last modified date/time

### Editor Tab
Editing controls with +/- buttons:
- **Brightness**: -100 to +100 (±10 per click)
- **Contrast**: -100 to +100 (±10 per click)
- **Saturation**: -100 to +100 (±10 per click)
- **Hue**: -180 to +180 (±10 per click)

## Testing

```bash
# Run tests
npm test examples/image-viewer/image-viewer.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test examples/image-viewer/image-viewer.test.ts
```

**Test Coverage (14 tests):**
- ✓ Initial UI display with toolbar buttons
- ✓ Initial image area ("No image loaded" message)
- ✓ Information tab display and metadata fields
- ✓ Editor tab display and controls
- ✓ All edit control buttons (brightness, contrast, saturation, hue)
- ✓ Zoom status display
- ✓ Zoom in operation (100% → 110%)
- ✓ Zoom out operation (110% → 100%)
- ✓ Reset zoom operation (multiple zooms → 100%)
- ✓ Brightness adjustment (0 → 10)
- ✓ Contrast adjustment (0 → -10)
- ✓ Open image operation (metadata population)
- ✓ Reset edits operation (parameters → 0)
- ✓ UI preservation after multiple operations

All tests use proper TsyneTest assertions:
```typescript
await ctx.expect(ctx.getByText('Open')).toBeVisible();
await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();
```

## Implementation Details

### ImageViewer Class
- Image metadata storage (width, height, size, modified date)
- Edit parameters state (brightness, contrast, saturation, hue)
- Zoom level management (10%-400%)
- Widget registration for UI updates
- Update callbacks for state changes
- Parameter validation and clamping

### ImageViewerUI Class
- HSplit layout (70% image, 30% side panel)
- Toolbar construction with action items
- Tabbed side panel (Information, Editor)
- Scroll container for image area
- Edit control builders with increment/decrement
- Status bar with zoom display

### State Management
- ImageViewer maintains all state
- UI widgets registered with viewer
- Callback-based updates when state changes
- Async widget updates via setText()

## Comparison with Original

### Original Features (Palexer/image-viewer)
- Full image I/O with file dialogs
- Real-time image rendering on canvas
- GIFT library integration for actual pixel manipulation
- Support for multiple image formats (PNG, JPEG, etc.)
- Save edited images to disk
- Undo/redo functionality
- Advanced filters (gamma, blur, sharpen, etc.)
- Interactive canvas with pan/zoom
- Thumbnail preview
- Batch processing support

### This Port's Focus
- UI structure demonstration
- State management patterns
- Edit parameter interface
- Zoom control logic
- Tabbed interface layout
- Toolbar action handling
- Test coverage for UI interactions

## Future Enhancements

To make this a fully functional image viewer/editor, the following would be needed:

1. **Image Rendering**:
   - Custom canvas widget in Go bridge
   - Image loading from file system
   - Display actual image pixels
   - Support for common formats (PNG, JPEG, GIF)

2. **Real Editing**:
   - Integrate GIFT library or similar
   - Apply brightness/contrast/saturation/hue adjustments
   - Real-time preview of edits
   - Undo/redo stack implementation

3. **File Operations**:
   - Open file dialog
   - Save/Save As functionality
   - Export to different formats
   - Recent files list

4. **Advanced Features**:
   - Crop tool
   - Rotate/flip operations
   - Color adjustment curves
   - Filters and effects
   - Batch editing support

5. **Interactive Canvas**:
   - Click to pan
   - Scroll to zoom
   - Keyboard shortcuts
   - Touch gesture support

## Attribution

- **Original Image Viewer**: Palexer
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
- **GIFT Library**: disintegration (used in original)

## Credits

This port is based on Palexer's excellent image viewer application. Please visit the [original repository](https://github.com/Palexer/image-viewer) for the full-featured Go implementation with actual image editing capabilities using the GIFT library.

This Tsyne port is provided as a demonstration of image viewer UI patterns and state management in Tsyne applications.
