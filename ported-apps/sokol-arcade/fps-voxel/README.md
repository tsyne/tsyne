# FPS Voxel

A simple voxel first-person shooter with 16×16×16 world. Ported from lizard-demon/fps.

## Original Project

- **Repository**: https://github.com/lizard-demon/fps
- **Author**: Spyware (lizard-demon)
- **Language**: Zig (256 lines)

## Features

```
+----------------------------------+
|                                  |
|    ████  ████  ████              |
|    █  █  █  █  █  █   (voxels)   |
|    ████  ████  ████              |
|                                  |
|           +                      |
|        crosshair                 |
|                                  |
+----------------------------------+
```

### Implemented

- 16×16×16 voxel world
- First-person camera with mouse look
- AABB collision detection
- Gravity and jumping
- Per-axis collision response
- Face-based shading

### World Layout

- Floor at y=0
- Walls around perimeter
- Pillars at 4-block intervals

## Controls

| Key | Action |
|-----|--------|
| W | Move forward |
| S | Move backward |
| A | Strafe left |
| D | Strafe right |
| Space | Jump |
| Mouse / Arrows | Look around |

## Physics

| Parameter | Value |
|-----------|-------|
| Movement speed | 6.0 units/sec |
| Gravity | 15.0 units/sec² |
| Jump velocity | 8.0 units/sec |
| Player hull | 0.4 × 0.8 × 0.4 |

## Testing

```bash
pnpm test ported-apps/sokol-arcade/fps-voxel/index.test.ts
```

## Credits

- **Original Author**: Spyware (lizard-demon)
- **Original Repository**: https://github.com/lizard-demon/fps
- **Tsyne Port**: Paul Hammant

## License

MIT License. See parent LICENSE file.
