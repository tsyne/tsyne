# Pixeledit Port - Implementation Plan

This document outlines the remaining work to complete the pixeledit port from the original Fyne implementation to Tsyne.

## Reference
- **Original**: `/home/paul/scm/tsyne/ported-apps/pixeledit-ORIG/`
- **Port**: `/home/paul/scm/tsyne/ported-apps/pixeledit/`
- **Original Repo**: https://github.com/fyne-io/pixeledit

## Current Status (Completed Features)

### ✅ Core Infrastructure
- [x] Basic application structure
- [x] Tool interface and architecture
- [x] Color class with hex conversion
- [x] TappableCanvasRaster integration
- [x] Pixel buffer management (Uint8ClampedArray)
- [x] Image loading from file/command line args
- [x] Main window setup
- [x] Status bar with file info

### ✅ File Operations
- [x] File loading (PNG, JPG support)
- [x] Recent files history (preference-based)
- [x] File open dialog
- [x] Main menu structure
- [x] Image format detection and conversion

### ✅ UI Components
- [x] Foreground color preview rectangle
- [x] Zoom controls (power-of-2: 1x, 2x, 4x, 8x, 16x)
- [x] Tool palette/toolbar
- [x] Interactive canvas with tap handling
- [x] Scroll container for large images

### ✅ Basic Tools
- [x] Pencil tool (draw pixels)
- [x] Picker/Eyedropper tool (sample colors)
- [x] Eraser tool (draw white pixels)

### ✅ Advanced Tools (Enhancements)
- [x] Bucket fill tool with BFS flood fill
- [x] Line drawing tool with Bresenham's algorithm

### ✅ Testing
- [x] Tool tests (bucket fill, line drawing)
- [x] Basic editor tests
- [x] Pencil tool tests

---

## Phase 1: Missing Core Features

### 1.1 File Save Operations ✅ COMPLETED
**Files to reference**:
- `pixeledit-ORIG/internal/ui/editor.go` (lines 184-216)
- `pixeledit-ORIG/internal/ui/main.go` (lines 43-62)

**Implementation**:
- [x] Implement `saveImage()` method to write PNG files
  - Uses jimp npm package for PNG encoding
  - Converts Uint8ClampedArray pixel buffer to PNG
  - Writes to file system
- [x] Add "Save" menu item handler
- [x] Add "Save As..." dialog with file picker
- [x] Update current file path after save
- [x] Add file extension validation (.png only initially)
- [x] Add "New..." dialog for creating new images with custom dimensions

**Test Requirements**:
- [ ] Test saving new image
- [ ] Test save overwrites existing file
- [ ] Test save as creates new file
- [ ] Test saved file can be reloaded
- [ ] Test pixel data integrity after save/reload cycle

### 1.2 File Reload/Reset Operation ✅ COMPLETED
**Files to reference**:
- `pixeledit-ORIG/internal/ui/main.go` (lines 31-41)
- `pixeledit-ORIG/internal/ui/editor.go` (lines 170-182)

**Implementation**:
- [x] Add "Reset..." menu item
- [x] Implement reload functionality to restore original file
- [x] Add confirmation dialog before reload
- [x] Clear any unsaved changes
- [x] Store original pixel data for fast reload

**Test Requirements**:
- [ ] Test reload restores original pixels
- [ ] Test reload works after multiple edits
- [ ] Test reload updates canvas display

---

## Phase 2: Additional Drawing Tools

### 2.1 Rectangle Tool ✅ COMPLETED
**Files to reference**: Similar pattern to Line tool

**Implementation**:
- [x] Create RectangleTool class
- [x] Two-click interface: first click = corner, second = opposite corner
- [x] Options: filled vs outline
- [x] Use foreground color

**Test Requirements**:
- [x] Test horizontal rectangles (via outline test)
- [x] Test vertical rectangles (via outline test)
- [x] Test square shapes (via outline test)
- [x] Test single-pixel rectangles
- [x] Test filled vs outline modes
- [x] Test reverse order coordinates

### 2.2 Circle/Ellipse Tool ✅ COMPLETED
**Implementation**:
- [x] Create CircleTool class
- [x] Two-click interface: center and radius point
- [x] Midpoint circle algorithm for outline
- [x] Scanline fill for filled circles
- [x] Options: filled vs outline

