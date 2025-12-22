# 🎨 Waveform Visualizer - Interactive Audio Visualization for Tsyne

A multi-mode audio waveform visualizer demonstrating two idiomatic Tsyne composition patterns:
1. **Canvas Mode** - Efficient pixel rendering with interactive scrubbing
2. **Widget Mode** - Pure pseudo-declarative composition with dynamic slices

## 📁 Directory Structure

```
waveform-visualizer/
├── README.md                    # This file
├── index.ts                     # Dual-mode app (choose at export)
├── index.test.ts                # Tests for dual-mode
├── canvas.ts                    # Canvas mode demo (standalone)
├── canvas.test.ts               # Canvas mode tests (35+ cases)
├── widget.ts                    # Widget mode demo (standalone)
├── widget.test.ts               # Widget mode tests (35+ cases)
├── screenshots.test.ts          # Screenshot generation script
└── screenshots/                 # Generated screenshots
    ├── canvas-mode.png          # Canvas mode capture
    └── widget-mode.png          # Widget mode capture
```

## 🚀 Quick Start

### Canvas Mode Demo (Recommended First)
```bash
npx tsx examples/waveform-visualizer/canvas.ts
```

**Shows:**
- ⚡ Optimized pixel rendering (`tappableCanvasRaster`)
- 🎯 **Tap/click anywhere on waveform to seek** to that position
- 🟢 Green waveform + 🟡 Yellow scrubber line
- High performance (~30 FPS, handles 1000+ slices)

### Widget Mode Demo (Most Idiomatic Tsyne)
```bash
npx tsx examples/waveform-visualizer/widget.ts
```

**Shows:**
- 📊 Each waveform slice is a TypeScript `vbox` widget
- 🎨 Pure pseudo-declarative Tsyne composition
- Scrollable container with dynamic heights
- Demonstrates "the Tsyne way" of building UIs

### Dual-Mode App
```bash
npx tsx examples/waveform-visualizer/index.ts
```

**Default:** Canvas mode

**To switch to widget mode:** Edit line ~605 in `index.ts`

---

## 🎬 Visual Comparison

### Canvas Mode Screenshot
Canvas-based rendering with tappable scrubber:
- Efficient pixel-level rendering
- Interactive coordinate conversion (pixels → time)
- Smooth playback with yellow scrubber line
- Status: "Ready - tap waveform to seek"

**File:** `screenshots/canvas-mode.png`

### Widget Mode Screenshot
Declarative widget composition with dynamic slices:
- Each waveform slice is a vbox widget element
- Scrollable container for visualization
- Pure Tsyne pseudo-declarative approach
- Status: "Ready to play"

**File:** `screenshots/widget-mode.png`

---

## 📸 Generate Screenshots

To generate or refresh screenshots from the tests:

```bash
# Generate both screenshots
TAKE_SCREENSHOTS=1 npm test -- examples/waveform-visualizer/screenshots.test.ts

# Or generate individually
TAKE_SCREENSHOTS=1 npm test -- examples/waveform-visualizer/canvas.test.ts -t "screenshot"
TAKE_SCREENSHOTS=1 npm test -- examples/waveform-visualizer/widget.test.ts -t "screenshot"
```

Screenshots are saved to `examples/waveform-visualizer/screenshots/`

---

## 🎯 Architecture Comparison

| Aspect | Canvas Mode | Widget Mode |
|--------|------------|------------|
| **Rendering** | Pixel buffer (Uint8Array) | UI widgets (vbox) |
| **Interaction** | Tap entire canvas to seek | Static display (future: per-slice) |
| **Performance** | ⚡ Excellent | ✅ Good |
| **Scalability** | 1000+ slices | <100 slices optimal |
| **Styling** | Manual color values | Tsyne theming support |
| **Accessibility** | Canvas-level only | Widget-level support |
| **Idiom** | Pixel-level | Declarative composition |
| **Best For** | Audio players, DAWs | Exploratory visualizers |

---

## 🎯 Key Code Patterns

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

## 🧪 Testing

### Run Canvas Mode Tests
```bash
npm test -- examples/waveform-visualizer/canvas.test.ts
```

**Coverage:** 35+ tests
- Initialization and UI structure
- Interactive scrubbing (tap to seek)
- Play/pause/stop controls
- Time display and formatting
- Integration workflows
- Edge cases

### Run Widget Mode Tests
```bash
npm test -- examples/waveform-visualizer/widget.test.ts
```

**Coverage:** 35+ tests
- Initialization with widget composition
- Dynamic slice generation
- Playback and state tracking
- Play/pause/stop controls
- Time display
- Integration workflows
- Edge cases

### Run All Waveform Tests
```bash
npm test -- examples/waveform-visualizer/
```

**Total:** 140+ test cases across all variants

---

## 🎮 User Interactions

### Canvas Mode
1. Hit **▶ Play** to start playback
2. Yellow scrubber line moves through waveform
3. **Click/tap anywhere** on waveform to seek to that position
4. Hit **⏸ Pause** to freeze playback
5. Hit **⏹ Stop** to reset to beginning

### Widget Mode
1. Hit **▶ Play** to start playback
2. Watch vertical bars as "audio" plays
3. Hit **⏸ Pause** to freeze
4. Hit **⏹ Stop** to reset to beginning

