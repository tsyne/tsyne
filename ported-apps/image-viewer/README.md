# Image Viewer for Tsyne with REAL Image Editing

An image viewer application ported from [Palexer/image-viewer](https://github.com/Palexer/image-viewer) to Tsyne, featuring **REAL image processing** using Jimp.

## Original Project

This application is based on the Image Viewer originally created by Palexer:
- **Original Repository**: https://github.com/Palexer/image-viewer
- **Original Author**: Palexer
- **Original License**: MIT (see original repository)

## About This Port

This is a Tsyne port of the image viewer application that provides **REAL image editing capabilities**. The original used GIFT (Go Image Filtering Toolkit), which is unmaintained (last commit 7 years ago). This version replaces GIFT with **Jimp** (JavaScript Image Processing), a well-maintained pure JavaScript library with zero native dependencies.

### Why Jimp Instead of GIFT?

- **GIFT**: Unmaintained for 7 years, Go-only
- **Jimp**: Actively maintained (v1.6.0, 2646 dependents), pure JavaScript, zero native dependencies
- **Performance**: Jimp is fast enough for real-time editing in a desktop app
- **Integration**: Works seamlessly with Tsyne's Node.js/TypeScript architecture
- **No Native Dependencies**: Unlike Sharp (requires libvips), Jimp runs anywhere Node.js runs

## Features

This version provides **REAL image editing**:

✅ **Fully Implemented:**
- **Real Image Loading**: Loads actual PNG/JPEG files from disk using Jimp
- **Live Brightness Adjustment**: -100 to +100, with real-time pixel processing
- **Live Contrast Adjustment**: -100 to +100, with real-time pixel processing
- **Live Saturation Adjustment**: -100 to +100, with real-time color modification
- **Live Hue Rotation**: -180° to +180°, with real-time color wheel rotation
- **Real Zoom**: 10% to 400% with actual image resizing (not just scaling)
- **Image Metadata Display**: Real width, height, file size, last modified date
- **Base64 Bridge**: Processed images sent to Go/Fyne for display
- **Instant Updates**: See edits applied immediately

🔄 **How It Works:**
1. TypeScript loads image with Jimp
2. User adjusts brightness/contrast/saturation/hue
3. Jimp processes pixels in real-time
4. Processed image converted to base64 PNG
5. Sent via JSON-RPC to Go bridge
6. Decoded and displayed in Fyne canvas widget

## Architecture

### Image Processing Flow

```
┌─────────────────────┐                     ┌──────────────────┐
│   TypeScript        │                     │   Go Bridge      │
│   (Jimp)            │                     │   (Fyne)         │
├─────────────────────┤                     ├──────────────────┤
│                     │                     │                  │
│ 1. Load PNG/JPEG    │                     │                  │
│    from disk        │                     │                  │
│                     │                     │                  │
│ 2. Jimp Processing: │  Base64 PNG Data   │ 4. Decode base64 │
│    - brightness()   │  ───────────────▶   │    to image.Image│
│    - contrast()     │   (JSON-RPC)        │                  │
│    - color([...])   │                     │ 5. Set to canvas │
│    - resize()       │                     │    widget.Image  │
│                     │                     │                  │
│ 3. getBase64()      │                     │ 6. Refresh()     │
│    to PNG           │                     │    display       │
└─────────────────────┘                     └──────────────────┘
```

### Code Structure

**TypeScript Implementation:**
- `ImageViewer` - Core logic with Jimp image processing
  - `sourceImage` - Original Jimp instance (unmodified)
  - `loadImage(path)` - Load image with Jimp.read()
  - `applyEditsAndDisplay()` - **Real image processing happens here**
  - `setBrightness/Contrast/Saturation/Hue()` - Trigger reprocessing
- `ImageViewerUI` - Tsyne UI implementation
  - Split view layout (70% image, 30% controls)
  - Tabbed side panel (Information, Editor)
  - Toolbar with Open, Reset, Zoom actions

**Go Bridge Extensions:**
- `handleUpdateImage(msg)` - Decodes base64, updates canvas.Image widget
- Base64 data URL parsing
- Thread-safe image updates with `fyne.DoAndWait()`

**Jimp Operations Used:**
```typescript
// Clone source to preserve original
let img = sourceImage.clone();

// Apply edits
img.brightness(value / 100);  // -1 to +1
img.contrast(value / 100);    // -1 to +1
img.color([{ apply: 'saturate', params: [value] }]);
img.color([{ apply: 'hue', params: [degrees] }]);
img.resize({ w: newWidth, h: newHeight });

// Convert to base64 for bridge
const base64 = await img.getBase64('image/png');
```

## UI Structure

```
┌──────────────────────────────────────────────────────────────┐
│ [Open] [Reset Edits] | [Zoom In] [Zoom Out] [Reset]        │ Toolbar
├───────────────────────────────┬──────────────────────────────┤
│                               │ ┌──────────────────────────┐ │
│                               │ │ Information │ Editor    │ │ Tabs
│                               │ └──────────────────────────┘ │
│                               │                              │
│     Actual Rendered Image     │   Image Information:         │
│     (With edits applied)      │   Width: 800px               │ Split
│     (70% width)               │   Height: 600px              │ View
│                               │   Size: 25 KB                │
│                               │   Last modified: ...         │
│                               │                              │
│   - REAL pixels displayed -   │   Brightness: 0   [ - ][ + ] │
│   - Base64 from Jimp -        │   Contrast: 0     [ - ][ + ] │
│                               │   Saturation: 0   [ - ][ + ] │
│                               │   Hue: 0          [ - ][ + ] │
├───────────────────────────────┴──────────────────────────────┤
│ Zoom: 100%                                                   │ Status
└──────────────────────────────────────────────────────────────┘
```

## Usage

```bash
# Install dependencies (Jimp already installed)
npm install

# Build TypeScript
npm run build

# Run the Image Viewer
node dist/examples/image-viewer/image-viewer.js
```

The app will open with a sample image (colorful rectangles). Click:
- **Open**: Load the sample image (hardcoded for demo)
- **Brightness +/-**: Adjust brightness in real-time
- **Contrast +/-**: Adjust contrast in real-time
- **Saturation +/-**: Adjust color saturation in real-time
- **Hue +/-**: Rotate color wheel in real-time
- **Zoom In/Out**: Resize image (10% increments)
- **Reset Edits**: Return all parameters to 0
- **Reset Zoom**: Return to 100%

**Try This:**
1. Click "Open" to load the sample image
2. Click "Brightness +" 3 times → Image gets brighter!
3. Click "Saturation +" 5 times → Colors get more vivid!
4. Click "Hue +" 10 times → Colors shift around the color wheel!
5. Click "Zoom In" 5 times → Image gets larger!
6. Click "Reset Edits" → Back to original colors!

## Comparison: Original GIFT vs. Jimp

| Feature | Original (GIFT) | This Port (Jimp) |
|---------|-----------------|------------------|
| **Load Images** | ✅ PNG, JPEG, GIF | ✅ PNG, JPEG, BMP, TIFF, GIF |
| **Brightness** | ✅ Real pixel modification | ✅ Real pixel modification |
| **Contrast** | ✅ Real pixel modification | ✅ Real pixel modification |
| **Saturation** | ✅ Real HSL adjustment | ✅ Real HSL adjustment |
| **Hue** | ✅ Real color rotation | ✅ Real color rotation |
| **Gamma** | ✅ Supported | ❌ Not in Jimp (rare use) |
| **Grayscale** | ✅ Supported | ✅ Jimp has `.greyscale()` |
| **Sepia** | ✅ Supported | ✅ Jimp has `.sepia()` |
| **Blur** | ✅ Gaussian blur | ✅ Jimp has `.gaussian()` |
| **Resize** | ✅ Supported | ✅ Supported |
| **Rotate/Flip** | ✅ Supported | ✅ Jimp has `.rotate()`, `.flip()` |
| **Save to Disk** | ✅ File I/O | ⚠️ Could add with Node.js fs |
| **Undo/Redo** | ✅ Filter stack | ❌ Not implemented |
| **Maintained** | ❌ 7 years unmaintained | ✅ Active (2024) |
| **Dependencies** | ❌ Go-only | ✅ Zero native deps |

### What's Missing vs. Original?

- **Save functionality**: Could easily add with `image.write(path)`
- **Undo/Redo**: Would need to maintain edit history stack
- **File dialog**: Hardcoded to sample image for demo
- **Gamma correction**: Jimp doesn't have gamma (rare feature)
- **Advanced filters**: Original has color balance, but Jimp has blur, sepia, etc.

## Testing

The original tests have been preserved but need updating for real image operations:

```bash
npm test examples/image-viewer/image-viewer.test.ts
```

Tests verify:
- UI components render
- Buttons are clickable
- Tabs switch correctly
- Edit controls exist

**Future test improvements** could verify:
- Actual pixel values after brightness adjustment
- Image dimensions after zoom
- Metadata accuracy

## Implementation Highlights

### Real Brightness Adjustment

```typescript
// In ImageViewer.setBrightness()
setBrightness(value: number): void {
  this.editParams.brightness = Math.max(-100, Math.min(100, value));
  this.applyEditsAndDisplay();  // ← Triggers REAL processing
}

// In ImageViewer.applyEditsAndDisplay()
private async applyEditsAndDisplay(): Promise<void> {
  let processedImage = this.sourceImage.clone();

  // REAL pixel manipulation with Jimp!
  if (this.editParams.brightness !== 0) {
    processedImage.brightness(this.editParams.brightness / 100);
  }

  // Convert to base64 and send to Fyne
  const base64 = await processedImage.getBase64('image/png');
  await this.imageDisplay.updateImage(base64);
}
```

### Go Bridge Image Update

```go
// In bridge/main.go handleUpdateImage()
func (b *Bridge) handleUpdateImage(msg Message) {
  // Parse data URL: "data:image/png;base64,iVBORw0KG..."
  base64Data := strings.Split(imageData, ",")[1]

  // Decode base64
  imgBytes, _ := base64.StdEncoding.DecodeString(base64Data)

  // Decode to Go image
  decodedImg, _, _ := image.Decode(bytes.NewReader(imgBytes))

  // Update Fyne canvas widget (thread-safe)
  fyne.DoAndWait(func() {
    imgWidget.Image = decodedImg
    imgWidget.Refresh()
  })
}
```

## Future Enhancements

Since we now have real image editing, we could add:

1. **Save Edited Image**:
   ```typescript
   await processedImage.write('./output.png');
   ```

2. **More Filters**:
   ```typescript
   processedImage.greyscale();
   processedImage.sepia();
   processedImage.gaussian(5);  // Blur
   ```

3. **Undo/Redo Stack**:
   ```typescript
   class EditHistory {
     private history: EditParams[] = [];
     private index: number = -1;
     // ... undo/redo logic
   }
   ```

4. **File Dialog** (via Go bridge):
   ```go
   dialog.ShowFileOpen(func(file fyne.URIReadCloser) {
     // Send path to TypeScript
   }, window)
   ```

5. **Batch Processing**:
   ```typescript
   for (const file of files) {
     const img = await Jimp.read(file);
     await img.brightness(0.2).write(`processed/${file}`);
   }
   ```

## Dependencies

- **Jimp** (v1.6.0): Pure JavaScript image processing
  - Zero native dependencies
  - Supports PNG, JPEG, BMP, TIFF, GIF
  - Brightness, contrast, saturation, hue, blur, etc.
- **Tsyne Framework**: TypeScript-to-Fyne bridge
- **Fyne** (v2): Go GUI toolkit

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | `hsplit > border(toolbar + image) + tabs(properties/adjustments)` nesting. Rich multi-panel layout |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 11 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | No significant loop-based widget generation. Image processing loops are data, not UI |
| **State architecture** | Observable store | 3/10 | No Observable store. Image state managed via Jimp library directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 7 `setText()` calls for property/status updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 5/10 | IDs on key controls but limited for an app this size |
| **Design** | Separation of concerns | 6/10 | Image processing via Jimp library provides some separation. File dialogs (`showFileOpen`, `showFileSave`) for persistence |
| | **Overall** | **4/10** | Rich layout structure with `hsplit`/`border`/`tabs` but no Observable store, no reactive bindings, and heavy `setText()` usage |

## Attribution

- **Original Image Viewer**: Palexer
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
- **Jimp Library**: jimp-dev team
- **GIFT Library**: disintegration (used in original, replaced here)

## Credits

This port demonstrates that **REAL image editing is possible in Tsyne** by combining:
- Jimp for JavaScript-side pixel manipulation
- Base64 encoding for bridge transport
- Fyne canvas widgets for display
- Zero native dependencies (pure JS + Go)

While the original GIFT library is unmaintained, Jimp provides an excellent modern alternative that integrates seamlessly with Tsyne's architecture.

**Try it and see real image editing in action!**