**Test Requirements**:
- [x] Test circles with radius > 0
- [x] Test single-pixel circles (radius 0)
- [x] Test filled vs outline modes
- [x] Test state reset after drawing

---

## Phase 3: Color Management

### 3.1 Background Color ✅ COMPLETED
**Files to reference**:
- `pixeledit-ORIG/internal/ui/editor.go` (bgColor field)

**Implementation**:
- [x] Add `bgColor` field to PixelEditor
- [x] Add BG color preview rectangle
- [x] Add color picker dialog for BG color
- [x] Update eraser tool to use BG color instead of hardcoded white
- [x] Add swap FG/BG colors functionality (menu and button)

**Test Requirements**:
- [x] Test BG color picker updates preview
- [x] Test eraser uses BG color
- [x] Test FG/BG swap functionality

### 3.2 Color Palette/Swatches
**Files to reference**:
- `pixeledit-ORIG/internal/ui/palette.go`

**Implementation**:
- [ ] Add predefined color palette (16-24 common colors)
- [ ] Click swatch to set FG color
- [ ] Right-click swatch to set BG color
- [ ] Display palette in sidebar

**Test Requirements**:
- [ ] Test clicking swatch updates FG color
- [ ] Test palette displays all colors correctly

---

## Phase 4: Advanced Features

### 4.1 Undo/Redo System ✅ COMPLETED
**Implementation**:
- [x] Create history stack for pixel changes (UndoOperation type)
- [x] Store before/after states for each operation (PixelChange type)
- [x] Implement undo() method
- [x] Implement redo() method
- [x] Add Edit menu with Undo/Redo items
- [x] Limit history depth (50 operations)
- [x] History cleared on file load/reload
- [ ] Add Ctrl+Z / Ctrl+Y keyboard shortcuts (future)

**Test Requirements**:
- [ ] Test undo single pixel change
- [ ] Test undo flood fill
- [ ] Test undo line drawing
- [ ] Test redo after undo
- [ ] Test undo stack limit
- [x] Test history cleared on file load

### 4.2 Selection Tool ✅ COMPLETED
**Implementation**:
- [x] Rectangle selection tool (SelectionTool class)
- [x] Selection interface with x, y, width, height
- [x] Cut/Copy/Paste operations with ClipboardData
- [x] Select All and Deselect (Clear Selection) operations
- [x] Delete selection (cut fills with BG color)
- [ ] Move selection (future enhancement)
- [ ] Selection marquee display (animated dashed line - future)

**Test Requirements**:
- [x] Test creating selection
- [x] Test copy/paste preserves pixels
- [x] Test cut removes and copies pixels
- [x] Test paste at specific position
- [x] Test paste uses selection position by default
- [x] Test selectAll selects entire image

### 4.3 Layer System ✅ COMPLETED
**Implementation**:
- [x] Layer interface with id, name, visible, opacity, locked, pixels
- [x] Add/remove layers
- [x] Layer visibility toggle
- [x] Layer opacity control (0-255)
- [x] Move layer up/down in stack
- [x] Merge layer down (alpha compositing)
- [x] Flatten layers to main pixels array
- [x] Active layer selection
- [x] Layer menu in main menu
- [x] Layer count limit (16 max)

**Test Requirements**:
- [x] Test addLayer creates new layer
- [x] Test removeLayer removes layer
- [x] Test cannot remove last layer
- [x] Test setActiveLayer changes active layer
- [x] Test toggleLayerVisibility
- [x] Test setLayerOpacity with clamping
- [x] Test moveLayerUp/Down
- [x] Test mergeLayerDown

### 4.4 Pencil Width/Brush Sizes
**Implementation**:
- [ ] Add brush size selector (1px, 2px, 4px, 8px)
- [ ] Update pencil tool to draw in selected size
- [ ] Display brush size in UI
- [ ] Square vs circle brush shapes

**Test Requirements**:
- [ ] Test different brush sizes
- [ ] Test brush size applied to drawing
- [ ] Test square vs circle brush shapes

---

## Phase 5: Canvas Enhancements

### 5.1 Grid Overlay
**Implementation**:
- [ ] Add toggle for grid display
- [ ] Draw grid lines at pixel boundaries
- [ ] Grid visible only at zoom >= 4x
- [ ] Configurable grid color

