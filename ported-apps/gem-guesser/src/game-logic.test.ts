/**
 * GemGuesser Game Logic Tests
 */

import {
  createGameState,
  generateGrid,
  calculateRowCounts,
  calculateColumnCounts,
  revealCell,
  isSegmentComplete,
  checkVictory,
  selectColor,
  selectNextAvailableColor,
  toggleGhostMark,
  getColoredCellCount,
  getGemColorHex,
  getGemColorFadedHex,
  getRemainingCount,
  GRID_SIZE,
  TOTAL_CELLS,
  COLORS,
  MAX_LIVES,
  type GameState,
  type GemColor,
  type Cell,
  type CellState,
  type Difficulty,
  type ColorSequence,
} from './game-logic';

// Seeded RNG for deterministic tests
function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

// Helper to create a minimal game state for testing
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    grid: new Array(TOTAL_CELLS).fill(null),
    cellStates: new Array<CellState>(TOTAL_CELLS).fill('hidden'),
    selectedColor: 'red',
    lives: MAX_LIVES,
    difficulty: 'easy',
    gameOver: false,
    won: false,
    remainingByColor: { red: 0, blue: 0, green: 0, purple: 0, orange: 0 },
    ghostMarks: {},
    ...overrides,
  };
}

// --- Grid generation ---

describe('generateGrid', () => {
  it('should create a grid of correct size', () => {
    const rng = createSeededRng(42);
    const { grid } = generateGrid(51, rng);
    expect(grid.length).toBe(TOTAL_CELLS);
  });

  it('should have the correct number of colored cells', () => {
    const rng = createSeededRng(42);
    const coloredCount = 51;
    const { grid } = generateGrid(coloredCount, rng);
    const actual = grid.filter((c) => c !== null).length;
    expect(actual).toBe(coloredCount);
  });

  it('should have no empty rows', () => {
    const rng = createSeededRng(123);
    const { grid } = generateGrid(32, rng);
    for (let row = 0; row < GRID_SIZE; row++) {
      let hasCell = false;
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row * GRID_SIZE + col] !== null) {
          hasCell = true;
          break;
        }
      }
      expect(hasCell).toBe(true);
    }
  });

  it('should have no empty columns', () => {
    const rng = createSeededRng(123);
    const { grid } = generateGrid(32, rng);
    for (let col = 0; col < GRID_SIZE; col++) {
      let hasCell = false;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row * GRID_SIZE + col] !== null) {
          hasCell = true;
          break;
        }
      }
      expect(hasCell).toBe(true);
    }
  });

  it('should only use valid colors', () => {
    const rng = createSeededRng(99);
    const { grid } = generateGrid(51, rng);
    for (const cell of grid) {
      if (cell !== null) {
        expect(COLORS).toContain(cell);
      }
    }
  });
});

describe('seeded RNG determinism', () => {
  it('should produce identical grids with the same seed', () => {
    const { grid: grid1 } = generateGrid(51, createSeededRng(42));
    const { grid: grid2 } = generateGrid(51, createSeededRng(42));
    expect(grid1).toEqual(grid2);
  });

  it('should produce different grids with different seeds', () => {
    const { grid: grid1 } = generateGrid(51, createSeededRng(42));
    const { grid: grid2 } = generateGrid(51, createSeededRng(99));
    expect(grid1).not.toEqual(grid2);
  });
});

// --- Row counts ---

describe('calculateRowCounts', () => {
  it('should return empty sequences for an empty row', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    const rowCounts = calculateRowCounts(grid);
    expect(rowCounts[0]).toEqual([]);
  });

  it('should detect a single color in a row', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'red';
    grid[2] = 'red';
    const rowCounts = calculateRowCounts(grid);
    expect(rowCounts[0]).toEqual([
      { color: 'red', count: 3, indices: [0, 1, 2] },
    ]);
  });

  it('should detect multiple sequences in a row', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'red';
    // null at index 2
    grid[3] = 'blue';
    grid[4] = 'blue';
    grid[5] = 'blue';
    const rowCounts = calculateRowCounts(grid);
    expect(rowCounts[0]).toEqual([
      { color: 'red', count: 2, indices: [0, 1] },
      { color: 'blue', count: 3, indices: [3, 4, 5] },
    ]);
  });

  it('should split sequences when color changes without null', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'blue';
    grid[2] = 'blue';
    const rowCounts = calculateRowCounts(grid);
    expect(rowCounts[0]).toEqual([
      { color: 'red', count: 1, indices: [0] },
      { color: 'blue', count: 2, indices: [1, 2] },
    ]);
  });

  it('should handle a fully colored row', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[col] = 'green';
    }
    const rowCounts = calculateRowCounts(grid);
    expect(rowCounts[0]).toEqual([
      { color: 'green', count: 8, indices: [0, 1, 2, 3, 4, 5, 6, 7] },
    ]);
  });
});

