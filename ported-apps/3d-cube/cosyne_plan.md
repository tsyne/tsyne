# 3D Cube Cosyne Migration Plan

Port the 3D Rubik's Cube from pixel-buffer rendering to Cosyne 3D with pseudo-declarative gesture mapping.

## Goals

1. Replace `TappableCanvasRaster` pixel rendering with Cosyne 3D primitives
2. Add transparent gesture overlay for swipe-based rotation
3. Define 36 swipe gestures pseudo-declaratively (like `phone-apps/keyboard/`)
4. Maintain pseudo-declarative UI composition patterns from `docs/pseudo-declarative-ui-composition.md`

## Phase 1: Cosyne 3D Cube Rendering

### 1.1 Create Cosyne 3D scene

Replace manual isometric projection with Cosyne 3D camera:

```typescript
a.cosyne3d({ width: canvasSize, height: canvasSize }, (scene) => {
  scene.camera({ type: 'isometric', angle: 30 });

  // Build cube faces declaratively
  buildCubeFaces(a, scene, cube);
});
```

### 1.2 Declarative face rendering

Each cubie face becomes a Cosyne quad. Use loops like keyboard layout:

```typescript
function buildCubeFaces(a: App, scene: Scene3D, cube: RubiksCube): void {
  const HALF = CUBE_SIZE / 2;
  const CELL = CUBE_SIZE / 3;

  // Up face (white) - y = +HALF
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      const x = col * CELL - HALF + CELL/2;
      const z = row * CELL - HALF + CELL/2;

      scene.quad({
        position: { x, y: HALF, z },
        size: CELL - 2,  // gap for grid lines
        normal: { x: 0, y: 1, z: 0 },
      }).bindFillColor(() => SIDE_COLORS[cube.getColor(Side.Up, row, col)]);
    }
  }

  // Front face (green) - z = +HALF
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      const x = col * CELL - HALF + CELL/2;
      const y = HALF - row * CELL - CELL/2;

      scene.quad({
        position: { x, y, z: HALF },
        size: CELL - 2,
        normal: { x: 0, y: 0, z: 1 },
      }).bindFillColor(() => SIDE_COLORS[cube.getColor(Side.Front, row, col)]);
    }
  }

  // Right face (red) - x = +HALF
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      const z = HALF - col * CELL - CELL/2;
      const y = HALF - row * CELL - CELL/2;

      scene.quad({
        position: { x: HALF, y, z },
        size: CELL - 2,
        normal: { x: 1, y: 0, z: 0 },
      }).bindFillColor(() => SIDE_COLORS[cube.getColor(Side.Right, row, col)]);
    }
  }
}
```

### 1.3 Grid lines

Add black lines between cubies:

```typescript
// Grid lines on Up face
for (const i of [0, 1, 2, 3]) {
  const pos = i * CELL - HALF;
  scene.line3d({ from: { x: -HALF, y: HALF, z: pos }, to: { x: HALF, y: HALF, z: pos }, color: 'black' });
  scene.line3d({ from: { x: pos, y: HALF, z: -HALF }, to: { x: pos, y: HALF, z: HALF }, color: 'black' });
}
// Similar for Front and Right faces
```

## Phase 2: Gesture Calibration Layer

### 2.1 Calibration dot overlay

Add black dots at cell centers for visual calibration:

```typescript
let showCalibration = true;

function buildCalibrationDots(a: App, scene: Scene3D): void {
  // Up face dots
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      const x = col * CELL - HALF + CELL/2;
      const z = row * CELL - HALF + CELL/2;

      scene.sphere({
        position: { x, y: HALF + 1, z },  // slightly above face
        radius: 5,
        color: 'black',
      }).when(() => showCalibration).withId(`dot-up-${row}-${col}`);
    }
  }

  // Front face dots
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      scene.sphere({
        position: { x: col * CELL - HALF + CELL/2, y: HALF - row * CELL - CELL/2, z: HALF + 1 },
        radius: 5,
        color: 'black',
      }).when(() => showCalibration).withId(`dot-front-${row}-${col}`);
    }
  }

  // Right face dots
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      scene.sphere({
        position: { x: HALF + 1, y: HALF - row * CELL - CELL/2, z: HALF - col * CELL - CELL/2 },
        radius: 5,
        color: 'black',
      }).when(() => showCalibration).withId(`dot-right-${row}-${col}`);
    }
  }
}
```

### 2.2 Tap logging for calibration

Log screen coordinates when tapping dots:

