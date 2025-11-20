# Braille Display Accessibility

Braille users interact with computers using **refreshable braille displays** - hardware devices with pins that raise and lower to form braille characters. Their needs differ significantly from audio-only screen reader users.

## Key Differences: Braille vs Audio

| Aspect | Audio Screen Reader | Braille Display |
|--------|-------------------|----------------|
| **Reading Speed** | 250-400 wpm (fast) | 100-125 wpm (slower) |
| **Comprehension** | Sequential, temporary | Spatial, persistent |
| **Navigation** | Jump around quickly | Read carefully, tab through |
| **Multitasking** | Difficult (audio conflicts) | Easier (visual persistence) |
| **Spelling** | Harder to catch | Excellent for exact text |
| **Tables/Lists** | Difficult to navigate | Natural with structure |
| **Numbers** | Can be ambiguous | Clear and precise |

## What Braille Users Need

### 1. **Concise, Structured Labels**

Braille is **slower to read** than audio, so brevity matters:

```typescript
// ❌ TOO VERBOSE for braille
.accessibility({
  label: "This is the submit button that will submit the form",
  description: "Click this button or press Enter to submit..."
})

// ✅ CONCISE for braille
.accessibility({
  label: "Submit",           // Just 6 braille cells
  description: "Submits form",  // Clear and brief
  role: "button"
})
```

### 2. **Standard Abbreviations**

Experienced braille users know common abbreviations:

```typescript
// Common braille abbreviations
"btn" instead of "button"
"chk" instead of "checkbox"
"lbl" instead of "label"
"txt" instead of "text"
"calc" instead of "calculator"

// For Tic-Tac-Toe
"pos" instead of "position"
"col" instead of "column"
"mv" instead of "move"

// Example
.accessibility({
  label: "Cell R1C1",  // Row 1, Column 1 (concise)
  hint: "Empty. Press Space to place X"
})
```

### 3. **Clear Structure & Landmarks**

Braille displays need **logical structure** to navigate:

```typescript
// Use proper heading levels
a.label("Tic-Tac-Toe Game")
  .accessibility({
    role: "heading",
    level: 1  // H1 - main heading
  });

a.label("Game Controls")
  .accessibility({
    role: "heading",
    level: 2  // H2 - subsection
  });

// Group related controls
a.vbox(() => {
  // Game board section
}).accessibility({
  role: "region",
  label: "Game Board"
});

a.vbox(() => {
  // Move history section
}).accessibility({
  role: "region",
  label: "Move History"
});
```

### 4. **Logical Tab Order**

Braille users **tab through everything** - make it logical:

```typescript
// ✅ GOOD: Top to bottom, left to right
// 1. Accessibility controls
// 2. Game status
// 3. Board cells (row 1, row 2, row 3)
// 4. Game controls (New, Undo, Hint)
// 5. Move history

// ❌ BAD: Random order
// 1. Cell 7
// 2. Undo button
// 3. Cell 2
// 4. Status
// ...
```

### 5. **State in Labels (Not Just Description)**

Braille users read labels first, so include state:

```typescript
// ❌ BAD: State only in description
.accessibility({
  label: "Cell",
  description: "Currently has X"  // User must read description
})

// ✅ GOOD: State in label
.accessibility({
  label: "Cell: X",     // Immediately know state
  description: "Row 1, Column 1"
})

// For buttons with state
.accessibility({
  label: "TTS: ON",     // State visible immediately
  role: "switch"
})
```

### 6. **Grid/Table Structure**

Braille displays can navigate tables efficiently:

```typescript
// For Tic-Tac-Toe, use table semantics
a.grid(3, () => {
  // Each cell
}).accessibility({
  role: "grid",  // Not just "region"
  label: "Game Board 3x3"
});

// Each cell should know its position
cellButton.accessibility({
  role: "gridcell",
  label: board[i] || "Empty",
  row: Math.floor(i / 3) + 1,
  column: (i % 3) + 1
});
```

### 7. **Lists for Sequential Data**

Use proper list markup for history:

```typescript
// Move history as a list
a.vbox(() => {
  moveHistory.forEach(move => {
    a.label(move).accessibility({
      role: "listitem"
    });
  });
}).accessibility({
  role: "list",
  label: "Move History"
});

// Braille display shows:
// * X at R1C1
// * O at R2C2
// * X at R1C3
// List of 3 items
```

### 8. **Status Updates (Concise)**

Braille users prefer **brief status messages**:

```typescript
// ❌ TOO VERBOSE
announce("Player X has made a move at the top left position in row 1 column 1");

// ✅ CONCISE
announce("X at R1C1");  // Row 1, Column 1

// ❌ TOO VERBOSE
announce("The game has ended and Player O is the winner!");

// ✅ CONCISE
announce("O wins");
```

### 9. **Keyboard Shortcuts with Hints**

Braille users rely on keyboard - tell them shortcuts:

```typescript
.accessibility({
  label: "New Game",
  description: "Start a new game",
  hint: "Press N"  // Keyboard shortcut in hint
})

// For cells
.accessibility({
  label: `Cell R${row}C${col}: ${value || 'Empty'}`,
  hint: "Arrow keys to navigate, Space to play"
})
```

### 10. **Error Messages Near Fields**

Errors must be **spatially close** in tab order:

```typescript
// ❌ BAD: Error at top, field at bottom
[Error: Invalid move] ... [Board] ... [Cell 5]

// ✅ GOOD: Error near the cell
[Cell 5] [Error: Cell occupied]

// Implementation
function makeMove(index: number) {
  if (board[index] !== '') {
    // Update cell's description with error
    cellButtons[index].accessibility({
      label: `Cell R${row}C${col}: ${board[index]}`,
      description: "Error: Cell occupied. Choose another.",
      role: "gridcell"
    });
  }
}
```

## Tic-Tac-Toe for Braille Users

### Optimized Labels

```typescript
// Standard verbose version
.accessibility({
  label: "Cell at top left position",
  description: "Row 1, Column 1. Currently empty. Press Space to place X.",
  role: "button"
})

// Braille-optimized version
.accessibility({
  label: "R1C1: Empty",  // Just 10 braille cells vs 50+
  description: "Space to play",
  role: "gridcell"
})
```

### Grid Structure

```typescript
// Proper grid semantics
a.grid(3, () => {
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3) + 1;
    const col = (i % 3) + 1;
    const value = board[i] || "Empty";

    a.button(value, () => makeMove(i))
      .accessibility({
        role: "gridcell",
        label: `R${row}C${col}: ${value}`,
        row: row,
        column: col,
        hint: "Space to play"
      });
  }
}).accessibility({
  role: "grid",
  label: "Board 3x3",
  rowcount: 3,
  colcount: 3
});
```

### Status Line (Concise)

```typescript
// Instead of long announcements
statusLabel.setText("Player X's turn");
statusLabel.accessibility({
  role: "status",
  label: "Turn: X"  // Braille: just 7 cells
});

// When game ends
statusLabel.setText("X wins!");
statusLabel.accessibility({
  role: "status",
  label: "Winner: X"  // Clear and brief
});
```

### Move History (Structured List)

```typescript
// Each move as list item
moveHistory = [
  "1. X R1C1",
  "2. O R2C2",
  "3. X R1C3",
  "4. O R2C1",
  "5. X R1C2 (wins)"
];

// With proper list semantics
a.vbox(() => {
  moveHistory.forEach((move, i) => {
    a.label(move).accessibility({
      role: "listitem",
      label: move,
      index: i + 1
    });
  });
}).accessibility({
  role: "list",
  label: "Moves",
  itemcount: moveHistory.length
});
```

## Calculator for Braille Users

### Button Layout (Logical Grid)

```typescript
// Braille users navigate with Tab/Shift+Tab
// Make tab order follow visual layout

// Display
[0]

// Number pad (3x4 grid with proper gridcell roles)
[7] [8] [9] [÷]
[4] [5] [6] [×]
[1] [2] [3] [-]
[0] [C] [=] [+]

// Each button
a.button("7", () => handleNumber("7"))
  .accessibility({
    role: "gridcell",
    label: "7",  // Just "7", not "Number seven button"
    row: 1,
    column: 1
  });
```

### Display Value (Structured)

```typescript
// Display should update in real-time
display.accessibility({
  role: "status",      // Auto-announces changes
  label: currentValue, // Just the number
  live: "polite"       // Don't interrupt
});

// Example braille output:
// "12345" (5 cells)
// vs verbose: "The current display value is twelve thousand three hundred forty-five"
```

### Operation Mode Indicator

```typescript
// Show current operation
statusLabel.accessibility({
  role: "status",
  label: operator ? `Op: ${operator}` : "Entry"
});

// Braille shows:
// "Op: +" when adding
// "Entry" when entering number
```

## Best Practices for Braille

### 1. **Use Abbreviations Wisely**

```typescript
// Common abbreviations braille users know
const brailleAbbreviations = {
  "button": "btn",
  "checkbox": "chk",
  "label": "lbl",
  "textbox": "txt",
  "heading": "hdg",
  "navigation": "nav",
  "region": "rgn",
  "application": "app"
};

// But don't over-abbreviate
"Submit" is fine, don't shorten to "Sbmt"
```

### 2. **Front-Load Important Info**

```typescript
// ❌ BAD: Important info at end
label: "You can place your X or O mark at this cell which is in row 1, column 1"

// ✅ GOOD: Important info first
label: "R1C1: Empty"
```

### 3. **Use Standard ARIA Patterns**