// --- Column counts ---

describe('calculateColumnCounts', () => {
  it('should return empty sequences for an empty column', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    const colCounts = calculateColumnCounts(grid);
    expect(colCounts[0]).toEqual([]);
  });

  it('should detect a single color in a column', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'blue';
    grid[8] = 'blue';
    grid[16] = 'blue';
    const colCounts = calculateColumnCounts(grid);
    expect(colCounts[0]).toEqual([
      { color: 'blue', count: 3, indices: [0, 8, 16] },
    ]);
  });

  it('should detect multiple sequences in a column', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[8] = 'red';
    // null at index 16
    grid[24] = 'green';
    const colCounts = calculateColumnCounts(grid);
    expect(colCounts[0]).toEqual([
      { color: 'red', count: 2, indices: [0, 8] },
      { color: 'green', count: 1, indices: [24] },
    ]);
  });

  it('should split sequences when color changes without null', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'purple';
    grid[8] = 'orange';
    grid[16] = 'orange';
    const colCounts = calculateColumnCounts(grid);
    expect(colCounts[0]).toEqual([
      { color: 'purple', count: 1, indices: [0] },
      { color: 'orange', count: 2, indices: [8, 16] },
    ]);
  });

  it('should handle a fully colored column', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row * GRID_SIZE] = 'orange';
    }
    const colCounts = calculateColumnCounts(grid);
    expect(colCounts[0]).toEqual([
      { color: 'orange', count: 8, indices: [0, 8, 16, 24, 32, 40, 48, 56] },
    ]);
  });
});

// --- Reveal cell ---

describe('revealCell', () => {
  it('should correctly reveal a matching cell', () => {
    const state = makeState({
      grid: (() => {
        const g: Cell[] = new Array(TOTAL_CELLS).fill(null);
        g[0] = 'red';
        return g;
      })(),
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 0, green: 0, purple: 0, orange: 0 },
    });

    const { state: newState, result } = revealCell(state, 0);
    expect(result).toBe('correct');
    expect(newState.cellStates[0]).toBe('revealed');
    expect(newState.remainingByColor.red).toBe(0);
  });

  it('should lose a life for wrong color', () => {
    const state = makeState({
      grid: (() => {
        const g: Cell[] = new Array(TOTAL_CELLS).fill(null);
        g[0] = 'blue';
        return g;
      })(),
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 1, green: 0, purple: 0, orange: 0 },
    });

    const { state: newState, result } = revealCell(state, 0);
    expect(result).toBe('wrong_color');
    expect(newState.lives).toBe(MAX_LIVES - 1);
    expect(newState.cellStates[0]).toBe('hidden');
  });

  it('should lose a life for empty cell', () => {
    const state = makeState({ selectedColor: 'red' });

    const { state: newState, result } = revealCell(state, 0);
    expect(result).toBe('empty');
    expect(newState.lives).toBe(MAX_LIVES - 1);
  });

  it('should not allow revealing already revealed cells', () => {
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    cellStates[0] = 'revealed';
    const state = makeState({
      cellStates,
      grid: (() => {
        const g: Cell[] = new Array(TOTAL_CELLS).fill(null);
        g[0] = 'red';
        return g;
      })(),
      selectedColor: 'red',
    });

    const { result } = revealCell(state, 0);
    expect(result).toBe('already_revealed');
  });

  it('should return no_color_selected when no color is selected', () => {
    const state = makeState({ selectedColor: null });
    const { result } = revealCell(state, 0);
    expect(result).toBe('no_color_selected');
  });

  it('should return game_over when game is already over', () => {
    const state = makeState({ gameOver: true });
    const { result } = revealCell(state, 0);
    expect(result).toBe('game_over');
  });

  it('should trigger game over when last life is lost', () => {
    const state = makeState({
      lives: 1,
      selectedColor: 'red',
    });
    // Click empty cell
    const { state: newState, result } = revealCell(state, 0);
    expect(result).toBe('empty');
    expect(newState.lives).toBe(0);
    expect(newState.gameOver).toBe(true);
    expect(newState.won).toBe(false);
  });

  it('should auto-select next color when current color depleted', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'blue';
    const state = makeState({
      grid,
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 1, green: 0, purple: 0, orange: 0 },
    });

    const { state: newState } = revealCell(state, 0);
    expect(newState.remainingByColor.red).toBe(0);
    expect(newState.selectedColor).toBe('blue');
  });
});

