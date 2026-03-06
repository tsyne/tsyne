# FPS Advanced - Tsyne Port

A first-person shooter engine featuring brush-based geometry and BVH accelerated
swept point-based collision detection with Quake-style movement including surfing.

Ported to Tsyne from the original Zig implementation.

## Original Project

- **Repository**: https://github.com/lizard-demon/fps-advanced
- **Author**: Spyware (lizard-demon)
- **Language**: Zig

## Features

```
+--------------------------------------------------+
|  FPS Advanced - Quake-Style Movement Demo        |
+--------------------------------------------------+
|                                                  |
|   +------------------------------+  +----------+ |
|   |                              |  | Stats    | |
|   |     3D Viewport              |  |----------| |
|   |     (Software Rendered)      |  | Pos: x,y | |
|   |                              |  | Vel: x,y | |
|   |          +                   |  | Grounded | |
|   |       crosshair              |  |          | |
|   |                              |  | Controls | |
|   |                              |  | WASD     | |
|   +------------------------------+  | Space    | |
|                                     +----------+ |
+--------------------------------------------------+
```

### Ported Features

- **First-person movement** with WASD controls
- **Brush-based geometry** using convex polyhedra for collision
- **BVH spatial acceleration** for efficient collision queries
- **Quake-style physics** with acceleration, friction, and air control
- **Jump mechanics** with proper ground detection
- **Map system** with box and slope brushes

### Tsyne-Specific

- Observable store pattern for reactive UI updates
- Canvas-based 3D viewport rendering
- Desktop GUI with stats panel and controls

## Controls

| Key | Action |
|-----|--------|
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Space | Jump |
| Arrow Keys | Look around |
| Button controls | Alternative look controls |

## Architecture

```
                    +------------------+
                    |    FPSStore      |
                    | (Observable)     |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v-------+  +--------v-------+  +--------v-------+
|    GameMap     |  |    Physics     |  |     Input      |
| (Brush + World)|  | (Quake-style)  |  |   (Keyboard)   |
+--------+-------+  +--------+-------+  +----------------+
         |                   |
+--------v-------+  +--------v-------+
|     World      |  |   Physics      |
| (BVH Raycast)  |  |   State        |
+--------+-------+  +----------------+
         |
+--------v-------+
|      BVH       |
| (Acceleration) |
+----------------+
```

### Key Classes

- **AABB**: Axis-aligned bounding box for spatial queries
- **Brush**: Convex polyhedron defined by plane equations
- **Planes**: Collection of plane normals and distances
- **BVH**: Bounding Volume Hierarchy for O(log n) collision queries
- **World**: Game world with BVH-accelerated raycasting
- **Physics**: Quake-style movement with friction, gravity, air control
- **GameMap**: Map loader supporting box and slope brushes
- **FPSStore**: Observable store for reactive UI

## Physics

The physics system implements Quake-style movement:

- **Ground friction** slows horizontal velocity when grounded
- **Air control** allows limited direction changes while airborne
- **Gravity** accelerates the player downward
- **Collision response** slides along surfaces with proper normal handling
- **Slope handling** determines ground state based on surface angle

### Configuration

```typescript
const PHYSICS_CONFIG = {
  gravity: 6.0,
  jumpVelocity: 2.0,
  maxSpeed: 4.0,
  airSpeed: 0.7,
  acceleration: 70.0,
  friction: 5.0,
  slopeLimit: 0.707, // 45 degrees
  playerRadius: 0.3,
};
```

## Map Format

Maps use JSON format with box and slope brushes:

```json
{
  "name": "Test Map",
  "spawn_position": [0.0, 3.0, -20.0],
  "brushes": [
    { "type": "box", "position": [0, -2.25, 0], "size": [100, 4.5, 100] },
    { "type": "slope", "position": [0, 0, 20], "width": 30, "height": 20, "angle": 46 }
  ]
}
```

## Testing

```bash
# Run unit tests
pnpm test ported-apps/fps-advanced/index.test.ts

# Run TsyneTest integration tests
pnpm test ported-apps/fps-advanced/index.tsyne.test.ts
```

## Credits

- **Original Author**: Spyware (lizard-demon)
- **Original Repository**: https://github.com/lizard-demon/fps-advanced
- **Tsyne Port**: Paul Hammant

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Clean `vbox > hbox(header) + separator + hbox(vbox(viewport + instructions), vbox(stats + controls))` nesting. Two-column layout with viewport and stats panel. Control buttons in nested hboxes |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on title, btn-reset, viewport, instructions, stats-header, pos-label, vel-label, grounded-label, map-label, controls-header, ctrl-ws/ad/space/arrows, btn-look-left/right/up/down. 16+ IDs total |
| **Core declarative** | Programmatic generation | 3/10 | No loop-based UI generation. All buttons and labels manually listed. Map brush data is procedural but that's game data, not UI |
| **State architecture** | Observable store | 7/10 | `FPSStore` with `subscribe()`/`notifyChange()`. Rich physics system with `Physics`, `World`, `BVH`, `GameMap`. Defensive copies via `getPosition().clone()`, `getVelocity().clone()`. Game loop managed by store |
| **Declarative updates** | `.when()` + `.bindTo()` | 2/10 | No `.when()`, no `.bindTo()`, no `.bindText()`. Store subscription updates 3 labels via `setText()`. Viewport updates via `setPixelBuffer()` in render loop. All imperative |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — `win.setContent()` called once. All subsequent updates via `setText()` and `setPixelBuffer()` |
| **Testing** | `.withId()` coverage | 8/10 | Excellent ID coverage on all interactive elements, stats labels, and control descriptions. 16+ IDs for a focused app |
| **Design** | Separation of concerns | 8/10 | `FPSStore` manages game state and physics. `buildFPSAdvancedApp()` is purely presentational. Physics engine (`Physics`, `World`, `BVH`) is fully independent. Render function is separate from game logic |
| | **Overall** | **5/10** | Good separation of concerns with a rich Observable store and physics engine. Excellent `.withId()` coverage for testing. But this is a raster rendering app — the 3D viewport dominates the UI and all visual updates are imperative (`setPixelBuffer()` + `setText()`). No declarative data binding patterns needed for this type of app |

## License

See LICENSE file. Portions copyright Spyware (lizard-demon), portions copyright Paul Hammant.