Both modes support:
- Multiple play/pause cycles
- Pause and resume from same position
- Time display (MM:SS format)
- Complete workflow: load → play → pause → resume → stop

---

## 🎵 Audio Source

Both demos use **synthetic waveform** simulating:
- **Kick drum** (60 Hz): Low-frequency bass punch
- **Tom** (150 Hz): Mid-frequency percussion
- **Hi-hat** (8000 Hz): High-frequency cymbals
- **Envelope**: Beat-synced amplitude variation

**Duration:** 8 seconds (suitable for testing)

---

## 🛠️ Customization

### Change Canvas Resolution
In `canvas.ts`, line ~156-157:
```typescript
const canvasWidth = 960;   // Adjust to any width
const canvasHeight = 200;  // Adjust to any height
```

### Change Number of Slices
In both `canvas.ts` and `widget.ts`, line ~163-164:
```typescript
slices = AudioProcessor.downsampleWaveform(waveformData, 64);  // 64 slices
// Widget mode uses fewer (48) for performance
```

### Use Real Audio File
Modify `AudioProcessor.fetchAndDecodeAudio()`:
```typescript
// Fetch from URL or local file
const buffer = await decodeMP3(url);  // Your decoder
return {
  samples: new Float32Array(buffer),
  sampleRate: 44100,
  duration: calculateDuration(buffer)
};
```

### Change Colors
In `canvas.ts` `drawWaveform()`:
```typescript
const waveColor = { r: 0, g: 200, b: 100, a: 255 };   // Green
const scrubberColor = { r: 255, g: 255, b: 0, a: 255 };  // Yellow
const lineColor = { r: 100, g: 100, b: 100, a: 255 };    // Gray
```

---

## 📊 Performance Tips

**Canvas Mode:**
- Use `setPixelBuffer()` not `setPixels()` for full canvas
- Batch updates: redraw only if playback position changed
- Downsample aggressively (2-4x canvas width)

**Widget Mode:**
- Keep slice count < 100 (widget overhead is higher)
- Use `.when()` for conditional visibility
- Consider virtual scrolling for very large waveforms

---

## 🏗️ Architecture

### WaveformSlice Interface
```typescript
interface WaveformSlice {
  index: number;      // Position in array
  peak: number;       // Max amplitude (0-1)
  rms: number;        // RMS for alternative visualization
  position: number;   // Time in seconds
}
```

### AudioProcessor Class
- `createSyntheticWaveform()` - Generate test audio
- `downsampleWaveform()` - Reduce samples for display
- `fetchAndDecodeAudio()` - Load from URL (extensible)

### State Management
- `playbackPosition` - Current time (seconds)
- `isPlaying` - Boolean playback state
- `startTime` - Base timestamp for elapsed calculation
- `animationFrameId` - For cleanup on stop

---

## 🔄 Patterns Demonstrated

### Canvas Mode Patterns
- `tappableCanvasRaster` - Interactive pixel rendering
- `setPixelBuffer()` - Efficient full-canvas updates
- Coordinate conversion (pixels → audio position)
- Imperative animation loop with `setInterval`
- Event handler with tap coordinates

### Widget Mode Patterns
- Pseudo-declarative UI composition
- Dynamic widget generation with loops
- `.when()` for conditional visibility
- `vbox` for dynamic sizing
- Widget element tracking with Map
- Declarative state management

### Both Modes
- Observable playback state
- Time formatting (MM:SS)
- Play/pause/stop lifecycle
- Status message updates
- Window layout with vbox/hbox
- Test IDs for stability

---

## 📚 See Also

- **LLM.md** - Tsyne API reference and patterns
- **docs/pseudo-declarative-ui-composition.md** - Detailed composition patterns
- **examples/02-counter.ts** - Simple state management example
- **examples/05-live-clock.ts** - Continuous update pattern (animation)
- **ported-apps/** - Real-world application examples

---

## 🎓 Learning Path

1. **Start with Canvas Mode**
   - Understand `tappableCanvasRaster` and pixel rendering
   - See how coordinates map to audio position
   - Learn efficient buffer updates

2. **Then Widget Mode**
   - Understand pseudo-declarative composition
   - See dynamic widget generation
   - Learn Tsyne idioms

3. **Customize**
   - Change colors, resolution, audio
   - Add features (zoom, frequency view, etc.)
   - Implement drag-to-scrub or other interactions

4. **Extend Further**
   - Real audio file loading
   - FFT visualization
   - Multi-track editing
   - Waveform export

---

## 📄 License

All code in this example is provided as-is for educational purposes.

**Audio source:** Pixabay "Upbeat Stomp Drums Opener" (CC0)
https://pixabay.com/music/upbeat-stomp-drums-opener-308174/

---

## 💡 Tips for Teachers

This example demonstrates:
- ✅ Two rendering approaches (pixel vs widget)
- ✅ Interactive UI with coordinate handling
- ✅ Pseudo-declarative Tsyne composition
- ✅ Animation and playback state management
- ✅ Comprehensive testing (140+ tests)
- ✅ Real-time data visualization
- ✅ Efficient rendering optimization

Perfect for teaching:
- GUI programming fundamentals
- Declarative vs imperative tradeoffs
- Interactive event handling
- Performance optimization
- Comprehensive testing practices