// --- Victory detection ---

describe('checkVictory', () => {
  it('should return true when all colored cells are revealed', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    grid[0] = 'red';
    grid[1] = 'blue';
    cellStates[0] = 'revealed';
    cellStates[1] = 'revealed';
    const state = makeState({ grid, cellStates });
    expect(checkVictory(state)).toBe(true);
  });

  it('should return false when some colored cells are still hidden', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    grid[0] = 'red';
    grid[1] = 'blue';
    cellStates[0] = 'revealed';
    // cellStates[1] still hidden
    const state = makeState({ grid, cellStates });
    expect(checkVictory(state)).toBe(false);
  });

  it('should return true for an all-empty grid', () => {
    const state = makeState();
    expect(checkVictory(state)).toBe(true);
  });
});

// --- Lives system ---

describe('lives system', () => {
  it('should start with 3 lives', () => {
    const state = createGameState('easy', createSeededRng(42));
    expect(state.lives).toBe(MAX_LIVES);
  });

  it('should decrement on wrong guess', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'blue';
    const state = makeState({
      grid,
      selectedColor: 'red',
      lives: 3,
      remainingByColor: { red: 1, blue: 1, green: 0, purple: 0, orange: 0 },
    });
    const { state: s1 } = revealCell(state, 0);
    expect(s1.lives).toBe(2);
  });

  it('should trigger game over at 0 lives', () => {
    const state = makeState({ lives: 1, selectedColor: 'red' });
    const { state: s1 } = revealCell(state, 0); // empty cell
    expect(s1.lives).toBe(0);
    expect(s1.gameOver).toBe(true);
  });

  it('should not allow actions after game over', () => {
    const state = makeState({ gameOver: true, lives: 0 });
    const { result } = revealCell(state, 0);
    expect(result).toBe('game_over');
  });
});

// --- Color selection ---

describe('selectColor', () => {
  it('should select a valid color', () => {
    const state = makeState({
      remainingByColor: { red: 5, blue: 3, green: 0, purple: 0, orange: 0 },
    });
    const newState = selectColor(state, 'blue');
    expect(newState.selectedColor).toBe('blue');
  });

  it('should not select a color with zero remaining', () => {
    const state = makeState({
      selectedColor: 'red',
      remainingByColor: { red: 5, blue: 0, green: 0, purple: 0, orange: 0 },
    });
    const newState = selectColor(state, 'blue');
    expect(newState.selectedColor).toBe('red'); // unchanged
  });

  it('should allow changing the selected color', () => {
    const state = makeState({
      selectedColor: 'red',
      remainingByColor: { red: 5, blue: 3, green: 0, purple: 0, orange: 0 },
    });
    const newState = selectColor(state, 'blue');
    expect(newState.selectedColor).toBe('blue');
  });

  it('selectNextAvailableColor should pick least common', () => {
    const state = makeState({
      selectedColor: null,
      remainingByColor: { red: 10, blue: 3, green: 5, purple: 0, orange: 0 },
    });
    const newState = selectNextAvailableColor(state);
    expect(newState.selectedColor).toBe('blue');
  });
});

// --- Ghost marks ---

describe('toggleGhostMark', () => {
  it('should place a ghost mark', () => {
    const state = makeState({ selectedColor: 'red' });
    const newState = toggleGhostMark(state, 5);
    expect(newState.ghostMarks[5]).toBe('red');
  });

  it('should remove ghost mark when toggling same color', () => {
    const state = makeState({
      selectedColor: 'red',
      ghostMarks: { 5: 'red' },
    });
    const newState = toggleGhostMark(state, 5);
    expect(newState.ghostMarks[5]).toBeUndefined();
  });

  it('should change ghost mark to different color', () => {
    const state = makeState({
      selectedColor: 'blue',
      ghostMarks: { 5: 'red' },
      remainingByColor: { red: 1, blue: 1, green: 0, purple: 0, orange: 0 },
    });
    const newState = toggleGhostMark(state, 5);
    expect(newState.ghostMarks[5]).toBe('blue');
  });

  it('should not place ghost mark on revealed cell', () => {
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    cellStates[5] = 'revealed';
    const state = makeState({ selectedColor: 'red', cellStates });
    const newState = toggleGhostMark(state, 5);
    expect(newState.ghostMarks[5]).toBeUndefined();
  });

  it('should not place ghost mark without selected color', () => {
    const state = makeState({ selectedColor: null });
    const newState = toggleGhostMark(state, 5);
    expect(newState.ghostMarks[5]).toBeUndefined();
  });
});

