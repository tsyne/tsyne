# Sokol Arcade

A multi-game arcade launcher ported to Tsyne from various Sokol/Zig projects.

## Games Included

### FPS Voxel
A first-person voxel exploration game with:
- 16x16x16 voxel world
- WASD movement with mouse look
- Jump and gravity physics
- Software raycasting renderer

Originally from [lizard-demon/fps](https://github.com/lizard-demon/fps) (fps-simple variant).

### Pacman
Classic Pac-Man arcade game featuring:
- Full maze with dots and power pellets
- Four ghosts with AI behavior (scatter/chase/frightened)
- Score tracking and lives
- Authentic gameplay mechanics

Originally from [floooh/pacman.zig](https://github.com/floooh/pacman.zig).

### Chip-8
A Chip-8 emulator/interpreter supporting:
- Full instruction set (35 opcodes)
- 64x32 monochrome display
- 16-key hexadecimal keypad
- Sound and delay timers
- Built-in font

Originally from [floooh/chipz](https://github.com/floooh/chipz).

## Architecture

The arcade uses a launcher pattern with an `ArcadeStore` that manages game state:

```typescript
import { ArcadeStore, GAMES } from './index';

const store = new ArcadeStore();

// Display available games
GAMES.forEach(game => {
  console.log(`${game.name}: ${game.description}`);
});

// Launch a game
store.launchGame('pacman');

// Return to launcher
store.backToLauncher();
```

## Testing

53 Jest unit tests covering:
- VoxelWorld block operations and collision
- VoxelPlayer movement and physics
- FPSVoxelGame lifecycle and rendering
- PacmanGame mechanics and scoring
- Chip8 opcodes and emulation
- ArcadeStore game switching

Run tests:
```bash
cd core && pnpm test -- "sokol-arcade"
```

## Credits

- **Andre Weissflog (floooh)** - pacman.zig, chipz
- **Spyware (lizard-demon)** - fps voxel engine
- **Paul Hammant** - TypeScript port

## License

MIT License - see [LICENSE](./LICENSE)
