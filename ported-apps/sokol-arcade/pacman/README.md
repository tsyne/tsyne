# Pacman

Classic maze chase game with ghosts. Ported from floooh/pacman.zig.

## Original Project

- **Repository**: https://github.com/floooh/pacman.zig
- **Author**: Andre Weissflog (floooh)
- **Language**: Zig

## Features

```
+----------------------------+
|############################|
|#............##............#|
|#.####.#####.##.#####.####.#|
|#o####.#####.##.#####.####o#|
|#..........................#|
|  ...                       |
|      C<   (Pacman)         |
|                            |
|      ^^   (Ghost)          |
+----------------------------+
```

### Implemented

- Authentic 28×31 maze layout
- 4 ghosts with distinct behaviors
- Dots (+10 points) and power pellets (+50 points)
- Ghost states: Chase, Scatter, Frightened, Eaten
- Lives system (3 lives)
- Tunnel wrap-around

### Ghost AI

| State | Behavior |
|-------|----------|
| Chase | Move toward Pacman |
| Scatter | Return to spawn |
| Frightened | Run away from Pacman |
| Eaten | Respawn at center |

## Controls

| Key | Action |
|-----|--------|
| ↑ | Move up |
| ↓ | Move down |
| ← | Move left |
| → | Move right |

## Scoring

| Item | Points |
|------|--------|
| Dot | 10 |
| Power Pellet | 50 |
| Ghost (frightened) | 200 |

## Testing

```bash
pnpm test ported-apps/sokol-arcade/pacman/index.test.ts
```

## Credits

- **Original Author**: Andre Weissflog (floooh)
- **Original Repository**: https://github.com/floooh/pacman.zig
- **Tsyne Port**: Paul Hammant

## License

MIT License. See parent LICENSE file.
