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