// --- Segment completion ---

describe('isSegmentComplete', () => {
  it('should return true when all cells in segment are revealed', () => {
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    cellStates[0] = 'revealed';
    cellStates[1] = 'revealed';
    cellStates[2] = 'revealed';
    const seq: ColorSequence = { color: 'red', count: 3, indices: [0, 1, 2] };
    expect(isSegmentComplete(seq, cellStates)).toBe(true);
  });

  it('should return false when some cells are hidden', () => {
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    cellStates[0] = 'revealed';
    // index 1 still hidden
    cellStates[2] = 'revealed';
    const seq: ColorSequence = { color: 'red', count: 3, indices: [0, 1, 2] };
    expect(isSegmentComplete(seq, cellStates)).toBe(false);
  });

  it('should return false when no cells are revealed', () => {
    const cellStates: CellState[] = new Array<CellState>(TOTAL_CELLS).fill('hidden');
    const seq: ColorSequence = { color: 'blue', count: 2, indices: [10, 11] };
    expect(isSegmentComplete(seq, cellStates)).toBe(false);
  });
});

// --- Difficulty settings ---

describe('getColoredCellCount', () => {
  it('should return correct count for easy', () => {
    expect(getColoredCellCount('easy')).toBe(51); // floor(64 * 0.80)
  });

  it('should return correct count for medium', () => {
    expect(getColoredCellCount('medium')).toBe(41); // floor(64 * 0.65)
  });

  it('should return correct count for hard', () => {
    expect(getColoredCellCount('hard')).toBe(32); // floor(64 * 0.50)
  });
});

// --- State immutability ---

describe('state immutability', () => {
  it('revealCell should not mutate original state', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    const state = makeState({
      grid,
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 0, green: 0, purple: 0, orange: 0 },
    });
    const originalCellStates = [...state.cellStates];
    const originalRemaining = { ...state.remainingByColor };

    revealCell(state, 0);

    expect(state.cellStates).toEqual(originalCellStates);
    expect(state.remainingByColor).toEqual(originalRemaining);
  });

  it('selectColor should not mutate original state', () => {
    const state = makeState({
      selectedColor: 'red',
      remainingByColor: { red: 5, blue: 3, green: 0, purple: 0, orange: 0 },
    });
    selectColor(state, 'blue');
    expect(state.selectedColor).toBe('red');
  });

  it('toggleGhostMark should not mutate original state', () => {
    const state = makeState({ selectedColor: 'red', ghostMarks: {} });
    toggleGhostMark(state, 5);
    expect(state.ghostMarks[5]).toBeUndefined();
  });
});

// --- Color utilities ---

describe('getGemColorHex', () => {
  it('should return correct hex values', () => {
    expect(getGemColorHex('red')).toBe('#e74c3c');
    expect(getGemColorHex('blue')).toBe('#3498db');
    expect(getGemColorHex('green')).toBe('#27ae60');
    expect(getGemColorHex('purple')).toBe('#9b59b6');
    expect(getGemColorHex('orange')).toBe('#f39c12');
  });

  it('should return faded hex values', () => {
    expect(getGemColorFadedHex('red')).toBe('#f4a6a0');
    expect(getGemColorFadedHex('blue')).toBe('#a3cde8');
  });
});

describe('getRemainingCount', () => {
  it('should return the remaining count for a color', () => {
    const state = makeState({
      remainingByColor: { red: 7, blue: 3, green: 5, purple: 2, orange: 1 },
    });
    expect(getRemainingCount(state, 'red')).toBe(7);
    expect(getRemainingCount(state, 'orange')).toBe(1);
  });
});

// --- createGameState ---

