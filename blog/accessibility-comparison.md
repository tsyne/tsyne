---
layout: post
title: "What 4.6x More Code Teaches Us About Accessibility"
subtitle: "A side-by-side comparison of basic vs accessible TicTacToe implementations"
date: 2024-01-15
author: Paul Hammant
categories: [accessibility, typescript, ui-development]
tags: [a11y, tsyne, fyne, screen-readers, inclusive-design]
---

When I built two versions of the same TicTacToe game—one basic, one accessible—the accessible version ended up 4.6 times larger. But here's the thing: **the accessible version isn't more complex; the basic version is incomplete.**

Let me walk you through what I learned.

## The Numbers at a Glance

| Aspect | Basic Version | Accessible Version |
|--------|---------------|-------------------|
| Lines of Code | 141 | 656 |
| State Variables | 4 | 10+ |
| User Feedback Channels | 0 | 3 (visual, audio, TTS) |
| ARIA Annotations | 0 | Every element |

## What Both Versions Share

The core game logic is identical. Both implementations use:

```typescript
type Player = 'X' | 'O' | '';
type Board = Player[];
type GameState = 'playing' | 'won' | 'draw';
```

Both detect wins the same way:

```typescript
const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];
```

Both use the same widget hierarchy: `window → vbox → grid(3) + hbox`

The game works. The question is: **works for whom?**

## Difference #1: Silent Failure vs Informative Errors

Here's how the basic version handles an invalid move:

```typescript
function makeMove(index: number) {
  if (gameState !== 'playing' || board[index] !== '') {
    return;  // Silent exit. User gets nothing.
  }
  // ...
}
```

And the accessible version:

```typescript
function makeMove(index: number) {
  if (gameState !== 'playing') {
    announce('Game is over. Press New Game to play again.', 'assertive');
    playSound('error');
    return;
  }
  if (board[index] !== '') {
    announce('Cell is already occupied. Choose another cell.', 'assertive');
    playSound('error');
    return;
  }
  // ...
}
```

The first version assumes users will figure out why their click did nothing. The second version **tells them**.

This isn't just an accessibility feature—it's basic UX that benefits everyone. Ever clicked a button and wondered if it worked? That's what silent failure feels like.

## Difference #2: Index vs Semantic Position

The basic version identifies cells by index:

```typescript
cellButton.withId(`cell${i}`)  // "cell0", "cell4", "cell8"
```

The accessible version provides human-readable positions:

```typescript
function getCellDescription(index: number): string {
  const positions = [
    'top left', 'top center', 'top right',
    'middle left', 'center', 'middle right',
    'bottom left', 'bottom center', 'bottom right'
  ];
  return positions[index];
}

function getCellCoordinates(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `row ${row}, column ${col}`;
}
```

Now a screen reader can announce: *"X placed at top left, row 1 column 1"* instead of *"X placed at cell 0"*.

Which one would you prefer to hear?

## Difference #3: Confirmation of Every Action

In the basic version, placing a mark is silent:

```typescript
board[index] = currentPlayer;
updateCell(index);
```

In the accessible version, every action gets multi-modal confirmation:

```typescript
board[index] = currentPlayer;
updateCell(index);

playSound(currentPlayer.toLowerCase() as 'x' | 'o');

const moveDesc = `${currentPlayer} at ${getCellDescription(index)}`;
moveHistory.push(moveDesc);
updateHistory();

announce(`${currentPlayer} placed at ${getCellDescription(index)}`);
```

This pattern—**announce everything**—is the single most important accessibility habit you can develop.

## Difference #4: ARIA Metadata

The basic version has zero accessibility annotations. The accessible version annotates every interactive element:

```typescript
a.button(" ", () => makeMove(i), "cell")
  .withId(`cell${i}`)
  .accessibility({
    label: position,
    description: `${coords}. Press Space or Enter to place your mark.`,
    role: "button",
    hint: `${label} position. Use arrow keys to navigate.`
  });
```

This metadata powers:
- Screen reader announcements
- Voice control software
- Automated testing tools
- Browser accessibility inspectors

## Difference #5: User Preferences

