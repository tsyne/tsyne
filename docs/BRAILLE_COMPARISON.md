# Braille vs Audio Screen Reader: Label Comparison

This document compares accessibility labels optimized for **audio screen readers** vs **braille displays**.

## Key Principle: Brevity for Braille

**Braille reading speed:** 100-125 words per minute
**Audio reading speed:** 250-400 words per minute (2-3× faster!)

**Braille is slower** - every character counts.

## Tic-Tac-Toe Label Comparison

### Game Status

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Player Turn** | "Player X's turn to make a move" | "Turn: X" | 29 → 7 chars (77%) |
| **Winner** | "Player O has won the game!" | "Winner: O" | 29 → 9 chars (69%) |
| **Draw** | "Game is drawn, no more moves" | "Draw" | 30 → 4 chars (87%) |
| **Error** | "This cell is already occupied" | "Occupied" | 31 → 8 chars (74%) |

### Cell Labels

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Empty Cell** | "Cell at top left, currently empty" | "R1C1: Empty" | 35 → 11 chars (69%) |
| **X Cell** | "Cell at center, currently has X" | "R2C2: X" | 34 → 8 chars (76%) |
| **O Cell** | "Cell at bottom right, currently has O" | "R3C3: O" | 40 → 8 chars (80%) |

### Button Labels

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **New Game** | "Start a new game" | "New" | 18 → 3 chars (83%) |
| **Undo** | "Undo the last move" | "Undo" | 19 → 4 chars (79%) |
| **Hint** | "Get a hint for your next move" | "Hint" | 31 → 4 chars (87%) |
| **TTS Toggle** | "Text-to-Speech: Enabled" | "TTS: ON" | 24 → 7 chars (71%) |

### Move Announcements

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Move** | "Player X placed at top left position, row 1, column 1" | "X R1C1" | 56 → 6 chars (89%) |
| **History** | "Move 1: Player X placed at center" | "1. X R2C2" | 35 → 9 chars (74%) |
| **Undo** | "Move has been undone, Player X's turn again" | "Undone" | 45 → 6 chars (87%) |

## Calculator Label Comparison

### Display Value

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Number** | "The current display value is forty-two" | "42" | 40 → 2 chars (95%) |
| **Result** | "The calculation result is one hundred twenty-three" | "123" | 52 → 3 chars (94%) |
| **Error** | "Error: Invalid calculation, cannot divide by zero" | "Error" | 51 → 5 chars (90%) |

### Button Labels

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Number 7** | "Number seven button" | "7" | 20 → 1 char (95%) |
| **Divide** | "Division operator button" | "÷" | 26 → 1 char (96%) |
| **Equals** | "Calculate the result" | "=" | 20 → 1 char (95%) |
| **Clear** | "Clear the calculator display" | "C" | 30 → 1 char (97%) |

### Status

| Context | Audio-Optimized | Braille-Optimized | Savings |
|---------|----------------|-------------------|---------|
| **Operation** | "Currently in addition mode" | "Op: +" | 28 → 5 chars (82%) |
| **Entry** | "Entering a number" | "Entry" | 17 → 5 chars (71%) |
| **History** | "Last five calculations performed" | "History" | 33 → 7 chars (79%) |

## Braille Cell Counts

Braille displays typically show **40-80 cells** at a time. Here's how much fits:

### 40-Cell Display

**Audio-Optimized:**
```
"Cell at top left, currently empty"
[**********34 cells used**********] (fits, but tight)
```

**Braille-Optimized:**
```
"R1C1: Empty"
[***11 cells***] (29 cells remaining for other info)
```

### Complete Screen Example

**Audio-Optimized (runs off screen):**
```
"Player X's turn to make a move, Cell at center has X, Cell at top left is empty, Cell at..."
[**********************80+ cells, truncated************************]
```

**Braille-Optimized (fits comfortably):**
```
"Turn: X | R2C2: X | R1C1: Empty | R1C2: Empty"
[*******************48 cells******************]
```

## Real-World Impact

### Example: Navigating Tic-Tac-Toe Board

**Audio-Optimized (verbose):**
```
User tabs to cell 1:
  "Cell at top left position, row 1, column 1, currently empty, press Space or Enter to place your mark"
  → ~100 cells, takes 5-6 seconds to read

User tabs to cell 2:
  "Cell at top center position, row 1, column 2, currently has X, this cell is already occupied"
  → ~100 cells, another 5-6 seconds

Total for 9 cells: ~45-54 seconds just to scan the board
```

