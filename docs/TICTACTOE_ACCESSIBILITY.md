# Tic-Tac-Toe Accessibility Showcase

This document explains how `examples/tictactoe.ts` demonstrates comprehensive accessibility features for a Fyne-based (non-web) UI using Tsyne's pseudo-declarative TypeScript markup.

## Why Tic-Tac-Toe for Accessibility?

Tic-Tac-Toe is an excellent accessibility showcase because it requires:
1. **Spatial awareness** - Grid navigation
2. **Game state tracking** - Whose turn, who won
3. **Position descriptions** - Where moves were made
4. **Temporal context** - Move history
5. **Error handling** - Invalid moves
6. **Strategic hints** - Help for users who need it

## 10 Accessibility Features Showcased

### 1. TTS Announcements (Context-Aware)

Unlike the calculator, Tic-Tac-Toe needs **contextual announcements** with varying detail levels:

```typescript
// Move announcement
announce(`${currentPlayer} placed at ${getCellDescription(index)}`);
// "X placed at top left"

// Turn announcement (polite - doesn't interrupt)
announce(`Player ${currentPlayer}'s turn`, 'polite');

// Winner announcement (assertive - interrupts)
announce(`Player ${winner} wins the game!`, 'assertive');

// Position with coordinates
announce(`Focused on top left, currently empty`, 'polite');
```

**Priority Levels:**
- `'polite'` - Normal announcements (turn changes)
- `'assertive'` - Important announcements (wins, errors)

### 2. Keyboard Navigation (2D Grid)

**Arrow key navigation** for a spatial grid:

```typescript
function moveFocus(direction: 'up' | 'down' | 'left' | 'right') {
  const row = Math.floor(currentFocus / 3);
  const col = currentFocus % 3;

  // Calculate new position
  if (direction === 'up') newRow = Math.max(0, row - 1);
  if (direction === 'down') newRow = Math.min(2, row + 1);
  // ...

  currentFocus = newRow * 3 + newCol;

  // Announce new position
  const position = getCellDescription(currentFocus);
  const cellValue = board[currentFocus] || 'empty';
  announce(`Focused on ${position}, currently ${cellValue}`);
}
```

**Keyboard Shortcuts:**
- ↑↓←→ - Navigate grid
- Space/Enter - Place mark
- N - New game
- U - Undo
- ? - Hint
- T/H/F - Toggle accessibility features

### 3. Position Descriptions (Dual Format)

Two ways to describe positions for different user needs:

```typescript
// Human-friendly descriptions
function getCellDescription(index: number): string {
  const positions = [
    'top left', 'top center', 'top right',
    'middle left', 'center', 'middle right',
    'bottom left', 'bottom center', 'bottom right'
  ];
  return positions[index];
}

// Precise coordinates
function getCellCoordinates(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `row ${row}, column ${col}`;
}

// Combined announcement
"X at top left (row 1, column 1)"
```

**Why both?**
- **Descriptions** - Easier for sighted users with low vision
- **Coordinates** - Precise for blind users using screen readers

### 4. Audio Feedback (Game Context)

Different sounds for different game events:

```typescript
function playSound(type: 'x' | 'o' | 'win' | 'draw' | 'error' | 'click') {
  const sounds = {
    x: '✗',      // Lower tone (440 Hz)
    o: '○',      // Higher tone (523 Hz)
    win: '🎉',   // Victory fanfare
    draw: '🤝',  // Draw sound
    error: '⚠️',  // Error beep
    click: '🔊'  // Standard click
  };
  // Play appropriate sound
}
```

**Sound Design:**
- X = Lower pitch (masculine)
- O = Higher pitch (feminine)
- Win = Ascending tones
- Draw = Neutral tone
- Error = Sharp beep

### 5. Move History (Game Transcript)

**Full record** of all moves with detailed descriptions:

```typescript
const moveDesc = `${currentPlayer} at ${getCellDescription(index)} (${getCellCoordinates(index)})`;
moveHistory.push(moveDesc);

// Displayed as:
Moves:
  X at center (row 2, column 2)
  O at top left (row 1, column 1)
  X at top right (row 1, column 3)
  O at middle left (row 2, column 1)
  X at bottom left (row 3, column 1) - X wins!
