# Connect 4 - Tsyne Canvas Port

A two-player Connect 4 game rendered using Tsyne's canvas API.

Portions copyright Emiliano Carrillo, Angel Genis, Omar Gard 2018
Portions copyright Paul Hammant 2026

Original authors:
- [@emiliano-carrillo](https://github.com/emiliano-carrillo)
- [@AngelGenis](https://github.com/AngelGenis)
- [@OmarGard99](https://github.com/OmarGard99)

## Features

- Classic 7x6 Connect 4 board
- Two-player gameplay (Yellow vs Red)
- Animated piece drops
- Win detection (horizontal, vertical, diagonal)
- Winning pieces highlighted
- Reset game functionality

## Running

```bash
# From the monorepo root
./scripts/tsyne ported-apps/connect4/src/connect4-app.ts

# Or using npm
cd ported-apps/connect4
npm run start
```

## Testing

```bash
cd ported-apps/connect4
npm test
```

## Architecture

```
ported-apps/connect4/
├── src/
│   ├── connect4-app.ts      # Main Tsyne application with canvas rendering
│   ├── game-logic.ts        # Core game state and win detection
│   └── game-logic.test.ts   # Jest tests for game logic
├── package.json
├── jest.config.js
└── README.md
```

## How to Play

1. Player 1 (Yellow) goes first
2. Click a column number (1-7) to drop a piece
3. Pieces fall to the lowest available slot
4. First player to get 4 in a row (horizontal, vertical, or diagonal) wins
5. Click "Reset Game" to start a new game

## Technical Notes

- Uses Tsyne's `canvas2d` for rendering
- Game logic is separated into a pure module for testability
- Win detection checks all 4 directions from the last placed piece
- Board uses a 2D array where `board[col][row]` represents each cell