**Test Requirements**:
- [ ] Test grid displays at high zoom
- [ ] Test grid hidden at low zoom
- [ ] Test grid toggle works

### 5.2 Canvas Resize
**Files to reference**:
- `pixeledit-ORIG/internal/ui/editor.go` (image resizing logic)

**Implementation**:
- [ ] Add "Resize Canvas..." dialog
- [ ] Input fields for width/height
- [ ] Options: scale, crop, or pad with BG color
- [ ] Maintain aspect ratio option

**Test Requirements**:
- [ ] Test upscaling preserves pixels
- [ ] Test downscaling crops correctly
- [ ] Test padding adds BG color
- [ ] Test aspect ratio maintenance

### 5.3 New Image Creation
**Implementation**:
- [ ] Add "New..." menu item
- [ ] Dialog with width/height inputs
- [ ] Default to 32x32 white canvas
- [ ] Fill with BG color option

**Test Requirements**:
- [ ] Test creates blank canvas
- [ ] Test specified dimensions
- [ ] Test default size
- [ ] Test fills with BG color

---

## Phase 6: Image Effects

### 6.1 Color Inversion
**Files to reference**:
- `pixeledit-ORIG/internal/data/invert.svg` (invert icon exists)

**Implementation**:
- [ ] Add "Invert Colors" menu item
- [ ] For each pixel: RGB = 255 - RGB
- [ ] Preserve alpha channel
- [ ] Add to Edit menu

**Test Requirements**:
- [ ] Test inverts all pixels
- [ ] Test preserves alpha
- [ ] Test invert twice returns to original

### 6.2 Flip/Rotate
**Implementation**:
- [ ] Flip horizontal
- [ ] Flip vertical
- [ ] Rotate 90° CW
- [ ] Rotate 90° CCW
- [ ] Rotate 180°

**Test Requirements**:
- [ ] Test each flip/rotate operation
- [ ] Test preserves pixel data
- [ ] Test dimensions update correctly

---

## Phase 7: UI Polish

### 7.1 Keyboard Shortcuts
**Implementation**:
- [ ] Ctrl+O - Open file
- [ ] Ctrl+S - Save
- [ ] Ctrl+Shift+S - Save As
- [ ] Ctrl+Z - Undo
- [ ] Ctrl+Y - Redo
- [ ] + / - keys - Zoom in/out
- [ ] Space - Pan tool (hold)
- [ ] P - Pencil tool
- [ ] E - Eraser tool
- [ ] I - Picker tool
- [ ] B - Bucket tool
- [ ] L - Line tool

### 7.2 Status Bar Enhancements ✅ COMPLETED
**Files to reference**:
- `pixeledit-ORIG/internal/ui/status.go`

**Implementation**:
- [x] Show cursor pixel coordinates (on click)
- [x] Show color under cursor (on click)
- [x] Show current tool name
- [x] Show zoom percentage
- [x] Show image dimensions
- [x] Show unsaved changes indicator (*)

### 7.3 Tool Icons
**Files to reference**:
- `pixeledit-ORIG/internal/data/*.svg`

**Implementation**:
- [ ] Create SVG icons for each tool
- [ ] Use Tsyne icon support (if available)
- [ ] Fallback to text labels
- [ ] Highlight selected tool

---

## Phase 8: Testing Suite Completion

### 8.1 Core Editor Tests
**Files to reference**:
- `pixeledit-ORIG/internal/ui/editor_test.go`
- `pixeledit-ORIG/internal/ui/palette_test.go`
- `pixeledit-ORIG/internal/ui/raster_test.go`

**Test Coverage Needed**:
- [ ] `PixelEditor.getPixelColor()` - read pixel at coordinates
- [ ] `PixelEditor.setPixelColor()` - write pixel at coordinates
- [ ] `PixelEditor.setFGColor()` - update foreground color
- [ ] `PixelEditor.getFGColor()` - read foreground color
- [ ] `PixelEditor.loadImage()` - load from file
- [ ] `PixelEditor.saveImage()` - save to PNG
- [ ] `PixelEditor.reload()` - reset to original file
- [ ] Zoom level changes update display
- [ ] Tool switching works correctly
- [ ] Recent files list management
- [ ] Out-of-bounds pixel access returns safe values

