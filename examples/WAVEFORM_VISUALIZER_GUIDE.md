# Waveform Visualizer - Demo Guide

This package includes **three ways** to run the waveform visualizer, each demonstrating different Tsyne patterns.

## Quick Start

Run any of these commands to launch the demos:

### 1. Canvas Mode Demo (Recommended First)
```bash
npx tsx examples/waveform-visualizer-canvas.ts
```

**What it demonstrates:**
- `tappableCanvasRaster` - Interactive pixel-based rendering
- `setPixelBuffer()` - Efficient full-canvas updates with Uint8Array
- Tap-to-seek: Click anywhere on waveform to jump to that position
- Coordinate conversion: pixels → audio position (time)
- Canvas rendering optimization for large waveforms

**UI Features:**
- 🟢 Green waveform visualization
- ⚫ Gray center line (zero amplitude)
- 🟡 Yellow scrubber line (current playback position)
- ⏸️ Play/Pause/Stop buttons
- 📍 Time position display

**Performance:**
- Efficient: One `setPixelBuffer()` call per frame
- Smooth: ~30 FPS animation
- Scalable: Works well with 1000+ pixel widths

---

### 2. Widget Mode Demo (Most Idiomatic)
```bash
npx tsx examples/waveform-visualizer-widget.ts
```

**What it demonstrates:**
- Pseudo-declarative UI composition
- Each waveform slice as a TypeScript widget element (`vbox` with dynamic height)
- Declarative visibility with `.when()`
- Pure Tsyne composition pattern - no pixel-level code
- Scrollable container for large visualizations

**UI Features:**
- 📊 Each vertical bar is a widget (vbox)
- Dynamic height based on waveform amplitude
- Can be styled, animated, or clicked (future enhancement)
- Demonstrates idiomatic Tsyne approach

**Use Cases:**
- When you want fully interactive per-slice elements
- When you need to apply Tsyne styling/theming
- When accessibility is important
- When you want to add click handlers to individual slices

---

### 3. Dual-Mode App (Choose at Runtime)
```bash
npx tsx examples/waveform-visualizer.ts
```

**Default:** Canvas mode (efficient)

**To switch to widget mode:**
Edit `examples/waveform-visualizer.ts`, line ~605:
```typescript
export function buildWaveformVisualizer(a: App) {
  // buildCanvasWaveformVisualizer(a);  ← Comment out
  buildDeclarativeWaveformVisualizer(a);  ← Uncomment
}
```

---

## Architecture Comparison

| Aspect | Canvas Mode | Widget Mode |
|--------|------------|------------|
| **Rendering** | Pixel buffer (Uint8Array) | UI widgets (vbox) |
| **Performance** | ⚡ Excellent | Good |
| **Scalability** | Handles 1000+ slices | Best with <100 slices |
| **Interactivity** | Tap entire canvas to seek | Per-slice potential |
| **Styling** | Manual color values | Tsyne theming support |
| **Accessibility** | Canvas-level only | Widget-level support |
| **Code Idioms** | Pixel manipulation | Declarative composition |
| **Use Case** | Audio players, DAWs | Exploratory visualizers |

---

## Key Code Patterns

### Canvas Mode: Interactive Tapping
```typescript
// Make entire waveform tappable
waveformCanvas = a.tappableCanvasRaster(width, height, {
  onTap: (x: number) => handleCanvasTap(x),
}).withId('waveformCanvas');

// Convert pixel position to audio time
async function handleCanvasTap(x: number) {
  const progress = Math.max(0, Math.min(1, x / canvasWidth));
  playbackPosition = progress * waveformData.duration;

  if (isPlaying) {
    startTime = Date.now() - playbackPosition * 1000;
  }

  updateTimeLabels();
  await drawWaveform();
}
```

### Widget Mode: Declarative Slices
```typescript
// Each slice is a TypeScript widget
a.hbox(() => {
  for (const slice of slices) {
    const heightPercent = Math.min(100, slice.peak * 300);

    // Vbox grows/shrinks based on amplitude
    const sliceWidget = a
      .vbox(() => {
        // Top spacer centers the bar
        a.spacer().when(() => heightPercent < 100);

        // The bar (empty label)
        a.label('');
      })
      .withId(`slice-${slice.index}`);

    sliceElements.set(slice.index, sliceWidget);
  }
});
```