**Braille-Optimized (concise):**
```
User tabs to cell 1:
  "R1C1: Empty"
  → 11 cells, <1 second to read

User tabs to cell 2:
  "R1C2: X"
  → 7 cells, <1 second to read

Total for 9 cells: ~9 seconds to scan the board (5× faster!)
```

### Example: Game Status Changes

**Audio-Optimized:**
```
"Player X's turn to make a move"  (29 chars)
  → User makes move
"Player O's turn to make a move"  (29 chars)
  → User makes move
"Player X has won the game!"      (27 chars)

Total: 85 characters, ~15 seconds to read all announcements
```

**Braille-Optimized:**
```
"Turn: X"   (7 chars)
  → User makes move
"Turn: O"   (7 chars)
  → User makes move
"Winner: X" (9 chars)

Total: 23 characters, ~5 seconds to read (3× faster!)
```

## Best Practices Summary

### ✅ DO for Braille

1. **Front-load state:** `"R1C1: X"` not `"X at R1C1"`
2. **Use abbreviations:** `"Turn: X"` not `"Player X's turn"`
3. **Be concise:** `"Occupied"` not `"This cell is already occupied"`
4. **Use digits:** `"R1C1"` not `"row 1, column 1"`
5. **Omit redundancy:** `"New"` not `"New Game Button"`

### ❌ DON'T for Braille

1. **Don't spell out numbers:** ~~"row one"~~ → `"R1"`
2. **Don't repeat role in label:** ~~"Submit Button"~~ → `"Submit"` (role is shown separately)
3. **Don't over-describe:** ~~"This is the cell at..."~~ → `"R1C1: X"`
4. **Don't use long hints:** ~~"Press Space or Enter to place"~~ → `"Space"`
5. **Don't hide state:** ~~label="Cell", description="has X"~~ → `label="R1C1: X"`

## Code Comparison

### Audio-Optimized Implementation

```typescript
// Verbose labels for audio clarity
a.button(board[i], () => makeMove(i))
  .accessibility({
    label: `Cell at ${getCellDescription(i)}`,
    description: `${getCellCoordinates(i)}. Currently ${getCellValue(i)}. Press Space or Enter to place your mark.`,
    role: "button",
    hint: `${getCellDescription(i)} position. Use arrow keys to navigate between cells.`
  });

// Output: ~150 characters for full description
```

### Braille-Optimized Implementation

```typescript
// Concise labels for braille efficiency
a.button(board[i], () => makeMove(i))
  .accessibility({
    role: "gridcell",  // More semantic
    label: `${getBriefPosition(i)}: ${getCellValue(i)}`,  // "R1C1: X"
    row: Math.floor(i / 3) + 1,
    column: (i % 3) + 1,
    hint: "Space"  // Just the key
  });

// Output: ~20 characters for full description (7.5× shorter!)
```

## Testing Results

### User Study Simulation

**Task:** Understand complete game state (9 cells + status)

**Audio-Optimized Labels:**
- Time to read all cells: ~54 seconds
- Time to understand who's winning: ~8 seconds
- Total: ~62 seconds

**Braille-Optimized Labels:**
- Time to read all cells: ~9 seconds
- Time to understand who's winning: ~2 seconds
- Total: ~11 seconds

**Result: 5.6× faster with braille-optimized labels!**

## Accessibility Equivalence

Both approaches provide **equivalent accessibility** - they just optimize for different modalities:

| Aspect | Audio | Braille |
|--------|-------|---------|
| **Completeness** | ✅ Full context | ✅ Full context |
| **Accuracy** | ✅ Accurate | ✅ Accurate |
| **Usability** | ✅ Clear | ✅ Clear |
| **Speed** | Fast audio (250+ wpm) | Fast braille (concise) |
| **Optimization** | Verbose OK | Brief essential |

## Recommendations

### For Tsyne Applications

1. **Provide both label styles:**
   ```typescript
   .accessibility({
     label: "R1C1: X",              // Braille-optimized
     description: "Row 1, Column 1 has X"  // Audio context
   })
   ```

2. **Let users choose:**
   ```typescript
   const labelStyle = userPrefersBraille ? 'brief' : 'verbose';
   ```

3. **Use semantic structure:**
   ```typescript
   role: "gridcell"  // Braille displays optimize for this
   row: 1, column: 1 // Provides structure
   ```

4. **Front-load important info:**
   ```typescript
   label: "Winner: X"  // Not "X is the winner"
   ```

5. **Test with both modalities:**
   - NVDA with virtual braille viewer
   - JAWS with braille display emulator
   - Real braille display if possible

By understanding the differences between audio and braille users, you can create truly accessible applications that work efficiently for all users.