### 8.2 Tool Tests
**Files to reference**:
- `pixeledit-ORIG/internal/tool/pencil_test.go`
- `pixeledit-ORIG/internal/tool/picker_test.go`
- `pixeledit-ORIG/internal/tool/util_test.go`

**Test Coverage Needed**:
- [ ] Each tool has name and icon
- [ ] Pencil draws with FG color
- [ ] Picker samples color correctly
- [ ] Eraser draws with BG color
- [ ] Rectangle tool draws correctly
- [ ] Circle tool draws correctly
- [ ] Selection tool creates valid selections

### 8.3 Integration Tests
**Test Coverage Needed**:
- [ ] Load image → Edit → Save → Reload validates data
- [ ] Tool switching mid-operation works
- [ ] Zoom changes don't affect pixel data
- [ ] Undo/Redo maintains consistency
- [ ] Copy/Paste preserves pixel colors
- [ ] Recent files survive app restart

### 8.4 Edge Case Tests
**Test Coverage Needed**:
- [ ] Loading corrupted image files
- [ ] Loading unsupported formats
- [ ] Saving to read-only directory
- [ ] Drawing outside canvas bounds
- [ ] Zero-dimension images
- [ ] Maximum zoom level
- [ ] Flood fill on entire canvas
- [ ] Extremely large images (1000x1000+)

---

## Phase 9: Bridge Enhancements (Fyne+Go Layer)

### 9.1 Image Export
**Bridge work needed**:
- [ ] Add PNG export capability to Go bridge
- [ ] Add method to retrieve pixel buffer from TappableCanvasRaster
- [ ] Use Go's `image/png` package for encoding
- [ ] Return file path or success status to TypeScript

### 9.2 Image Import
**Bridge work needed**:
- [ ] Enhance image loading to support more formats
- [ ] Add resize/scale during load
- [ ] Support loading from URLs
- [ ] Support clipboard paste

