# Chess Game for Tsyne

A classic chess game ported from [andydotxyz/chess](https://github.com/andydotxyz/chess) to Tsyne.

## Original Project

This application is based on the Chess game originally created by Andy Williams:
- **Original Repository**: https://github.com/andydotxyz/chess
- **Original Author**: Andy Williams (andydotxyz)
- **Original License**: See the original repository for licensing information

## About This Port

This is a Tsyne port of the chess game, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in pure Go using the Fyne GUI toolkit with custom chess widgets and Stockfish UCI integration for computer play. This version maintains the same visual presentation and game mechanics but adapts the chess engine and UI to Tsyne's declarative API.

### Key Features (from original)

- **Standard Chess Gameplay**
  - 8x8 chessboard with alternating square colors
  - All standard chess pieces (King, Queen, Rook, Bishop, Knight, Pawn)
  - Full rule enforcement (legal moves, check, checkmate, stalemate)
  - Visual piece representation using SVG graphics

- **Game Operations**
  - New game
  - Click-to-move interaction
  - Drag-and-drop piece movement
  - Computer opponent play
  - Move status display

### Current Implementation Status

This is a **functional port** with both interactive gameplay and computer opponent:

✅ **Implemented:**
- Complete chess game engine (using chess.js library)
- 8x8 board with proper square coloring
- SVG piece rendering (using @resvg/resvg-js for PNG conversion)
- Click-to-select and click-to-move interaction
- Drag-and-drop piece movement
- Selected square highlighting
- Legal move validation
- Check/checkmate/stalemate detection
- Computer opponent (random move selection)
- Move history display
- Game status updates

⚠️ **Simplified from Original:**
- Random computer opponent (original uses Stockfish UCI engine with strength levels)
- No move animations (original has smooth piece transitions)
- No move highlighting preview (original shows valid moves for selected piece)
- No captured pieces display (original shows taken pieces)
- No game clock/timer (original has optional time controls)

The original chess game uses the notnil/chess Go library and integrates with the Stockfish chess engine via UCI protocol for strong computer play. This port uses chess.js for game logic and implements a simple random move selector for the computer opponent.

## Architecture

The port adapts the original's architecture to TypeScript:

```
Original Go Structure:
board.go         → Chess board with custom widgets
pieces.go        → Piece rendering and movement
game.go          → Game state and UCI communication
main.go          → Main app entry point
```

**TypeScript Implementation:**
- `ChessUI` - Main UI class managing board state and rendering
- `chess.js` - Third-party chess game engine (replaces notnil/chess)
- `@resvg/resvg-js` - SVG to PNG rendering for piece graphics
- Image-based squares with embedded piece sprites
- Click and drag event handlers for piece interaction
- Computer move generation with configurable delay

## Game Rules

**Standard Chess** (from original):

- **Objective**: Checkmate the opponent's king (attack the king with no legal escape)

- **Pieces**:
  - King: Moves one square in any direction
  - Queen: Moves any distance in straight lines or diagonals
  - Rook: Moves any distance horizontally or vertically
  - Bishop: Moves any distance diagonally
  - Knight: Moves in an "L" shape (2 squares + 1 perpendicular)
  - Pawn: Moves forward one square (two on first move), captures diagonally

- **Special Moves**:
  - Castling: King and rook swap positions under specific conditions
  - En passant: Special pawn capture move
  - Pawn promotion: Pawns reaching the opposite end become Queens (or other pieces)

- **Game End Conditions**:
  - Checkmate: King is attacked and has no legal moves (winner declared)
  - Stalemate: No legal moves available but king not in check (draw)
  - Draw: By repetition, insufficient material, or 50-move rule

- **Player vs Computer**:
  - Player controls white pieces (bottom of board)
  - Computer plays black pieces (top of board)
  - White moves first

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the chess game
node dist/examples/chess/chess.js
```

**Playing the Game:**
- Click a piece to select it (highlights the square)
- Click a destination square to move
- Or drag a piece to a destination square
- Invalid moves will show an error message
- The computer automatically plays after your move

## Testing

```bash
# Run tests
npm test examples/chess/chess.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test examples/chess/chess.test.ts
```

**Test Coverage:**
- Initial board setup (all pieces in starting positions)
- UI component visibility and layout
- Move mechanics (click and drag)
- Legal move validation
- Check/checkmate detection
- Computer opponent response
- Game reset functionality
- Square highlighting for selected pieces

## Attribution

Original work by Andy Williams (andydotxyz). Please visit the [original repository](https://github.com/andydotxyz/chess) for the full-featured Go implementation with Stockfish engine integration and advanced UI features.

This Tsyne port is provided as a demonstration of chess game implementation and human-computer gameplay in Tsyne applications.

## Future Enhancements

To bring this port closer to the original's feature set, the following enhancements would be valuable:

1. **Stronger Computer Opponent**:
   - Integration with Stockfish or another strong chess engine
   - UCI protocol support for engine communication
   - Configurable difficulty/strength levels
   - Opening book and endgame tablebase support

2. **Enhanced Move Visualization**:
   - Highlight valid moves for selected piece
   - Move animations (smooth piece sliding)
   - Last move highlighting
   - Threatened square indicators

3. **Game History and Analysis**:
   - Full move history list (algebraic notation)
   - Move undo/redo functionality
   - Position evaluation display
   - Save/load games (PGN format)

4. **Additional UI Features**:
   - Captured pieces display
   - Game clock/timer options
   - Player vs player mode (two humans)
   - Board flip/orientation toggle
   - Piece set selection

5. **Advanced Chess Features**:
   - Opening trainer mode
   - Puzzle solver
   - Position editor
   - Multi-game management
   - Online play support

## Technical Implementation

### Chess Engine

Uses **chess.js** library for:
- Move generation and validation
- Game state management
- Check/checkmate/stalemate detection
- FEN notation support
- Move history tracking

### Graphics Rendering

Uses **@resvg/resvg-js** for:
- SVG to PNG conversion
- Piece image caching
- Dynamic square composition
- Base64 image encoding for Fyne image widgets

### Computer Opponent

Current implementation:
```typescript
// Get all legal moves
const moves = this.game.moves({ verbose: true });

// Select random move
const randomMove = moves[Math.floor(Math.random() * moves.length)];

// Execute move
this.game.move({ from: randomMove.from, to: randomMove.to });
```

This provides instant legal moves but no strategic play. Replacing with Stockfish would require:
- UCI protocol implementation
- Process management for engine
- Position/move translation
- Asynchronous communication handling

### Board Representation

- 8x8 grid of image widgets
- Each square: 100x100 pixels
- Total board: 800x800 pixels
- Window size: 800x880 (includes buttons and status)
- Light squares: `#f0d9b5`
- Dark squares: `#b58863`
- Selected highlight: `#7fc97f`

### Piece Assets

Requires SVG files in `examples/chess/pieces/` directory:
- `whiteKing.svg`, `blackKing.svg`
- `whiteQueen.svg`, `blackQueen.svg`
- `whiteRook.svg`, `blackRook.svg`
- `whiteBishop.svg`, `blackBishop.svg`
- `whiteKnight.svg`, `blackKnight.svg`
- `whitePawn.svg`, `blackPawn.svg`

Pieces are pre-rendered to 80x80 PNG images and cached for performance.

## Credits

- **Original Chess Game**: Andy Williams (andydotxyz)
- **Chess.js Library**: jhlywa and contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
- **Piece Graphics**: Standard chess SVG set
