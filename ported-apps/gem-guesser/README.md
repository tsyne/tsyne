# GemGuesser - Tsyne Canvas Port

```
  ╔═══════════════════════════╗
  ║       GEM GUESSER         ║
  ║                           ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       ║
  ║                           ║
  ╚═══════════════════════════╝
```

Portions copyright Wngui 2026, portions copyright Paul Hammant, 2026.

License: GPL-3.0

A puzzle game where you deduce the hidden gem colors using row and column clues. Ported from vanilla HTML/CSS/JS to Tsyne using Cosyne for canvas rendering.

## Features

- 8x8 grid of hidden gems
- 5 gem colors: red, blue, green, purple, orange
- Row and column clue numbers showing consecutive sequences
- 3 lives system - wrong guesses cost lives
- Ghost marks for note-taking
- Three difficulty levels (Easy 80%, Medium 65%, Hard 50%)
- Completed sequences shown with faded clue colors

## Running

```bash
# From the monorepo root
./scripts/tsyne ported-apps/gem-guesser/src/gem-guesser.ts

# Or using npm
cd ported-apps/gem-guesser
npm run start
```

## Testing

```bash
# Unit tests
cd ported-apps/gem-guesser
npx jest src/game-logic.test.ts

# Screenshot tests (needs display)
cd ported-apps/gem-guesser
TSYNE_HEADED=1 npx jest src/gem-guesser.test.ts
```

## Architecture

```
ported-apps/gem-guesser/
├── src/
│   ├── game-logic.ts         # Pure game logic (no UI deps)
│   ├── game-logic.test.ts    # 63 Jest tests
│   ├── gem-guesser.ts        # Cosyne UI (fully declarative)
│   └── gem-guesser.test.ts   # Screenshot tests
├── screenshots/              # Test screenshots
├── package.json
├── jest.config.js
└── README.md
```

## How to Play

1. Select a gem color from the color selector at the bottom
2. Click on a hidden cell to guess it contains that color
3. Correct guesses reveal the gem; wrong guesses cost a life
4. Use row/column clue numbers to deduce gem positions:
   - Numbers show consecutive runs of the same color
   - e.g. "2 3" in red means two red gems in a row, then later three red gems
5. Completed sequences fade out in the clue area
6. Reveal all gems before running out of 3 lives to win
7. The game auto-selects the next available color when one is fully revealed

## Technical Notes

- Game logic is pure functional (no mutations, all functions return new state)
- Seeded RNG support for deterministic testing
- Grid uses flat `Cell[64]` array with `row * 8 + col` indexing
- UI uses Cosyne's `.bindFill()` and `.bindText()` for declarative updates
- `refreshAllCosyneContexts()` triggers re-evaluation after state changes