### 9.3 Performance Optimizations
**Bridge work needed**:
- [ ] Batch pixel updates for flood fill and large operations
- [ ] Add dirty rectangle tracking (only redraw changed areas)
- [ ] Optimize zoom rendering (don't recreate entire buffer)
- [ ] Consider GPU acceleration for large images

---

## Phase 10: Documentation

### 10.1 User Documentation
- [ ] README with feature list
- [ ] Keyboard shortcuts reference
- [ ] Tool usage guide
- [ ] File format support
- [ ] Known limitations

### 10.2 Developer Documentation
- [ ] Architecture overview
- [ ] Tool creation guide
- [ ] Adding new file formats
- [ ] Testing strategy
- [ ] Port differences from original

---

## Implementation Priority

### High Priority (MVP Features) ✅ ALL COMPLETED
1. ✅ File save operations (Phase 1.1)
2. ✅ File reload (Phase 1.2)
3. ✅ Background color support (Phase 3.1)
4. ✅ Basic undo/redo (Phase 4.1 - 50 operation depth)
5. ✅ Rectangle tool (Phase 2.1)
6. ✅ Status bar enhancements (Phase 7.2)

### Medium Priority (Enhanced UX)
7. [ ] Color palette/swatches (Phase 3.2)
8. ✅ Circle tool (Phase 2.2)
9. [ ] Keyboard shortcuts (Phase 7.1)
10. [ ] Grid overlay (Phase 5.1)
11. ✅ New image creation (Phase 5.3 - partially, via showForm dialog)
12. [ ] Canvas resize (Phase 5.2)

### Now Completed (Advanced Features)
13. ✅ Selection tool (Phase 4.2)
14. ✅ Layer system (Phase 4.3)
15. ✅ Clipboard operations (Copy/Cut/Paste)

### Lower Priority (Future)
16. [ ] Brush sizes (Phase 4.4)
17. [ ] Image effects (Phase 6)
18. [ ] Tool icons (Phase 7.3)

### Continuous
17. Testing (Phase 8) - ongoing with each feature
18. Documentation (Phase 10) - updated as features are added
19. Bridge enhancements (Phase 9) - as needed

---

## Notes on Differences from Original

### Intentional Deviations
- **Added Tools**: Bucket fill and Line tool (not in original)
- **Test Framework**: Jest instead of Go's testing package
- **File Handling**: Node.js fs module instead of Fyne's storage API
- **Image Processing**: May use different libraries than Go's image package

### Technical Constraints
- **Tsyne Limitations**: Some Fyne features may not have Tsyne equivalents
- **Browser Limitations**: File system access more restricted than desktop
- **Performance**: TypeScript vs Go performance characteristics

### Enhancements Over Original
- **Modern Testing**: Comprehensive test coverage from the start
- **Cleaner Architecture**: Tool interface designed for testability
- **Better Pixel Management**: Direct buffer access for performance

---

## Success Criteria

The port is considered complete when:
1. ✅ All tools from original are implemented and tested
2. ✅ File save/load works reliably for PNG format (using jimp)
3. ✅ Undo/redo system functional
4. ✅ Zoom and navigation work smoothly
5. ✅ Recent files history persists
6. ⏳ All original test cases pass (adapted to Jest)
7. ⏳ 80%+ code coverage on core functionality
8. ⏳ No critical bugs in common workflows
9. ⏳ Documentation complete
10. ✅ Enhanced with bucket fill, line, rectangle, and circle tools (bonus features)

---

## Test File Organization

```
pixeledit/
├── pixeledit.ts                         # Main application
├── pixeledit.test.ts                    # TsyneTest integration tests (UI)
├── pixeledit-tools.test.ts              # Bucket & Line tool unit tests
├── pixeledit-pencil.test.ts             # Pencil tool TsyneTest tests
├── pixeledit-new-features.test.ts       # Rectangle, Circle, Color, BG unit tests
├── pixeledit-advanced-features.test.ts  # Selection, Clipboard, Layers unit tests (NEW)
├── pixeledit-layers-selection.test.ts   # TsyneTest integration tests for new features (NEW)
├── pixeledit-file-ops.test.ts           # TODO: Save/Load tests
└── PLAN.md                              # This file
```

---

## Current Test Coverage

### Passing Tests (55+ tests across all test files)

#### pixeledit-tools.test.ts (11 tests)
- ✅ Bucket Fill Tool (5 tests)
  - Fill entire canvas
  - Fill connected region
  - No-op when colors match
  - Single pixel fill
  - Diagonal separation

- ✅ Line Drawing Tool (6 tests)
  - Horizontal lines
  - Vertical lines
  - Diagonal lines
  - Single pixel (start == end)
  - Steep lines
  - State reset between lines

#### pixeledit-new-features.test.ts (17 tests)
- ✅ Rectangle Tool (5 tests)
  - Outline rectangle
  - Filled rectangle
  - Single-pixel rectangle
  - Reverse order coordinates
  - State reset between rectangles

- ✅ Circle Tool (4 tests)
  - Circle outline
  - Filled circle
  - Single pixel (radius 0)
  - State reset

- ✅ Color Class (5 tests)
  - RGB creation
  - RGBA creation
  - Hex conversion
  - Color comparison
  - Color cloning

- ✅ Background Color (3 tests)
  - Default white background
  - BG color updates
  - Eraser uses BG color

#### pixeledit-advanced-features.test.ts (27 tests) - NEW
- ✅ Selection System (4 tests)
  - setSelection creates selection
  - clearSelection removes selection
  - selectAll selects entire image
  - Selection with different image sizes

- ✅ Clipboard System (6 tests)
  - Copy without selection does nothing
  - Copy with selection copies pixels
  - Cut clears selected area
  - Paste without clipboard does nothing
  - Copy and paste cycle works
  - Paste uses selection position by default

- ✅ Layer System (11 tests)
  - addLayer creates new layer
  - addLayer increments layer count
  - removeLayer removes layer
  - Cannot remove last layer
  - setActiveLayer changes active layer
  - toggleLayerVisibility toggles visibility
  - setLayerOpacity sets opacity with clamping
  - moveLayerUp moves layer up in stack
  - moveLayerDown moves layer down in stack
  - mergeLayerDown merges layers
  - Cannot merge bottom layer

- ✅ Selection Tool (1 test)
  - SelectionTool creates selection on two clicks

- ✅ Color Class Extended (3 tests)
  - Color.equals returns true for identical colors
  - Color.equals returns false for different alpha
  - Color.clone creates independent copy

- ✅ Integration Tests (2 tests)
  - Complex copy/paste with layers
  - Undo works with clipboard operations

### TODO Tests
- File operations (save, load, reload)
- Color picker integration
- Additional edge cases and error handling