```typescript
// Braille displays optimize for standard roles
role: "button"      // Braille: "btn"
role: "heading"     // Braille: "h1", "h2", etc.
role: "list"        // Braille: "list of X items"
role: "listitem"    // Braille: "*" bullet
role: "grid"        // Braille: "tbl" (table)
role: "gridcell"    // Braille navigates efficiently
role: "status"      // Braille: updates shown
```

### 4. **Numbers: Use Digits, Not Words**

```typescript
// ❌ BAD: Spelled out
label: "Row one, column three"

// ✅ GOOD: Digits
label: "R1C3"  // Braille has specific number notation

// For large numbers
value: "12345"  // Not "twelve thousand three hundred forty-five"
```

### 5. **Provide Skip Links**

```typescript
// Let braille users jump to main content
a.button("Skip to game board", () => focusGameBoard())
  .accessibility({
    role: "link",
    label: "Skip to board"
  });
```

### 6. **Mark Current Location**

```typescript
// Show where user is in the app
a.label("Game Board")
  .accessibility({
    role: "heading",
    level: 2,
    current: "page"  // Indicates current section
  });
```

## Testing for Braille

### Braille Display Simulators

```bash
# NVDA (Windows) - Free
# Shows braille output in a window
https://www.nvaccess.org/

# JAWS (Windows) - Commercial
# Virtual braille display
https://www.freedomscientific.com/

# Emacspeak (Linux) - Free
# Console-based braille emulator
```

### Testing Checklist

```
✓ Tab order is logical (top to bottom, left to right)
✓ All interactive elements are reachable via keyboard
✓ Labels are concise (under 20 characters when possible)
✓ State is in label, not just description
✓ Grid/table structure is proper (role="grid" or "table")
✓ Lists use proper markup (role="list", role="listitem")
✓ Headings create clear hierarchy (h1, h2, h3)
✓ Status updates are brief (under 30 characters)
✓ Abbreviations are standard (btn, chk, lbl)
✓ Numbers use digits (R1C1) not words
✓ Skip links are available
✓ Current location is marked
```

## Example: Braille-Optimized Tic-Tac-Toe

```typescript
// Concise labels throughout
ttsToggle.accessibility({
  role: "switch",
  label: "TTS: OFF",  // 8 cells vs 40+
  hint: "T to toggle"
});

// Grid with proper structure
gameBoard.accessibility({
  role: "grid",
  label: "Board 3x3",
  rowcount: 3,
  colcount: 3
});

// Cells with front-loaded info
cellButton.accessibility({
  role: "gridcell",
  label: `R${row}C${col}: ${board[i] || 'Empty'}`,  // "R1C1: X"
  row: row,
  column: col,
  hint: "Space to play"
});

// Status (brief)
statusLabel.accessibility({
  role: "status",
  label: gameState === 'won' ? `Winner: ${winner}` :
         gameState === 'draw' ? 'Draw' :
         `Turn: ${currentPlayer}`
});

// History (structured list)
historyList.accessibility({
  role: "list",
  label: "Moves",
  itemcount: moveHistory.length
});

moveHistory.forEach((move, i) => {
  historyItem.accessibility({
    role: "listitem",
    label: `${i+1}. ${move}`  // "1. X R1C1"
  });
});
```

## Key Takeaways

1. **Braille is slower** - Be concise (aim for <20 characters)
2. **Structure matters** - Use grids, lists, headings
3. **State in labels** - Don't hide state in descriptions
4. **Logical tab order** - Top to bottom, left to right
5. **Standard abbreviations** - btn, chk, lbl, etc.
6. **Digits not words** - R1C1, not "row one column one"
7. **Front-load info** - Important stuff first
8. **Spatial awareness** - Braille users "see" with their fingers
9. **Keyboard only** - Every action must be keyboard accessible
10. **Brief updates** - Status changes should be <30 characters

## Resources

- [Braille Authority of North America](http://www.brailleauthority.org/)
- [Unified English Braille (UEB)](https://www.ukaaf.org/ueb/)
- [WebAIM: Designing for Braille](https://webaim.org/articles/braille/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Braille Display Emulators](https://github.com/nvaccess/nvda/wiki/Braille-Display-Drivers)

## Braille-Specific ARIA Attributes

```typescript
// For Tsyne widgets
interface BrailleAccessibilityOptions extends AccessibilityOptions {
  // Standard ARIA
  role: string;           // Rendered in braille shorthand
  label: string;          // Main braille output (keep brief!)
  description?: string;   // Secondary output

  // For grids
  row?: number;          // Row position in grid
  column?: number;       // Column position in grid
  rowcount?: number;     // Total rows
  colcount?: number;     // Total columns

  // For lists
  itemcount?: number;    // Number of items
  index?: number;        // Current item index

  // For headings
  level?: number;        // h1-h6

  // For status
  live?: 'polite' | 'assertive';  // Update priority

  // For navigation
  current?: 'page' | 'step' | 'location';  // Mark current location
}
```

By optimizing for braille displays, you make your Fyne UI accessible to a critical user group who relies on tactile feedback for computer interaction.