describe('createGameState', () => {
  it('should create a valid initial state', () => {
    const state = createGameState('easy', createSeededRng(42));
    expect(state.lives).toBe(MAX_LIVES);
    expect(state.gameOver).toBe(false);
    expect(state.won).toBe(false);
    expect(state.difficulty).toBe('easy');
    expect(state.grid.length).toBe(TOTAL_CELLS);
    expect(state.cellStates.length).toBe(TOTAL_CELLS);
  });

  it('should auto-select a color', () => {
    const state = createGameState('easy', createSeededRng(42));
    expect(state.selectedColor).not.toBeNull();
    expect(COLORS).toContain(state.selectedColor);
  });

  it('should have consistent remaining counts', () => {
    const state = createGameState('medium', createSeededRng(42));
    let total = 0;
    for (const color of COLORS) {
      total += state.remainingByColor[color];
    }
    expect(total).toBe(getColoredCellCount('medium'));
  });

  it('should start with all cells hidden', () => {
    const state = createGameState('easy', createSeededRng(42));
    for (const cs of state.cellStates) {
      expect(cs).toBe('hidden');
    }
  });
});

// --- Integration tests ---

describe('integration: full game flow', () => {
  it('should handle a correct guess sequence leading to victory', () => {
    // Create a tiny scenario: only 2 colored cells
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'red';
    let state = makeState({
      grid,
      selectedColor: 'red',
      remainingByColor: { red: 2, blue: 0, green: 0, purple: 0, orange: 0 },
    });

    const r1 = revealCell(state, 0);
    expect(r1.result).toBe('correct');
    state = r1.state;
    expect(state.won).toBe(false);

    const r2 = revealCell(state, 1);
    expect(r2.result).toBe('correct');
    state = r2.state;
    expect(state.won).toBe(true);
    expect(state.gameOver).toBe(true);
  });

  it('should handle losing all lives', () => {
    let state = makeState({
      selectedColor: 'red',
      lives: 3,
    });

    // Three wrong guesses on empty cells
    let r = revealCell(state, 0);
    state = r.state;
    expect(state.lives).toBe(2);
    expect(state.gameOver).toBe(false);

    r = revealCell(state, 1);
    state = r.state;
    expect(state.lives).toBe(1);
    expect(state.gameOver).toBe(false);

    r = revealCell(state, 2);
    state = r.state;
    expect(state.lives).toBe(0);
    expect(state.gameOver).toBe(true);
    expect(state.won).toBe(false);
  });

  it('should handle mixed correct and wrong guesses', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    grid[1] = 'blue';
    grid[2] = 'red';
    let state = makeState({
      grid,
      selectedColor: 'red',
      lives: 3,
      remainingByColor: { red: 2, blue: 1, green: 0, purple: 0, orange: 0 },
    });

    // Correct guess
    let r = revealCell(state, 0);
    expect(r.result).toBe('correct');
    state = r.state;
    expect(state.lives).toBe(3);

    // Wrong color (cell is blue, selected is red)
    r = revealCell(state, 1);
    expect(r.result).toBe('wrong_color');
    state = r.state;
    expect(state.lives).toBe(2);

    // Correct guess
    state = selectColor(state, 'red');
    r = revealCell(state, 2);
    expect(r.result).toBe('correct');
    state = r.state;

    // Now select blue and reveal last cell
    state = selectColor(state, 'blue');
    r = revealCell(state, 1);
    expect(r.result).toBe('correct');
    state = r.state;
    expect(state.won).toBe(true);
  });
});

// --- Ghost marks cleared on reveal ---

describe('ghost marks interaction with reveal', () => {
  it('should clear ghost mark when cell is correctly revealed', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    const state = makeState({
      grid,
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 0, green: 0, purple: 0, orange: 0 },
      ghostMarks: { 0: 'red' },
    });

    const { state: newState } = revealCell(state, 0);
    expect(newState.ghostMarks[0]).toBeUndefined();
  });
});

// --- Edge cases ---

describe('edge cases', () => {
  it('should handle revealing cell at grid boundary', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[63] = 'orange'; // last cell
    const state = makeState({
      grid,
      selectedColor: 'orange',
      remainingByColor: { red: 0, blue: 0, green: 0, purple: 0, orange: 1 },
    });

    const { state: newState, result } = revealCell(state, 63);
    expect(result).toBe('correct');
    expect(newState.cellStates[63]).toBe('revealed');
  });

  it('should handle all colors having remaining count of 0 after depletion', () => {
    const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
    grid[0] = 'red';
    const state = makeState({
      grid,
      selectedColor: 'red',
      remainingByColor: { red: 1, blue: 0, green: 0, purple: 0, orange: 0 },
    });

    const { state: newState } = revealCell(state, 0);
    expect(newState.selectedColor).toBeNull(); // no colors left
  });
});