### Canvas Mode: Pixel Rendering
```typescript
// Create pixel buffer (Uint8Array)
const buffer = new Uint8Array(width * height * 4);  // RGBA

// Draw waveform
for (let x = 0; x < slices.length; x++) {
  const peak = slices[x].peak * (height / 2 - 5);
  const topY = Math.max(0, centerY - peak);
  const bottomY = Math.min(height - 1, centerY + peak);

  for (let y = topY; y <= bottomY; y++) {
    const idx = (y * width + x) * 4;
    buffer[idx] = 0;        // R
    buffer[idx + 1] = 200;  // G
    buffer[idx + 2] = 100;  // B
    buffer[idx + 3] = 255;  // A
  }
}

// Single efficient update
await waveformCanvas.setPixelBuffer(buffer);
```

---

## Testing Each Mode

### Canvas Mode Tests
```bash
npm test -- examples/waveform-visualizer.test.ts -t "Canvas"
```

### Widget Mode Tests
```bash
npm test -- examples/waveform-visualizer.test.ts -t "Widget"
```

### All Tests
```bash
npm test -- examples/waveform-visualizer.test.ts
```

---

## Audio Source

Both demos use a synthetic waveform that simulates:
- **Kick drum** (60 Hz): Low-frequency bass punch
- **Tom** (150 Hz): Mid-frequency percussion
- **Hi-hat** (8000 Hz): High-frequency cymbals
- **Envelope**: Beat-synced amplitude variation

The synthetic audio is **8 seconds** long for testing.

---

## Customization

### Change Canvas Resolution
In `waveform-visualizer-canvas.ts`, line ~156-157:
```typescript
const canvasWidth = 960;   // Change to any width
const canvasHeight = 200;  // Change to any height
```

### Change Number of Slices
In both files, line ~163 (canvas) or ~164 (widget):
```typescript
slices = AudioProcessor.downsampleWaveform(waveformData, 64);  // 64 slices
```

### Use Real Audio File
Replace the synthetic waveform by modifying `AudioProcessor.fetchAndDecodeAudio()`:
```typescript
// Fetch from Pixabay or local file
const buffer = await decodeMP3(url);  // Your MP3 decoder
return { samples: new Float32Array(buffer), sampleRate: 44100, duration: 8 };
```

---

## Performance Tips

**Canvas Mode:**
- Use `setPixelBuffer()` not `setPixels()` for full canvas
- Batch updates: redraw only if playback position changed
- Downsample aggressively (aim for 2-4x canvas width for samples)

**Widget Mode:**
- Keep slice count < 100 (widget overhead is higher)
- Use `.when()` for conditional visibility
- Consider virtual scrolling for very large waveforms

---

## Architecture Highlights

### WaveformSlice Interface
```typescript
interface WaveformSlice {
  index: number;      // Position in array
  peak: number;       // Max amplitude (0-1)
  rms: number;        // RMS for alternative visualization
  position: number;   // Time in seconds
}
```

### AudioProcessor
- `createSyntheticWaveform()` - Generate test audio
- `downsampleWaveform()` - Reduce samples for display
- `fetchAndDecodeAudio()` - Load from URL (extensible)

### State Management
- `playbackPosition` - Current time in seconds
- `isPlaying` - Boolean playback state
- `startTime` - Base timestamp for elapsed calculation
- `animationFrameId` - For cleanup

---

## Next Steps

1. **Try Canvas Mode first** - See efficient pixel rendering
2. **Try Widget Mode second** - See idiomatic Tsyne composition
3. **Understand the difference** - Read code side-by-side
4. **Extend either approach**:
   - Add per-slice click handlers (widget mode)
   - Add frequency-domain visualization (canvas mode)
   - Implement drag-to-scrub (both modes)
   - Add zoom/pan controls (both modes)

---

## File Organization

```
examples/
├── waveform-visualizer.ts           # Dual-mode (choose at export)
├── waveform-visualizer-canvas.ts   # Canvas mode only
├── waveform-visualizer-widget.ts   # Widget mode only
├── waveform-visualizer.test.ts     # Comprehensive test suite
└── WAVEFORM_VISUALIZER_GUIDE.md   # This file
```

All three demo files are standalone and can be run independently with `npx tsx`.