```typescript
overlay.onTap((x, y) => {
  const xPct = Math.round(x / canvasSize * 100);
  const yPct = Math.round(y / canvasSize * 100);
  console.log(`[CALIBRATE] tap at ${xPct}% x ${yPct}%`);
});
```

### 2.3 Build zone lookup table

After calibration, define zone boundaries:

```typescript
const ZONES = {
  up: [
    [{ x: [15, 35], y: [10, 25] }, { x: [40, 60], y: [10, 25] }, { x: [65, 85], y: [10, 25] }],  // row 0
    [{ x: [10, 30], y: [25, 40] }, { x: [35, 55], y: [25, 40] }, { x: [60, 80], y: [25, 40] }],  // row 1
    [{ x: [5, 25], y: [40, 55] }, { x: [30, 50], y: [40, 55] }, { x: [55, 75], y: [40, 55] }],   // row 2
  ],
  front: [ /* similar */ ],
  right: [ /* similar */ ],
};
```

## Phase 3: Pseudo-Declarative Gesture Mapping

### 3.1 Gesture controller

```typescript
type SwipeDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

class GestureController {
  private zones: Map<string, Map<SwipeDirection, () => void>> = new Map();

  zone(face: string, row: number, col: number): GestureZone {
    const key = `${face}-${row}-${col}`;
    if (!this.zones.has(key)) {
      this.zones.set(key, new Map());
    }
    return new GestureZone(this.zones.get(key)!);
  }

  handleSwipe(startX: number, startY: number, direction: SwipeDirection): void {
    const zone = this.detectZone(startX, startY);
    if (zone) {
      const handler = this.zones.get(zone)?.get(direction);
      handler?.();
    }
  }
}

class GestureZone {
  constructor(private handlers: Map<SwipeDirection, () => void>) {}

  onSwipe(dir: SwipeDirection, action: () => void): this {
    this.handlers.set(dir, action);
    return this;
  }
}
```

### 3.2 Declarative gesture definitions

Like keyboard rows, define gestures per zone:

```typescript
function buildGestures(g: GestureController, cube: RubiksCube): void {

  // ═══════════════════════════════════════════════════════════════════════
  // UP FACE GESTURES
  // ═══════════════════════════════════════════════════════════════════════

  // Row 0 (back edge of top face)
  for (const col of [0, 1, 2]) {
    g.zone('up', 0, col)
      .onSwipe('E', () => cube.rotateSide(Side.Back, false))   // Back counter-clockwise
      .onSwipe('W', () => cube.rotateSide(Side.Back, true))    // Back clockwise
      .onSwipe('S', () => col === 0 ? cube.rotateSide(Side.Left, false) :
                         col === 2 ? cube.rotateSide(Side.Right, true) :
                         cube.rotateMSlice(true))
      .onSwipe('N', () => col === 0 ? cube.rotateSide(Side.Left, true) :
                         col === 2 ? cube.rotateSide(Side.Right, false) :
                         cube.rotateMSlice(false));
  }

  // Row 1 (middle of top face)
  for (const col of [0, 1, 2]) {
    g.zone('up', 1, col)
      .onSwipe('E', () => cube.rotateSSlice(false))  // S slice
      .onSwipe('W', () => cube.rotateSSlice(true))
      .onSwipe('S', () => col === 0 ? cube.rotateSide(Side.Left, false) :
                         col === 2 ? cube.rotateSide(Side.Right, true) :
                         cube.rotateMSlice(true))
      .onSwipe('N', () => col === 0 ? cube.rotateSide(Side.Left, true) :
                         col === 2 ? cube.rotateSide(Side.Right, false) :
                         cube.rotateMSlice(false));
  }

  // Row 2 (front edge of top face)
  for (const col of [0, 1, 2]) {
    g.zone('up', 2, col)
      .onSwipe('E', () => cube.rotateSide(Side.Front, true))   // Front clockwise
      .onSwipe('W', () => cube.rotateSide(Side.Front, false))  // Front counter-clockwise
      .onSwipe('S', () => col === 0 ? cube.rotateSide(Side.Left, false) :
                         col === 2 ? cube.rotateSide(Side.Right, true) :
                         cube.rotateMSlice(true))
      .onSwipe('N', () => col === 0 ? cube.rotateSide(Side.Left, true) :
                         col === 2 ? cube.rotateSide(Side.Right, false) :
                         cube.rotateMSlice(false));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FRONT FACE GESTURES
  // ═══════════════════════════════════════════════════════════════════════

  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      g.zone('front', row, col)
        // Horizontal swipes rotate rows (Up/Down/E-slice)
        .onSwipe('E', () => row === 0 ? cube.rotateSide(Side.Up, false) :
                           row === 2 ? cube.rotateSide(Side.Down, true) :
                           cube.rotateESlice(true))
        .onSwipe('W', () => row === 0 ? cube.rotateSide(Side.Up, true) :
                           row === 2 ? cube.rotateSide(Side.Down, false) :
                           cube.rotateESlice(false))
        // Vertical swipes rotate columns (Left/Right/M-slice)
        .onSwipe('S', () => col === 0 ? cube.rotateSide(Side.Left, false) :
                           col === 2 ? cube.rotateSide(Side.Right, true) :
                           cube.rotateMSlice(true))
        .onSwipe('N', () => col === 0 ? cube.rotateSide(Side.Left, true) :
                           col === 2 ? cube.rotateSide(Side.Right, false) :
                           cube.rotateMSlice(false));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RIGHT FACE GESTURES
  // ═══════════════════════════════════════════════════════════════════════

  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      g.zone('right', row, col)
        // Horizontal swipes (front-back direction) rotate rows
        .onSwipe('E', () => row === 0 ? cube.rotateSide(Side.Up, false) :
                           row === 2 ? cube.rotateSide(Side.Down, true) :
                           cube.rotateESlice(true))
        .onSwipe('W', () => row === 0 ? cube.rotateSide(Side.Up, true) :
                           row === 2 ? cube.rotateSide(Side.Down, false) :
                           cube.rotateESlice(false))
        // Vertical swipes rotate columns (Front/Back/S-slice)
        .onSwipe('S', () => col === 0 ? cube.rotateSide(Side.Front, true) :
                           col === 2 ? cube.rotateSide(Side.Back, false) :
                           cube.rotateSSlice(true))
        .onSwipe('N', () => col === 0 ? cube.rotateSide(Side.Front, false) :
                           col === 2 ? cube.rotateSide(Side.Back, true) :
                           cube.rotateSSlice(false));
    }
  }
}
```

