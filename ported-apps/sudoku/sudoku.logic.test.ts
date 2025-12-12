/**
 * Sudoku Game Logic Unit Tests
 */

import { SudokuGrid, SudokuGenerator, SudokuGame, GRID_SIZE, BOX_SIZE } from './sudoku';

describe('SudokuGrid', () => {
  test('should initialize with all zeros', () => {
    const grid = new SudokuGrid();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        expect(grid.getValue(col, row)).toBe(0);
      }
    }
  });

  test('should set and get values correctly', () => {
    const grid = new SudokuGrid();
    grid.setValue(3, 5, 7);
    expect(grid.getValue(3, 5)).toBe(7);
  });

  test('should detect row conflicts', () => {
    const grid = new SudokuGrid();
    grid.setValue(0, 0, 5);
    grid.setValue(4, 0, 5);
    expect(grid.cellConflicts(4, 0)).toBe(true);
  });

  test('should detect column conflicts', () => {
    const grid = new SudokuGrid();
    grid.setValue(0, 0, 3);
    grid.setValue(0, 5, 3);
    expect(grid.cellConflicts(0, 5)).toBe(true);
  });

  test('should detect 3x3 box conflicts', () => {
    const grid = new SudokuGrid();
    grid.setValue(0, 0, 9);
    grid.setValue(2, 2, 9);
    expect(grid.cellConflicts(2, 2)).toBe(true);
  });

  test('should not report conflict for empty cells', () => {
    const grid = new SudokuGrid();
    expect(grid.cellConflicts(0, 0)).toBe(false);
  });

  test('should clone correctly', () => {
    const grid = new SudokuGrid();
    grid.setValue(1, 2, 3);
    grid.setValue(4, 5, 6);

    const clone = grid.clone();
    expect(clone.getValue(1, 2)).toBe(3);
    expect(clone.getValue(4, 5)).toBe(6);

    // Modify original, clone should not change
    grid.setValue(1, 2, 9);
    expect(clone.getValue(1, 2)).toBe(3);
  });

  test('should correctly identify incomplete grid', () => {
    const grid = new SudokuGrid();
    expect(grid.isComplete()).toBe(false);
  });
});

describe('SudokuGenerator', () => {
  test('should generate a complete valid grid', () => {
    const grid = SudokuGenerator.generate();

    // All cells should be filled
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        expect(grid.getValue(col, row)).toBeGreaterThanOrEqual(1);
        expect(grid.getValue(col, row)).toBeLessThanOrEqual(9);
      }
    }

    // No conflicts
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        expect(grid.cellConflicts(col, row)).toBe(false);
      }
    }
  });

  test('should cull cells to create puzzle', () => {
    const grid = SudokuGenerator.generate();
    const originalFilled = 81;

    SudokuGenerator.cull(grid, 30);

    let filledCount = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid.getValue(col, row) !== 0) filledCount++;
      }
    }

    expect(filledCount).toBe(originalFilled - 30);
  });

  test('should create puzzles with different difficulties', () => {
    const easyPuzzle = SudokuGenerator.createPuzzle('easy');
    const hardPuzzle = SudokuGenerator.createPuzzle('hard');

    let easyEmpty = 0;
    let hardEmpty = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (easyPuzzle.puzzle.getValue(col, row) === 0) easyEmpty++;
        if (hardPuzzle.puzzle.getValue(col, row) === 0) hardEmpty++;
      }
    }

    // Hard should have more empty cells than easy
    expect(hardEmpty).toBeGreaterThan(easyEmpty);
  });
});

describe('SudokuGame', () => {
  test('should initialize with correct difficulty', () => {
    const game = new SudokuGame('easy');
    expect(game.getDifficulty()).toBe('easy');
  });

  test('should start in playing state', () => {
    const game = new SudokuGame();
    expect(game.getGameState()).toBe('playing');
  });

  test('should have zero hints used initially', () => {
    const game = new SudokuGame();
    expect(game.getHintsUsed()).toBe(0);
  });

  test('should select cell correctly', () => {
    const game = new SudokuGame();

    // Find a non-fixed cell
    let targetRow = -1;
    let targetCol = -1;
    for (let row = 0; row < GRID_SIZE && targetRow < 0; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!game.getCell(row, col).isFixed) {
          targetRow = row;
          targetCol = col;
          break;
        }
      }
    }

    game.selectCell(targetRow, targetCol);
    const selected = game.getSelectedCell();
    expect(selected).toEqual({ row: targetRow, col: targetCol });
  });

  test('should not select fixed cells', () => {
    const game = new SudokuGame();

    // Find a fixed cell
    let fixedRow = -1;
    let fixedCol = -1;
    for (let row = 0; row < GRID_SIZE && fixedRow < 0; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (game.getCell(row, col).isFixed) {
          fixedRow = row;
          fixedCol = col;
          break;
        }
      }
    }

    if (fixedRow >= 0) {
      game.selectCell(fixedRow, fixedCol);
      expect(game.getSelectedCell()).toBeNull();
    }
  });

  test('should set value in selected cell', () => {
    const game = new SudokuGame();

    // Find an empty cell
    let emptyRow = -1;
    let emptyCol = -1;
    for (let row = 0; row < GRID_SIZE && emptyRow < 0; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (game.getCell(row, col).value === 0) {
          emptyRow = row;
          emptyCol = col;
          break;
        }
      }
    }

    if (emptyRow >= 0) {
      game.selectCell(emptyRow, emptyCol);
      game.setValue(5);
      expect(game.getCell(emptyRow, emptyCol).value).toBe(5);
    }
  });

  test('should clear cell', () => {
    const game = new SudokuGame();

    // Find an empty cell
    let emptyRow = -1;
    let emptyCol = -1;
    for (let row = 0; row < GRID_SIZE && emptyRow < 0; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (game.getCell(row, col).value === 0) {
          emptyRow = row;
          emptyCol = col;
          break;
        }
      }
    }

    if (emptyRow >= 0) {
      game.selectCell(emptyRow, emptyCol);
      game.setValue(7);
      expect(game.getCell(emptyRow, emptyCol).value).toBe(7);

      game.clearCell();
      expect(game.getCell(emptyRow, emptyCol).value).toBe(0);
    }
  });

  test('should reveal hint and increment hint count', () => {
    const game = new SudokuGame();
    const initialEmpty = game.getEmptyCount();

    game.revealHint();

    expect(game.getHintsUsed()).toBe(1);
    expect(game.getEmptyCount()).toBe(initialEmpty - 1);
  });

  test('should track elapsed time', async () => {
    const game = new SudokuGame();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(game.getElapsedTime()).toBeGreaterThanOrEqual(0);
  });

  test('should call onUpdate callback', () => {
    const game = new SudokuGame();
    let updateCalled = false;

    game.setOnUpdate(() => {
      updateCalled = true;
    });

    // Find an empty cell and set value
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (game.getCell(row, col).value === 0) {
          game.selectCell(row, col);
          game.setValue(1);
          break;
        }
      }
      if (updateCalled) break;
    }

    expect(updateCalled).toBe(true);
  });

  test('should reinitialize on new game', () => {
    const game = new SudokuGame('medium');

    // Make some moves
    game.revealHint();

    const hintsBeforeReset = game.getHintsUsed();
    expect(hintsBeforeReset).toBe(1);

    // Start new game
    game.initGame();

    expect(game.getHintsUsed()).toBe(0);
    expect(game.getGameState()).toBe('playing');
  });
});
