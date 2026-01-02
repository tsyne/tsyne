/**
 * Calcudoku Logic Unit Tests
 */

import { CalcudokuGame, PUZZLE_COUNT } from './calcudoku';

describe('CalcudokuGame', () => {
  describe('initialization', () => {
    test('starts at level 0', () => {
      const game = new CalcudokuGame();
      expect(game.getLevel()).toBe(0);
    });

    test('has multiple puzzles', () => {
      expect(PUZZLE_COUNT).toBeGreaterThan(1);
    });

    test('board starts empty', () => {
      const game = new CalcudokuGame();
      const size = game.getSize();
      for (let i = 0; i < size * size; i++) {
        expect(game.getValue(i)).toBe(0);
      }
    });

    test('is not won initially', () => {
      const game = new CalcudokuGame();
      expect(game.isWon()).toBe(false);
    });

    test('no cell selected initially', () => {
      const game = new CalcudokuGame();
      expect(game.getSelected()).toBeNull();
    });

    test('has cages', () => {
      const game = new CalcudokuGame();
      expect(game.getCages().length).toBeGreaterThan(0);
    });
  });

  describe('level navigation', () => {
    test('nextLevel increments level', () => {
      const game = new CalcudokuGame();
      game.nextLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel decrements level', () => {
      const game = new CalcudokuGame();
      game.nextLevel();
      game.nextLevel();
      game.prevLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel does not go below 0', () => {
      const game = new CalcudokuGame();
      game.prevLevel();
      expect(game.getLevel()).toBe(0);
    });

    test('nextLevel does not exceed max', () => {
      const game = new CalcudokuGame();
      for (let i = 0; i < 100; i++) game.nextLevel();
      expect(game.getLevel()).toBe(PUZZLE_COUNT - 1);
    });

    test('changing level resets board', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(1);
      game.nextLevel();
      expect(game.getValue(0)).toBe(0);
    });
  });

  describe('cell selection', () => {
    test('selectCell sets selected', () => {
      const game = new CalcudokuGame();
      game.selectCell(5);
      expect(game.getSelected()).toBe(5);
    });

    test('selecting same cell deselects', () => {
      const game = new CalcudokuGame();
      game.selectCell(5);
      game.selectCell(5);
      expect(game.getSelected()).toBeNull();
    });

    test('selecting different cell changes selection', () => {
      const game = new CalcudokuGame();
      game.selectCell(5);
      game.selectCell(3);
      expect(game.getSelected()).toBe(3);
    });

    test('selectCell triggers update', () => {
      const game = new CalcudokuGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.selectCell(0);
      expect(called).toBe(true);
    });
  });

  describe('setValue', () => {
    test('setValue sets cell value', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(3);
      expect(game.getValue(0)).toBe(3);
    });

    test('setValue without selection does nothing', () => {
      const game = new CalcudokuGame();
      game.setValue(3);
      expect(game.getValue(0)).toBe(0);
    });

    test('setValue triggers update', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.setValue(2);
      expect(called).toBe(true);
    });
  });

  describe('clearCell', () => {
    test('clearCell clears selected cell', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(3);
      expect(game.getValue(0)).toBe(3);
      game.clearCell();
      expect(game.getValue(0)).toBe(0);
    });

    test('clearCell without selection does nothing', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(3);
      game.selectCell(0); // deselect
      game.clearCell();
      expect(game.getValue(0)).toBe(3);
    });
  });

  describe('cages', () => {
    test('getCageForCell returns cage', () => {
      const game = new CalcudokuGame();
      const cage = game.getCageForCell(0);
      expect(cage).toBeDefined();
      expect(cage?.cells).toContain(0);
    });

    test('isCageTopLeft identifies first cell', () => {
      const game = new CalcudokuGame();
      const cages = game.getCages();
      const firstCage = cages[0];
      expect(game.isCageTopLeft(firstCage.cells[0])).toBe(true);
      if (firstCage.cells.length > 1) {
        expect(game.isCageTopLeft(firstCage.cells[1])).toBe(false);
      }
    });

    test('all cells belong to a cage', () => {
      const game = new CalcudokuGame();
      const size = game.getSize();
      for (let i = 0; i < size * size; i++) {
        expect(game.getCageForCell(i)).toBeDefined();
      }
    });
  });

  describe('validation', () => {
    test('empty board is valid', () => {
      const game = new CalcudokuGame();
      expect(game.isValid()).toBe(true);
    });

    test('duplicate in row is invalid', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(1);
      game.selectCell(1);
      game.setValue(1);
      expect(game.isValid()).toBe(false);
    });

    test('duplicate in column is invalid', () => {
      const game = new CalcudokuGame();
      const size = game.getSize();
      game.selectCell(0);
      game.setValue(1);
      game.selectCell(size); // Same column, next row
      game.setValue(1);
      expect(game.isValid()).toBe(false);
    });

    test('getErrors returns duplicates', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(1);
      game.selectCell(1);
      game.setValue(1);
      const errors = game.getErrors();
      expect(errors.has(0)).toBe(true);
      expect(errors.has(1)).toBe(true);
    });
  });

  describe('reset', () => {
    test('reset clears board', () => {
      const game = new CalcudokuGame();
      game.selectCell(0);
      game.setValue(3);
      game.reset();
      expect(game.getValue(0)).toBe(0);
    });

    test('reset clears selection', () => {
      const game = new CalcudokuGame();
      game.selectCell(5);
      game.reset();
      expect(game.getSelected()).toBeNull();
    });

    test('reset triggers update', () => {
      const game = new CalcudokuGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.reset();
      expect(called).toBe(true);
    });
  });

  describe('win condition', () => {
    test('isFull returns false for empty board', () => {
      const game = new CalcudokuGame();
      expect(game.isFull()).toBe(false);
    });

    test('isWon requires full and valid', () => {
      const game = new CalcudokuGame();
      expect(game.isWon()).toBe(false);
    });

    test('getLevelCount returns puzzle count', () => {
      const game = new CalcudokuGame();
      expect(game.getLevelCount()).toBe(PUZZLE_COUNT);
    });
  });

  describe('cage operations', () => {
    test('addition cage with correct sum is valid', () => {
      const game = new CalcudokuGame();
      // First puzzle: cage [0,1] target 4+
      game.selectCell(0);
      game.setValue(1);
      game.selectCell(1);
      game.setValue(3);
      // Cage should be satisfied (1+3=4)
      const cage = game.getCageForCell(0);
      expect(cage?.op).toBe('+');
      expect(cage?.target).toBe(4);
    });

    test('equals cage with single cell', () => {
      const game = new CalcudokuGame();
      // First puzzle: cage [2] target 2=
      const cage = game.getCageForCell(2);
      expect(cage?.op).toBe('=');
      expect(cage?.cells.length).toBe(1);
    });
  });

  describe('solver', () => {
    test('solve returns valid solution', () => {
      const game = new CalcudokuGame();
      const solution = game.solve();
      expect(solution).not.toBeNull();
      expect(solution!.length).toBe(game.getSize() * game.getSize());
    });

    test('solve solution has no zeros', () => {
      const game = new CalcudokuGame();
      const solution = game.solve();
      expect(solution!.every(v => v > 0)).toBe(true);
    });

    test('solve works for all levels', () => {
      const game = new CalcudokuGame();
      for (let i = 0; i < PUZZLE_COUNT; i++) {
        game.setLevel(i);
        const solution = game.solve();
        expect(solution).not.toBeNull();
        expect(solution!.length).toBe(game.getSize() * game.getSize());
      }
    });

    test('setCell sets value directly', () => {
      const game = new CalcudokuGame();
      game.setCell(0, 5);
      expect(game.getValue(0)).toBe(5);
    });
  });
});