```

**Why important?**
- **Cognitive support** - Track strategy
- **Screen readers** - Review game with `role="log"`
- **Learning** - Understand winning patterns

### 6. Undo Feature (Error Recovery)

**Stack-based undo** for taking back moves:

```typescript
// Save state before each move
moveStack.push({
  board: [...board],
  player: currentPlayer
});

// Restore on undo
const lastState = moveStack.pop()!;
board = lastState.board;
currentPlayer = lastState.player;

announce(`Move undone. ${currentPlayer}'s turn again.`, 'assertive');
```

**Accessibility benefit:**
- **Motor disabilities** - Recover from mis-clicks
- **Cognitive disabilities** - Learn from mistakes
- **Beginners** - Experiment without penalty

### 7. Smart Hints (Assistive Strategy)

**AI suggestions** for users who need help:

```typescript
function getHint(): number {
  // 1. Block opponent's winning move
  for (const [a, b, c] of winningLines) {
    if (opponentHasTwoInLine(a, b, c)) {
      return emptyCell(a, b, c);
    }
  }

  // 2. Take center if available
  if (board[4] === '') return 4;

  // 3. Take a corner
  const corners = [0, 2, 6, 8].filter(i => board[i] === '');
  if (corners.length > 0) return corners[0];

  // 4. Take any available
  return availableMoves[0];
}

// Announce hint
announce(`Hint: Try placing at ${position}`, 'assertive');
```

**Educational value:**
- Teaches strategy
- Helps users with cognitive disabilities
- Reduces frustration

### 8. Enhanced ARIA Labels (Spatial Context)

**Rich descriptions** for screen readers:

```typescript
a.button(" ", () => makeMove(i), "cell")
  .accessibility({
    label: `Cell at ${position}`,
    description: `${coords}. Press Space or Enter to place your mark.`,
    role: "button",
    hint: `${position} position. Use arrow keys to navigate.`
  });

// Screen reader announces:
// "Cell at top left, row 1 column 1. Press Space or Enter to place your mark.
//  Top left position. Use arrow keys to navigate. Button."
```

**Three levels of detail:**
1. **Label** - Quick identifier ("Cell at top left")
2. **Description** - How to interact ("Press Space or Enter")
3. **Hint** - Navigation context ("Use arrow keys")

### 9. High Contrast Mode (Game Markers)

**Clear visual distinction** between X and O:

```typescript
const highContrastStyles = {
  cell: {
    font_size: 48,
    font_style: FontStyle.BOLD,
    // In real implementation:
    x_color: '#FFFFFF',      // Pure white X
    o_color: '#FFFF00',      // Yellow O
    background: '#000000',    // Black background
    grid_lines: '#FFFFFF'     // White grid
  }
};
```

**Why critical for games:**
- X and O must be distinguishable even with color blindness
- High contrast helps with low vision
- Bold fonts improve readability

### 10. Game State Announcements (Status Updates)

**Real-time status** with different priorities:

```typescript
function updateStatus() {
  if (gameState === 'won') {
    statusLabel.setText(`Player ${winner} wins! 🎉`);
    announce(`Player ${winner} wins the game!`, 'assertive');
    playSound('win');
  } else if (gameState === 'draw') {
    statusLabel.setText(`Game drawn! 🤝`);
    announce('Game is drawn. No more moves available.', 'assertive');
    playSound('draw');
  } else {
    statusLabel.setText(`Player ${currentPlayer}'s turn`);
    announce(`Player ${currentPlayer}'s turn`, 'polite');
  }
}