The basic version offers no customization. The accessible version provides:

| Feature | Implementation |
|---------|----------------|
| High Contrast Mode | Swaps color palette to black/white/yellow |
| Font Size Control | 0.75x / 1.0x / 1.5x multiplier |
| TTS Toggle | On-demand screen reader announcements |
| Audio Feedback | Distinct sounds for X, O, win, draw, error |

Here's the styling system that enables this:

```typescript
const normalStyles = {
  cell: { font_size: 48, background_color: '#2196F3' }
};

const highContrastStyles = {
  cell: { font_size: 48, color: '#FFFFFF', background_color: '#000000' }
};

function applyStyles() {
  const baseStyles = highContrast ? highContrastStyles : normalStyles;
  const fontMultiplier = fontSize === 'large' ? 1.5 : 1;

  styles({
    cell: {
      ...baseStyles.cell,
      font_size: Math.round(baseStyles.cell.font_size * fontMultiplier)
    }
  });
}
```

Hardcoded styles can't adapt. Theme objects can.

## Difference #6: Recovery Mechanisms

The basic version has no undo. Make a mistake? Start over.

The accessible version maintains a move stack:

```typescript
let moveStack: { board: Board; player: Player }[] = [];

// Before each move:
moveStack.push({
  board: [...board],
  player: currentPlayer
});

// To undo:
function undoMove() {
  if (moveStack.length === 0) {
    announce('No moves to undo.', 'assertive');
    return;
  }

  const lastState = moveStack.pop()!;
  board = lastState.board;
  currentPlayer = lastState.player;
  // ... restore UI

  announce(`Move undone. ${currentPlayer}'s turn again.`, 'assertive');
}
```

For users with motor impairments who may mis-click, undo isn't a luxury—it's essential.

## The Priority System

Not all announcements are equal. Screen readers support two priority levels:

```typescript
announce('Player X\'s turn', 'polite');     // Queues after current speech
announce('Player X wins!', 'assertive');    // Interrupts immediately
```

Use `polite` for routine updates. Use `assertive` for game-changing events and errors.

## Bonus: Built-in Hints

The accessible version includes a hint system for beginners:

```typescript
function getHint(): number {
  // Check if opponent can win (block them)
  for (const [a, b, c] of lines) {
    const cells = [board[a], board[b], board[c]];
    if (cells.filter(x => x === opponent).length === 2 && cells.includes('')) {
      return [a, b, c].find(i => board[i] === '')!;
    }
  }

  // Take center if available
  if (board[4] === '') return 4;

  // Take a corner
  const corners = [0, 2, 6, 8].filter(i => board[i] === '');
  if (corners.length > 0) return corners[0];

  // Take any available
  return getAvailableMoves()[0];
}
```

This helps new players learn strategy without forcing them to lose repeatedly.

## What Could Still Be Improved

Even the accessible version has gaps:

1. **No visual focus indicator** - `currentFocus` tracks position but doesn't highlight the cell
2. **Keyboard shortcuts documented but not wired** - The code comments describe shortcuts that aren't implemented
3. **Audio is symbolic** - `playSound()` writes emoji to stdout rather than playing actual audio
4. **Debug logging in production** - Console statements should be removed

## The Real Lesson

Here's what I want you to take away:

> The accessible version isn't 4.6x more complex—the basic version is 4.6x less complete.

Every feature in the accessible version serves a purpose:
- Error messages help **everyone** understand why actions failed
- Semantic positions help **everyone** communicate about the game
- Undo helps **everyone** recover from mistakes
- Adjustable fonts help **everyone** with different screens and eyesight

Accessibility isn't extra work. It's the work we should have been doing all along.

## Try It Yourself

Both implementations are available in the [tsyne examples directory](https://github.com/pault-hammant/tsyne/tree/main/examples):

- `examples/tictactoe.ts` - Basic version (141 lines)
- `examples/tictactoe-accessible.ts` - Accessible version (656 lines)

Run them, compare them, and ask yourself: which one would you want to use?

---

*This post is part of a series on building accessible applications with TypeScript and Fyne. Follow along as we explore patterns for inclusive UI development.*
