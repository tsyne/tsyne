# 3D Robot Arm Demo

Interactive 3D robot arm demonstrating **forward kinematics** using Cosyne 3D.

## Features

- **4 Degrees of Freedom (DOF)**:
  - Base rotation (Y-axis)
  - Shoulder joint (X-axis)
  - Elbow joint (X-axis)
  - Gripper open/close (linear)

- **Interactive Controls**:
  - Slider controls for each joint
  - Camera orbit (drag to rotate view)
  - Camera zoom (scroll wheel)
  - Reset button

## Robot Arm Hierarchy

```
                   [Finger L]  [Finger R]
                        \      /
                         \    /
                      [Wrist Bar]
                           |
                      [Forearm]
                           |
                   (ELBOW JOINT) ← rotates around X-axis
                           |
                      [Upper Arm]
                           |
                  (SHOULDER JOINT) ← rotates around X-axis
                           |
                       [Turret]
                           |
                    (BASE JOINT) ← rotates around Y-axis
                           |
                    [Base Platform]
                   ═══════════════
                      (Ground)
```

## Forward Kinematics

Each segment's world position is calculated by accumulating rotations from parent joints:

```typescript
// Forearm position depends on both shoulder AND elbow angles
const combinedAngle = robotState.shoulderAngle + robotState.elbowAngle;
const forearmY = elbowY + offset * Math.cos(combinedAngle);
const forearmZ = elbowZ - offset * Math.sin(combinedAngle);
```

## Running

```bash
npx tsx phone-apps/3d-robot-arm/index.ts
```

## Testing

```bash
cd phone-apps/3d-robot-arm
pnpm test
```

## Technical Details

- Uses `cosyne3d` for declarative 3D scene graph
- `bindPosition()` and `bindRotation()` for reactive updates
- `renderer3d.renderToBuffer()` for efficient pixel buffer rendering
- `tappableCanvasRaster` for camera orbit/zoom controls

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(sliders) + tappableCanvasRaster(3d view)` nesting |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 6 elements. No `.when()` |
| **Core declarative** | Programmatic generation | 7/10 | Loop-based ground tile generation. Joint segments from array |
| **State architecture** | Observable store | 3/10 | No Observable store. Joint angles managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 7/10 | **10 `bindPosition()` + `bindRotation()`** for reactive 3D transforms. `refreshBindings()` triggers updates. Declarative 3D scene graph |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 4/10 | Limited IDs |
| **Design** | Separation of concerns | 6/10 | Forward kinematics math separated from scene construction |
| | **Overall** | **5/10** | Strong reactive 3D bindings (`bindPosition`, `bindRotation`) — the cosyne3d equivalent of `.bindTo()`. Declarative scene graph with reactive transforms |
