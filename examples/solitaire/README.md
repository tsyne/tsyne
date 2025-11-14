# Solitaire Card Game for Tsyne

A classic solitaire (Klondike) card game ported from [fyne-io/solitaire](https://github.com/fyne-io/solitaire) to Tsyne.

## Original Project

This application is based on the Solitaire game originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/solitaire
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## About This Port

This is a Tsyne port of the solitaire card game, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application was written in pure Go using the Fyne GUI toolkit with custom drag-and-drop widgets. This version maintains the same game logic but adapts the UI to Tsyne's declarative API.

### Key Features (from original)

- **Classic Klondike Solitaire Rules**
  - 7 tableau stacks
  - 4 foundation build piles
  - Draw pile with 3-card draw
  - Win detection

- **Game Operations**
  - New game
  - Shuffle deck
  - Draw cards
  - Standard solitaire rules

### Current Implementation Status

This is a **simplified demonstration port** that shows the game logic and structure:

✅ **Implemented:**
- Complete card system (52-card deck with suits and values)
- Stack management for tableau, foundations, and hand
- Game logic (deal, draw, shuffle)
- Win condition detection
- Basic UI with game state display
- Full test suite

⚠️ **Simplified from Original:**
- No drag-and-drop (original has full card dragging)
- Text-based card display (original uses graphical card faces)
- Simplified move interaction (original has click-and-drag)
- No animations (original has winning animation)

The original solitaire uses Fyne's custom canvas widgets for interactive card dragging. To fully replicate this functionality in Tsyne, custom widget support for drag-and-drop would need to be added to the Go bridge.

## Architecture

The port follows the original's architecture:

```
card.go          → Card class (suits, values, face up/down)
deck.go          → Deck class (52 cards, shuffle, deal)
game.go          → Game class (stacks, moves, rules)
table.go         → UI layout (tableau, foundations, hand)
main.go          → Main app entry point
```

**TypeScript Implementation:**
- `Card` - Represents a playing card with suit, value, and orientation
- `Stack` - Manages collections of cards
- `Deck` - Standard 52-card deck with shuffle and deal
- `Game` - Game state and rule enforcement
- `SolitaireUI` - Tsyne UI implementation

## Game Rules

**Klondike Solitaire** (from original):

- **Objective**: Move all cards to the four foundation piles, sorted by suit from Ace to King

- **Tableau**: Seven stacks where cards can be moved in descending order, alternating colors

- **Foundations**: Four piles, one per suit, built from Ace to King

- **Draw Pile**: Draws three cards at a time from the hand

- **Moves**:
  - Tableau cards must alternate colors and descend in value
  - Foundations must match suit and ascend from Ace (1) to King (13)
  - Only Kings can be placed in empty tableau stacks
  - Only Aces can start foundation piles

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the solitaire game
node dist/examples/solitaire/solitaire.js
```

## Testing

```bash
# Run tests
npm test examples/solitaire/solitaire.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test examples/solitaire/solitaire.test.ts
```

**Test Coverage:**
- Initial UI display (10 tests)
- Game initialization
- New game functionality
- Shuffle operation
- Draw pile mechanics
- State persistence
- UI component visibility

## Attribution

Original work by the Fyne.io team. Please visit the [original repository](https://github.com/fyne-io/solitaire) for the full-featured Go implementation with graphical cards and drag-and-drop interactions.

This Tsyne port is provided as a demonstration of card game logic and state management in Tsyne applications.

## Future Enhancements

To make this a fully interactive solitaire game, the following enhancements would be needed:

1. **Drag-and-Drop Support**: Add custom widget support in the Go bridge for:
   - Mouse/touch drag events
   - Drop target detection
   - Visual feedback during drag

2. **Graphical Cards**:
   - Card face images/SVGs
   - Card back design
   - Visual card stacking

3. **Move Validation UI**:
   - Clickable cards
   - Valid move highlighting
   - Auto-complete when possible

4. **Additional Features**:
   - Undo/redo moves
   - Move hints
   - Statistics tracking
   - Multiple draw modes (1-card, 3-card)

5. **Animations**:
   - Card flip animations
   - Winning celebration
   - Smooth card movements

## Game Classes

### Card
- `value`: 1-13 (Ace through King)
- `suit`: Clubs, Diamonds, Hearts, Spades
- `faceUp`: Boolean for card orientation
- Methods: `turnFaceUp()`, `turnFaceDown()`, `color()`, `toString()`

### Stack
- Manages a collection of cards
- Methods: `push()`, `pop()`, `top()`, `length()`, `getCards()`

### Deck
- Standard 52-card deck
- Methods: `reset()`, `shuffle()`, `deal()`, `remaining()`

### Game
- Complete game state
- 7 tableau stacks
- 4 foundation builds
- Hand and draw piles
- Methods: `newGame()`, `drawThree()`, `canMoveToBuild()`, `canMoveToStack()`, `hasWon()`

## Credits

- **Original Solitaire**: Fyne.io contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team
