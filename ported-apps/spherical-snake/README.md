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