### 3.3 Transparent overlay with drag tracking

```typescript
a.gestureOverlay({
  onDragStart: (x, y) => { dragStart = { x, y }; },
  onDragEnd: (x, y) => {
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const direction = computeDirection(dx, dy);  // Returns N/NE/E/SE/S/SW/W/NW
    gestureController.handleSwipe(dragStart.x, dragStart.y, direction);
  }
});
```

## Phase 4: Integration and Cleanup

### 4.1 Combine layers

```typescript
export function create3DCubeApp(a: App): CubeUI {
  const cube = new RubiksCube();
  const gestures = new GestureController();

  buildGestures(gestures, cube);

  a.window({ title: '3D Cube' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Control buttons (unchanged)
        a.hbox(() => {
          a.button('Reset').onClick(() => cube.reset());
          a.button('Shuffle').onClick(() => cube.shuffle());
          a.button('Calibrate').onClick(() => showCalibration = !showCalibration);
        });

        // 3D scene with gesture overlay
        a.stack(() => {
          a.cosyne3d({ width: 400, height: 400 }, (scene) => {
            buildCubeFaces(a, scene, cube);
            buildCalibrationDots(a, scene);
          });

          a.gestureOverlay({
            onDragStart: (x, y) => gestures.startDrag(x, y),
            onDragEnd: (x, y) => gestures.endDrag(x, y),
          });
        });
      });
    });
  });
}
```

### 4.2 Remove calibration artifacts

Once zones are calibrated:
1. Set `showCalibration = false` as default
2. Remove or comment out calibration button
3. Remove console.log tap logging

### 4.3 Observable pattern for cube state

Upgrade `RubiksCube` to use proper Observable pattern:

```typescript
class RubiksCube {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notifyChange(): void {
    this.listeners.forEach(l => l());
  }

  rotateSide(side: Side, clockwise: boolean): void {
    // ... rotation logic ...
    this.notifyChange();
  }
}
```

This enables reactive `.bindFillColor()` on cube faces to auto-update.

## Summary

| Phase | Description | Key Patterns |
|-------|-------------|--------------|
| 1 | Cosyne 3D rendering | Declarative loops for face generation |
| 2 | Calibration layer | `.when()` for dot visibility |
| 3 | Gesture mapping | Pseudo-declarative zone/swipe definitions |
| 4 | Integration | Observable store, cleanup |

The end result follows the pseudo-declarative philosophy:
- **Loops generate structure** (like keyboard rows)
- **`.when()` controls visibility** (calibration dots)
- **Fluent chaining for configuration** (`.onSwipe().onSwipe()`)
- **Observable pattern for reactivity** (cube state → face colors)
