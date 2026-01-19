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