// With role="status" for live updates
.accessibility({
  label: "Game Status",
  role: "status"  // Screen reader auto-announces changes
});
```

## Unique Challenges for Tic-Tac-Toe

### 1. Spatial Navigation

Unlike linear UIs (calculator), Tic-Tac-Toe is a **2D grid**:

```typescript
// Linear (calculator): Tab forward/back
// Spatial (tictactoe): Arrow keys in 4 directions
```

**Solution:** Arrow key navigation with boundary checks and position announcements.

### 2. Game State Complexity

Multiple states to track and announce:

- Whose turn is it?
- What's on each cell?
- Who won or is it a draw?
- What was the last move?
- What moves are available?

**Solution:** Comprehensive status announcements with priority levels.

### 3. Strategic Context

Users need to understand:
- Where they are on the board
- What moves have been made
- What moves are good/bad
- Why they won/lost

**Solution:** Move history, hints, and detailed position descriptions.

## Comparison: Calculator vs. Tic-Tac-Toe

| Feature | Calculator | Tic-Tac-Toe |
|---------|-----------|-------------|
| **Navigation** | Sequential (Tab) | Spatial (Arrow keys) |
| **State** | Single value | 9 cells + turn + winner |
| **History** | Calculation list | Move transcript |
| **Audio** | Click/result sounds | X/O/win/draw/error |
| **Hints** | N/A | Strategic suggestions |
| **Undo** | Clear only | Stack-based undo |
| **Position** | Not applicable | Dual format (description + coordinates) |
| **Status** | Display value | Turn + game state |

## Non-Web Fyne Benefits

Fyne provides better accessibility for desktop than web in several ways:

### 1. Native Keyboard Shortcuts

```typescript
// Fyne automatically handles:
- Tab navigation
- Arrow key grid navigation
- Space/Enter activation
- System-wide accessibility shortcuts
```

### 2. OS-Level TTS

```typescript
// Fyne can use native TTS:
// - macOS: say command
// - Linux: espeak/festival
// - Windows: SAPI

// Better voices, offline support, system integration
```

### 3. True Focus Management

```typescript
// Fyne provides real focus with:
- Visual focus indicators (automatic)
- Focus events
- Focus trapping in modals
- Keyboard-only navigation
```

### 4. High DPI Support

```typescript
// Fyne scales perfectly at any DPI:
fontSize: 48  // Remains crisp at 4K
// Web: Can be blurry when zoomed
```

## Running the Example

```bash
npm run build
npx ts-node examples/tictactoe.ts
```

**First steps:**
1. Click "TTS: OFF" to enable announcements
2. Use arrow keys or click cells to play
3. Try "Hint" if you need help
4. Use "Undo" to take back moves
5. Enable High Contrast for better visibility

## Testing Accessibility

### Keyboard Only Test
```
✓ Can I navigate the entire grid?
✓ Can I place marks without mouse?
✓ Can I start a new game?
✓ Can I undo and get hints?
✓ Can I toggle accessibility features?
```

### Screen Reader Test
```
✓ Does it announce cell positions?
✓ Does it announce whose turn?
✓ Does it announce moves as they happen?
✓ Does it announce winner/draw?
✓ Can I review move history?
```

### Low Vision Test
```
✓ Can I read X and O at 200% zoom?
✓ Is high contrast mode clear?
✓ Are grid lines visible?
✓ Can I use large font size?
```

### Audio Test
```
✓ Do X and O have different sounds?
✓ Does win sound different from draw?
✓ Do errors have distinct sound?
✓ Can I play without looking?
```

## Best Practices Demonstrated

1. **Context-aware announcements** - Different detail levels
2. **Dual position formats** - Descriptions + coordinates
3. **Priority levels** - Polite vs. assertive
4. **Game state tracking** - History, undo, hints
5. **Strategic assistance** - Hints for beginners
6. **Error prevention** - Block invalid moves
7. **Error recovery** - Undo feature
8. **Multi-modal feedback** - Visual + audio + TTS
9. **Spatial navigation** - 2D arrow key support
10. **Rich ARIA labels** - Label + description + hint

## Future Enhancements

- **Vibration feedback** (mobile)
- **Custom key bindings**
- **Difficulty levels** (AI opponent)
- **Voice input** ("X at top left")
- **Tutorial mode** (guided play)
- **Colorblind modes** (specific palettes)
- **Sound themes** (different audio packs)
- **Replay mode** (review games)

## Conclusion

Tic-Tac-Toe showcases how **spatial games** require different accessibility approaches than **linear tools** like calculators. The combination of TTS, keyboard navigation, audio feedback, hints, and history makes the game playable for users with various disabilities while teaching accessibility best practices for complex UIs.
