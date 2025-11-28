# Conway's Game of Life for Tsyne

A cellular automaton simulation ported from [fyne-io/life](https://github.com/fyne-io/life) to Tsyne.

## Original Project

This application is based on Conway's Game of Life originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/life
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## About This Port

This is a Tsyne port of the Game of Life simulation, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in pure Go using the Fyne GUI toolkit with custom canvas rendering. This version maintains the same cellular automaton logic but adapts the UI to Tsyne's declarative API.

## What is Conway's Game of Life?

Conway's Game of Life is a cellular automaton devised by mathematician John Horton Conway in 1970. It's a zero-player game, meaning its evolution is determined by its initial state, requiring no further input.

### The Rules

The universe is a 2D grid of cells, where each cell can be either **alive** or **dead**.

**On each generation:**
1. Any **live** cell with **2 or 3** live neighbors survives
2. Any **dead** cell with **exactly 3** live neighbors becomes alive (birth)
3. All other cells die or stay dead (due to underpopulation or overcrowding)

These simple rules create surprisingly complex and interesting patterns!

### Key Features (from original)

- **50×40 grid** for simulation
- **~6 FPS animation** speed
- **Gosper Glider Gun** - A pattern that creates gliders infinitely
- **Interactive controls**: Start, pause, step, reset, clear
- **Generation counter** tracking evolution

### Current Implementation Status

This is a **simplified demonstration port** that shows the core simulation:

✅ **Implemented:**
- Complete Game of Life rules (birth, survival, death)
- Board class with 2D grid management
- Neighbor counting algorithm
- Generation advancement logic
- Gosper Glider Gun pattern loader
- Game controls (start, pause, step, reset, clear)
- Generation counter
- Text-based visualization
- Full test suite (12 tests)

⚠️ **Simplified from Original:**
- Text display (█ for alive, · for dead) instead of graphical cells
- No click-to-toggle cells (original has interactive canvas)
- Simplified rendering (original uses custom canvas widget)
- No color customization (original supports themes)

The original uses Fyne's custom canvas widgets for high-performance graphical rendering. To fully replicate this in Tsyne, custom rendering widgets would need to be added to the Go bridge.

## Architecture

The port follows the original's architecture:

```
board.go         → Board class (grid, neighbors, rules)
game.go          → Game class (animation, controls)
main.go          → Main app entry point
```

**TypeScript Implementation:**
- `Board` - 2D grid with Conway's rules implementation
- `GameOfLife` - Game controller with start/pause/step logic
- `GameOfLifeUI` - Tsyne UI implementation

## Game Patterns

The implementation includes the **Gosper Glider Gun**:
- A stationary pattern that generates "gliders" (moving patterns)
- Creates a new glider every 30 generations
- Discovered by Bill Gosper in 1970
- First known pattern with infinite growth

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the Game of Life
node dist/examples/game-of-life/game-of-life.js
```

## Controls

- **Start**: Begin the simulation (runs at ~6 FPS)
- **Pause**: Stop the simulation
- **Step**: Advance exactly one generation
- **Reset**: Reload the Gosper Glider Gun pattern
- **Clear**: Remove all cells (empty board)

## Testing

```bash
# Run tests
npm test examples/game-of-life/game-of-life.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test examples/game-of-life/game-of-life.test.ts
```

**Test Coverage (12 tests):**
- Initial UI display
- Start/pause simulation
- Step through generations
- Reset and clear operations
- State persistence
- Rapid toggle handling
- All UI component visibility

## Implementation Details

### Board Class
- 2D boolean grid (alive/dead cells)
- Double buffering (current gen + next gen)
- Neighbor counting with boundary checks
- Conway's rules application
- Pattern loading (Gosper Glider Gun)

### GameOfLife Class
- Animation control (start/pause)
- ~6 FPS tick rate (166ms intervals)
- Generation advancement
- UI update callbacks
- State management

### GameOfLifeUI Class
- Toolbar with all controls
- Generation counter display
- Running/paused status
- Board visualization (text-based)
- Instructions and description

## Attribution

Original work by the Fyne.io team. Please visit the [original repository](https://github.com/fyne-io/life) for the full-featured Go implementation with graphical rendering and interactive canvas.

This Tsyne port is provided as a demonstration of cellular automaton simulation and state management in Tsyne applications.

## Interesting Patterns

While this implementation loads the Gosper Glider Gun, the Game of Life has many fascinating patterns:

- **Still Lifes**: Block, Beehive, Loaf, Boat
- **Oscillators**: Blinker, Toad, Beacon, Pulsar
- **Spaceships**: Glider, Lightweight spaceship (LWSS)
- **Guns**: Gosper Glider Gun, Simkin Glider Gun
- **Puffers**: Patterns that leave debris behind
- **Methuselahs**: Small patterns that take many generations to stabilize

## Future Enhancements

To make this a fully interactive Game of Life, the following enhancements would be needed:

1. **Graphical Rendering**:
   - Custom canvas widget in Go bridge
   - Cell colors and themes
   - Grid lines
   - Smooth animations

2. **Interactive Features**:
   - Click cells to toggle alive/dead
   - Drag to draw patterns
   - Pattern library with presets
   - Import/export patterns (RLE format)

3. **Advanced Controls**:
   - Variable speed control
   - Zoom in/out on the grid
   - Pan across large boards
   - Different grid sizes

4. **Analytics**:
   - Population counter
   - Birth/death statistics
   - Pattern detection
   - Stable state detection

## Conway's Rules (Mathematical Notation)

For cell at position (x, y):
- Let N = number of alive neighbors (8 adjacent cells)
- Let S = current state (0 = dead, 1 = alive)

**Next state:**
```
S' = (S && (N == 2 || N == 3)) || (!S && N == 3)
```

Or in plain English:
- **Survival**: Live cells with 2-3 neighbors stay alive
- **Birth**: Dead cells with exactly 3 neighbors become alive
- **Death**: All other cells die or stay dead

## Credits

- **Original Game of Life**: Fyne.io contributors
- **Conway's Game of Life**: John Horton Conway (1970)
- **Gosper Glider Gun**: Bill Gosper (1970)
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
