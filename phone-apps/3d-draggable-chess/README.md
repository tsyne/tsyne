# 3D Draggable Chess

Cosyne 3D demo showcasing raycasting, object picking, and drag-and-drop on a 3D chessboard.

## Features

- **Raycasting**: Camera `pixelToRay()` for mouse-to-world coordinate mapping
- **Ray-Plane Intersection**: Ground plane hit detection for object positioning
- **Object Picking**: Click detection on 3D primitives (spheres, boxes, cylinders)
- **Drag & Drop**: Move pieces with offset tracking (no snap-to-center)
- **Snap-to-Grid**: Toggle to snap pieces to chess-like grid positions
- **Highlight Effect**: Yellow emissive glow and scale increase when dragging
- **Camera Controls**: Orbit by dragging empty space, scroll to zoom

## Pieces

| Type     | Shape    | Color   | Count |
|----------|----------|---------|-------|
| Pawns    | Sphere   | White   | 4     |
| Rooks    | Cylinder | Black   | 2     |
| King (W) | Box      | Gold    | 1     |
| King (B) | Box      | Brown   | 1     |

## Controls

- **Drag piece**: Click and drag to move
- **Orbit camera**: Drag empty space
- **Zoom**: Scroll wheel
- **Snap toggle**: Checkbox in control bar
- **Reset**: Button to restore initial positions

## Run

```bash
./scripts/tsyne phone-apps/3d-draggable-chess/index.ts
```

## Test

```bash
cd phone-apps/3d-draggable-chess
pnpm test
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + tappableCanvasRaster(3d board)` nesting |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on 10 elements. No `.when()` |
| **Core declarative** | Programmatic generation | 8/10 | Loop-based board square generation (8x8) and piece placement from arrays |
| **State architecture** | Observable store | 3/10 | No Observable store. Chess state via chess.js |
| **Declarative updates** | `.when()` + `.bindTo()` | 6/10 | **4 `bindPosition()` + `bindMaterial()` + `bindScale()`** for reactive 3D transforms. Drag-and-drop with reactive position updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 6/10 | IDs on controls and status |
| **Design** | Separation of concerns | 6/10 | Chess.js handles game rules. 3D scene handles rendering |
| | **Overall** | **5/10** | Good programmatic board generation and reactive 3D bindings for piece dragging. Declarative cosyne3d scene graph |
