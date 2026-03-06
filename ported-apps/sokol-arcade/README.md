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

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `vbox > hbox(header) + separator + vbox(contentContainer)` nesting. Each game view is a self-contained `vbox` with canvas, controls, and help text. Launcher view has game buttons generated via `for...of` loop |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on title, back button, game buttons (`btn-fps-voxel`, `btn-pacman`, `btn-chip8`), per-game labels, canvases (`fps-canvas`, `pacman-canvas`, `chip8-canvas`), score/lives labels. `.when()` on 4 view containers + back button |
| **Core declarative** | Programmatic generation | 8/10 | Game launcher buttons generated via `for (const game of GAMES)` loop — icon buttons and labels derived from `GAMES` array. Keyboard mappings use object lookup tables. Direction button grid manually listed |
| **State architecture** | Observable store | 7/10 | `ArcadeStore` with `subscribe()`/`notifyChange()`. Manages game lifecycle (launch, stop, back to launcher). Game instances (`FPSVoxelGame`, `PacmanGame`, `Chip8`) created on demand. No defensive copies needed (game instances are mutable by design) |
| **Declarative updates** | `.when()` + `.bindTo()` | 7/10 | 4 `.when()` containers: launcher, fps-voxel, pacman, chip8. Back button conditionally visible via `.when()`. Two `.bindTo({ text: ... })` bindings on Pacman score and lives labels — reactive text bindings. `contentContainer.refresh()` in store subscription. Canvas rendering via separate `setInterval` render loop |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — uses `win.setContent()` only once at initialization. All subsequent updates via `.when()`, `.bindTo()`, and `contentContainer.refresh()` |
| **Testing** | `.withId()` coverage | 8/10 | IDs on all game buttons, canvases, score/lives labels, help text, direction buttons. 53 Jest tests covering game logic |
| **Design** | Separation of concerns | 8/10 | `ArcadeStore` manages game switching and lifecycle. Individual game classes (`FPSVoxelGame`, `PacmanGame`, `Chip8`) are self-contained with their own logic and rendering. `buildSokolArcadeApp()` is purely presentational. Render loop and keyboard handling cleanly wired to store/game instances |
| | **Overall** | **7/10** | Good pseudo-declarative implementation for a game launcher with 4 `.when()` views, programmatic button generation from data, and reactive `.bindTo({ text })` on score labels. The gaps are: render loop is imperative (`setInterval` with `setPixelBuffer`), keyboard handling is a large imperative block, and game instances are mutable rather than Observable. The launcher pattern (data-driven game grid) and view switching are solid |

## Credits

- **Andre Weissflog (floooh)** - pacman.zig, chipz
- **Spyware (lizard-demon)** - fps voxel engine
- **Paul Hammant** - TypeScript port

## License

MIT License - see [LICENSE](./LICENSE)
