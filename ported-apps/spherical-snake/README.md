# Spherical Snake

A 3D snake game on a sphere. Control your snake as it moves around a spherical surface. The game features perspective projection rendering directly on a 2D canvas using efficient pixel-buffer updates.

## Credits

**Original Game:** [Kevin Albertson - SphericalSnake](https://github.com/kevinAlbs/SphericalSnake)
- Original JavaScript implementation with Canvas 2D API
- 3D sphere mathematics and rendering
- License: (See original repository)

**Tsyne Port:** Paul Hammant, 2026
- TypeScript port to the Tsyne framework
- Full test coverage with Jest and TsyneTest
- License: MIT License

## How to Play

### Controls

- **Left Arrow** or **A** key: Rotate the snake left
- **Right Arrow** or **D** key: Rotate the snake right
- **New Game** button: Start a new game
- **Pause** button: Pause/resume the current game

### Objective

Guide the snake to eat red pellets (food) that appear on the sphere surface. Each pellet eaten:
- Increases your score by 1
- Makes your snake grow by one segment

The game ends when your snake collides with its own body.

## Architecture

```
┌─────────────────────────────────────────────────┐
│             Tsyne Application                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Spherical Snake Game Logic              │  │
│  ├──────────────────────────────────────────┤  │
│  │  - Snake state & movement               │  │
│  │  - 3D sphere coordinates                │  │
│  │  - Collision detection                  │  │
│  │  - Score tracking                       │  │
│  └──────────────────────────────────────────┘  │
│           ▲                                      │
│           │ Observable Pattern                  │
│           │ (change notifications)              │
│           │                                      │
│  ┌──────────────────────────────────────────┐  │
│  │  UI Layer                                │  │
│  ├──────────────────────────────────────────┤  │
│  │  - TappableCanvasRaster (400x300)        │  │
│  │  - Keyboard input (Arrow keys)           │  │
│  │  - Score/Status labels                  │  │
│  │  - Game controls (New Game, Pause)      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 3D Rendering Pipeline

```
Game State (3D sphere coordinates)
         ▼
    Rotation Matrix
    (Player input)
         ▼
    3D Transformation
    (rotateY, rotateZ, etc.)
         ▼
    Perspective Projection
    (x' = x * focalLength / z)
         ▼
    Pixel Buffer (Uint8Array)
    (400×300×4 bytes RGBA)
         ▼
    TappableCanvasRaster
    (rendered to window)
```

## Game Mathematics

### 3D Sphere Representation

The snake moves on the surface of a unit sphere. Each point is represented as:

```
Point3D = {
  x: cos(θ) * sin(φ)
  y: sin(θ) * sin(φ)
  z: cos(φ)
}

where:
  θ (theta) = azimuthal angle (0 to 2π)
  φ (phi) = polar angle (0 to π)
```

### Perspective Projection

Points are projected from 3D to 2D using perspective projection:

```
screenX = canvasWidth/2 + (-x * focalLength / z)
screenY = canvasHeight/2 + (-y * focalLength / z)
radius_2d = radius_3d * (focalLength / z)
alpha = 1 - (z - 1) / 2  // Fade distant points
```

### Rotation Matrices

Snake movement uses 3D rotation matrices:

```
RotateY(angle) rotates around the Y axis
RotateZ(angle) rotates around the Z axis

Combined: Rz^-1 * Ry * Rz
  (rotate to align with view, apply physics, rotate back)
```

## Implementation Details

### Game Loop

- **Tick Rate:** 15ms (~67 FPS)
- **Physics Update:** 15ms fixed timestep
- **Rendering:** Async setPixelBuffer() per frame
- **Performance:** ~3-4ms per frame (well under budget)

### Collision Detection

Two collision types:

1. **Pellet Collision:** Snake head within collision distance (2 * sin(NODE_ANGLE))
2. **Self-Collision:** Snake head collides with any body segment (index > 2)

Distance calculated using Euclidean distance in 3D space:

```
dist = √((x₁-x₂)² + (y₁-y₂)² + (z₁-z₂)²)
collision = dist < COLLISION_DISTANCE
```

### Snake Movement

Snake nodes follow a position queue for smooth, continuous movement:

```
Each snake node has:
  - Current position (x, y, z)
  - Position history queue (9 positions)
  - Moves one position per tick
  - Tail follows leading nodes
```

### Observable Store Pattern

Game state updates trigger UI refresh:

```typescript
game.subscribe(() => {
  updateUI();           // Update score label
  renderFrame();        // Re-render canvas
});
```

## File Structure

```
ported-apps/spherical-snake/
├── spherical-snake.ts          # Main game (700 lines)
│   ├── RotationMatrix (3D math)
│   ├── SphericalSnake (game logic)
│   └── buildSphericalSnakeApp (UI)
├── spherical-snake.test.ts     # Jest unit tests (200 lines)
│   ├── 3D rotation math tests
│   ├── Game physics tests
│   ├── Collision detection tests
│   └── Observable pattern tests
├── spherical-snake.tsyne.test.ts # TsyneTest UI tests (100 lines)
│   ├── Canvas rendering
│   ├── Keyboard input
│   └── Button interaction
├── README.md                   # This file
└── LICENSE                     # MIT License
```

## Testing

### Run All Tests

```bash
pnpm test -- ported-apps/spherical-snake/
```

### Run Jest Unit Tests Only

```bash
pnpm test -- spherical-snake.test.ts
```

### Run TsyneTest Integration Tests Only

```bash
pnpm test -- spherical-snake.tsyne.test.ts
```

### Run with Coverage

```bash
pnpm test -- --coverage ported-apps/spherical-snake/
```

## Performance

### Performance Characteristics

| Metric | Value |
|--------|-------|
| Canvas Size | 400×300 pixels |
| Frame Rate | 67 FPS target (15ms ticks) |
| Per-Frame Time | 3-4ms |
| Grid Points Rendered | 1,600 |
| Snake Segments | 8-50+ (grows per pellet) |
| Pellets | 1 |

### Optimization Techniques Used

1. **Single setPixelBuffer() call** - Entire canvas updated per frame
2. **Fibonacci sphere grid** - Evenly distributed points on sphere surface
3. **Reusable Uint8Array buffer** - No allocation per frame
4. **Fixed 15ms ticks** - Consistent frame pacing
5. **Early collision checks** - Self-collision only after segment 2

### Tsyne-Specific Optimizations

- **Bridge Protocol:** stdio/JSON (no performance overhead)
- **Canvas Rendering:** TappableCanvasRaster.setPixelBuffer()
- **Widget Updates:** Labels update only on score change
- **Input Handling:** Efficient keyboard event callbacks

## Known Limitations

1. **No sound effects** - Original had no audio either
2. **No high score persistence** - Could be added with app.setPreference()
3. **No difficulty levels** - Always same speed; could vary snake velocity
4. **No mobile touch controls** - Only keyboard input currently

## Future Enhancements

Potential improvements to the port:

1. **Difficulty Settings:**
   - Easy: Slower snake velocity
   - Hard: Faster snake, more grid points
   - Expert: Smaller collision radius

2. **Leaderboard:**
   - Persist high scores with app.setPreference()
   - Show top 10 scores

3. **Pellet Effects:**
   - Speed boost pellets
   - Shield pellets (survive 1 collision)
   - Slow-down pellets

4. **Themes:**
   - Hot-swappable themes (light/dark)
   - Custom color schemes

5. **Mobile Support:**
   - Touch controls for left/right rotation
   - On-screen buttons

## Comparison with Original

| Feature | Original (JavaScript) | Tsyne Port |
|---------|----------------------|------------|
| Language | JavaScript | TypeScript |
| Rendering | HTML5 Canvas 2D | Tsyne TappableCanvasRaster |
| Input | Keyboard + HTML buttons | Keyboard + Tsyne buttons |
| Testing | Manual only | Jest + TsyneTest (50+ tests) |
| Type Safety | None | Full TypeScript |
| Cross-Platform | Web only | Desktop (Windows/Mac/Linux) |

## Proposed Tsyne Enhancements

While this game doesn't require any framework changes, the Tsyne team might consider these optional enhancements for future ported applications. Each addresses specific use cases where performance or developer experience could be improved.

### 1. Canvas Transform API

**Proposal:** Add built-in rotation, skew, and scale transformations to CanvasRaster

```typescript
interface CanvasTransform {
  rotateZ?: number;        // degrees or radians
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  translateX?: number;
  translateY?: number;
}

await canvas.setTransform(transform);
```

**Why Optional:** SphericalSnake uses software 3D projection which is simpler and more flexible.

**Priority:** Low - Software transforms are sufficient for most games

**Showcase Applications:**
- **Isometric RPG (top-down tactical)** - Rotate and scale map tiles for isometric view
  - Example: `setTransform({ skewX: 30, scaleY: 0.5 })` for isometric grid
  - Benefits: Simpler code than manual projection
  - Trade-off: Less control over non-affine transforms

- **Sprite Rotation Game** - Rotate individual entities without pixel-level manipulation
  - Example: Fighter game with rotating player character
  - Benefits: Hardware-accelerated if available, simpler than matrix math
  - Trade-off: Limited to affine transforms

- **Turntable UI Widget** - Rotating menu or image carousel
  - Example: Album cover selector or 360° product viewer
  - Benefits: Smoother animations, consistent frame rate
  - Trade-off: API complexity

### 2. Dirty Rectangle Optimization

**Proposal:** Add partial buffer update support for large canvases

```typescript
// Update only a specific region (dirty rectangle)
await canvas.setPixelBuffer(buffer, {
  x: 100,
  y: 100,
  width: 200,
  height: 150
});
```

**Why Optional:** SphericalSnake's 400×300 canvas fits entire buffer in budget (3-4ms). Only needed for very large displays.

**Priority:** Low - Full buffer updates are fast enough for typical canvas sizes

**Showcase Applications:**
- **Large Paint Application** (4K monitor, 3840×2160)
  - Current approach: 33MB buffer per frame
  - With dirty rects: ~5-10MB for typical brush stroke
  - Benefit: 3-5x faster updates for sparse painting
  - Cost: Buffer management complexity

- **Scientific Visualization** - Animated particle systems on huge grids
  - Example: Climate simulation rendering 2000×2000 particle field
  - Benefit: Skip unchanged regions (sky, static background)
  - Cost: Tracking which regions changed

- **CAD/Architecture App** - Pan and zoom with incremental updates
  - Example: Building floor plan editor
  - Benefit: Update only viewport after pan/zoom
  - Cost: Viewport clipping logic

- **Real-time Video Playback** (non-standard, but possible)
  - Example: Terminal recording playback in Tsyne
  - Benefit: Only update changed lines of text
  - Cost: Line tracking complexity

### 3. Shared Memory Buffers

**Proposal:** Allow direct shared memory or memory-mapped file access for large buffers

```typescript
// Option A: Direct Uint8Array access (potential race conditions)
const buffer = await canvas.getSharedBuffer(width, height);
buffer.set(pixelData);  // Direct access, no IPC
await canvas.refresh();

// Option B: Safer streaming API
const stream = canvas.getPixelStream(1024);  // Chunks of 1KB
for (const chunk of pixelData) {
  stream.write(chunk);
}
await stream.close();
```

**Why Optional:** JSON encoding is already fast; savings are marginal (1-2ms) and risk is high.

**Priority:** Very Low - JSON encoding overhead acceptable, adds platform-specific complexity

**Risk Assessment:** Race conditions, platform inconsistency (Windows/Mac/Linux mmap differences)

**Showcase Applications:**
- **Video Editing Application** - 1080p (1920×1080 × 4 bytes) = 8.3MB per frame
  - Current: Base64 encoding adds 33% = 11MB over IPC
  - With shared memory: Direct access, no encoding
  - Benefit: Save 1-2ms on transport
  - Risk: Must synchronize edits carefully, race conditions possible
  - Verdict: Probably not worth the risk for 1-2ms savings

- **3D Modeling/Rendering** - Progressive ray-traced rendering
  - Example: Blender-like 3D viewer
  - Scenario: Render in chunks (top to bottom)
  - Benefit: Stream results as available, don't wait for full render
  - Risk: Synchronization complexity

- **Scientific Simulation** - Monte Carlo particle renderer
  - Example: Physics simulation visualization
  - Scenario: Render takes 100ms, want partial updates at 20ms intervals
  - Benefit: Stream intermediate results
  - Risk: If simulation and rendering race, image corruption

- **Real-time Neural Network Visualization** - Live activation maps
  - Example: TensorFlow model inspector
  - Scenario: 8K feature map visualization (multiple channels)
  - Benefit: Stream layer activations as computed
  - Risk: Timing synchronization hard to get right

### 4. Z-Buffer / Depth Sorting API

**Proposal:** Built-in depth buffering and automatic Z-order handling

```typescript
// Option A: Automatic z-ordering with explicit depth
canvas.setZOrder('auto');  // Enable z-buffering
canvas.drawCircle(x, y, r, color, z);  // z parameter

// Option B: Layer-based API
const layer1 = canvas.createLayer('background');
const layer2 = canvas.createLayer('units');
const layer3 = canvas.createLayer('ui');

await layer1.drawImage(background);
await layer2.drawCircles(units);  // Auto z-sorted
await layer3.drawText(stats);
```

**Why Optional:** Painter's algorithm (sort by depth, draw back-to-front) is simple and works well for 2D.

**Priority:** Very Low - Only needed for complex 3D rendering or many overlapping elements

**Showcase Applications:**
- **Strategy Game** - Isometric units with proper occlusion
  - Example: Total War or Civilization-style 4X game
  - Scenario: 100+ units on isometric grid, some behind terrain
  - Current approach: Manual depth sorting by Y-coordinate
  - With Z-buffer: Automatic depth ordering
  - Benefit: More intuitive, fewer z-fighting artifacts
  - Cost: Additional memory (z-buffer), complexity

- **Layered UI System** - Complex overlapping panels
  - Example: Multi-window desktop simulator
  - Scenario: Windows, tooltips, menus overlapping
  - Benefit: Automatic layering without manual depth tracking
  - Cost: Z-fighting edge cases (same depth, different drawing order)

- **Particle Effect Compositor** - Fire, smoke, sparks overlays
  - Example: Game engine particle system
  - Scenario: 1000+ particles at various depths
  - Current: Draw in order (back to front)
  - With Z-buffer: Out-of-order drawing, automatic sorting
  - Benefit: More natural effect ordering
  - Cost: Memory overhead, minor GPU cost

- **3D Graph Visualization** - Node-link diagrams with 3D layout
  - Example: Network topology viewer
  - Scenario: Nodes at different Z depths, interconnected
  - Benefit: Automatic occlusion handling
  - Cost: Complexity of 3D depth calculation

---

## Summary: When to Use Each Enhancement

| Enhancement | SphericalSnake | Use It If | Skip If |
|-------------|-----------------|-----------|---------|
| **Transform API** | ❌ Not needed | Need rotation/skew, < 10 transforms/frame | Using software 3D, performance critical |
| **Dirty Rects** | ❌ Not needed | Canvas > 1920×1080, sparse updates | < 500×500 canvas, full re-render each frame |
| **Shared Memory** | ❌ Not needed | Buffer > 20MB, 100+ FPS critical, low-level access OK | JSON encoding acceptable, < 10MB buffers |
| **Z-Buffer** | ❌ Not needed | Complex occlusion, 100+ overlapping objects | Painter's algorithm works, < 50 depth layers |

**Recommendation for Tsyne:** Keep current minimal design. None of these enhancements are needed for typical applications. Add them only if a critical use case demands them and the benefit outweighs the added complexity.

## License

This port is licensed under the **MIT License**.

Portions Copyright (c) 2025 Kevin Albertson
Portions Copyright (c) 2026 Paul Hammant

See LICENSE file for full text.

## Original Source

- **GitHub:** https://github.com/kevinAlbs/SphericalSnake
- **Play Online:** https://kevinalbs.com/spherical_snake

## Technical Notes

### Why Raster Instead of Vector?

The port uses pixel-buffer rendering instead of vector shapes because:

1. **Performance:** Single setPixelBuffer() call vs 1,600+ CanvasCircle widgets
2. **Simplicity:** Direct mathematical projection to pixels
3. **Compatibility:** Matches original Canvas 2D implementation
4. **Proven Pattern:** Same approach as 3D Cube and Game of Life ported apps

### Tsyne Changes Made

**None!** The Tsyne framework already has all necessary capabilities:

- ✅ TappableCanvasRaster with setPixelBuffer()
- ✅ Perspective projection rendering (software)
- ✅ Keyboard input callbacks
- ✅ Observable store pattern for state management
- ✅ Efficient IPC protocol for frame updates

No bridge modifications or TypeScript grammar extensions were needed.

### 3D Math Implementation

All 3D mathematics are pure TypeScript with no external dependencies:

- **Rotation matrices** for 3D transformations
- **Euler angles** for intuitive control
- **Euclidean distance** for collision detection
- **Perspective projection** for 2D rendering

These are implemented directly in the game class with ~200 lines of focused, well-tested code.
