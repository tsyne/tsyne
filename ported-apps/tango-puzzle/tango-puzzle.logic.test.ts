/**
 * Tango Puzzle Logic Unit Tests
 */

import { TangoPuzzleGame, PUZZLE_COUNT } from './tango-puzzle';

describe('TangoPuzzleGame', () => {
  describe('initialization', () => {
    test('starts at level 0', () => {
      const game = new TangoPuzzleGame();
      expect(game.getLevel()).toBe(0);
    });

    test('has multiple puzzles', () => {
      expect(PUZZLE_COUNT).toBeGreaterThan(1);
    });

    test('board has correct size', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      expect(size).toBeGreaterThanOrEqual(4);
      expect(size % 2).toBe(0); // Must be even
    });

    test('is not won initially', () => {
      const game = new TangoPuzzleGame();
      expect(game.isWon()).toBe(false);
    });

    test('has some given cells', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let givenCount = 0;
      for (let i = 0; i < size * size; i++) {
        if (game.isGiven(i)) givenCount++;
      }
      expect(givenCount).toBeGreaterThan(0);
    });

    test('cannot undo initially', () => {
      const game = new TangoPuzzleGame();
      expect(game.canUndo()).toBe(false);
    });
  });

  describe('level navigation', () => {
    test('nextLevel increments level', () => {
      const game = new TangoPuzzleGame();
      game.nextLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel decrements level', () => {
      const game = new TangoPuzzleGame();
      game.nextLevel();
      game.nextLevel();
      game.prevLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel does not go below 0', () => {
      const game = new TangoPuzzleGame();
      game.prevLevel();
      expect(game.getLevel()).toBe(0);
    });

    test('nextLevel does not exceed max', () => {
      const game = new TangoPuzzleGame();
      for (let i = 0; i < 100; i++) game.nextLevel();
      expect(game.getLevel()).toBe(PUZZLE_COUNT - 1);
    });

    test('changing level resets board', () => {
      const game = new TangoPuzzleGame();
      game.tryClick(1);
      game.nextLevel();
      expect(game.canUndo()).toBe(false);
    });
  });

  describe('cell clicking', () => {
    test('clicking empty cell sets to sun', () => {
      const game = new TangoPuzzleGame();
      // Find a non-given empty cell
      const size = game.getSize();
      let targetCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i) && game.getValue(i) === 'empty') {
          targetCell = i;
          break;
        }
      }
      if (targetCell >= 0) {
        game.tryClick(targetCell);
        expect(game.getValue(targetCell)).toBe('sun');
      }
    });

    test('clicking sun sets to moon', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let targetCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i) && game.getValue(i) === 'empty') {
          targetCell = i;
          break;
        }
      }
      if (targetCell >= 0) {
        game.tryClick(targetCell); // -> sun
        game.tryClick(targetCell); // -> moon
        expect(game.getValue(targetCell)).toBe('moon');
      }
    });

    test('clicking moon sets to empty', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let targetCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i) && game.getValue(i) === 'empty') {
          targetCell = i;
          break;
        }
      }
      if (targetCell >= 0) {
        game.tryClick(targetCell); // -> sun
        game.tryClick(targetCell); // -> moon
        game.tryClick(targetCell); // -> empty
        expect(game.getValue(targetCell)).toBe('empty');
      }
    });

    test('cannot click given cell', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let givenCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (game.isGiven(i)) {
          givenCell = i;
          break;
        }
      }
      if (givenCell >= 0) {
        const valueBefore = game.getValue(givenCell);
        game.tryClick(givenCell);
        expect(game.getValue(givenCell)).toBe(valueBefore);
      }
    });

    test('clicking adds to undo stack', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let targetCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i)) {
          targetCell = i;
          break;
        }
      }
      if (targetCell >= 0) {
        game.tryClick(targetCell);
        expect(game.canUndo()).toBe(true);
      }
    });

    test('triggers update callback', () => {
      const game = new TangoPuzzleGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      const size = game.getSize();
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i)) {
          game.tryClick(i);
          break;
        }
      }
      expect(called).toBe(true);
    });
  });

  describe('undo', () => {
    test('undo restores previous state', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      let targetCell = -1;
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i)) {
          targetCell = i;
          break;
        }
      }
      if (targetCell >= 0) {
        const before = game.getValue(targetCell);
        game.tryClick(targetCell);
        expect(game.getValue(targetCell)).not.toBe(before);
        game.undo();
        expect(game.getValue(targetCell)).toBe(before);
      }
    });

    test('undo triggers update', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i)) {
          game.tryClick(i);
          break;
        }
      }
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.undo();
      expect(called).toBe(true);
    });

    test('undo with empty stack does nothing', () => {
      const game = new TangoPuzzleGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.undo();
      expect(called).toBe(false);
    });
  });

  describe('validation', () => {
    test('empty board is valid', () => {
      const game = new TangoPuzzleGame();
      game.reset();
      // Should be valid (given cells don't violate rules in test puzzles)
      expect(game.isValid()).toBe(true);
    });

    test('board is not full initially', () => {
      const game = new TangoPuzzleGame();
      expect(game.isFull()).toBe(false);
    });

    test('getErrors returns set', () => {
      const game = new TangoPuzzleGame();
      const errors = game.getErrors();
      expect(errors).toBeInstanceOf(Set);
    });

    test('initial board has no errors', () => {
      const game = new TangoPuzzleGame();
      const errors = game.getErrors();
      expect(errors.size).toBe(0);
    });
  });

  describe('triple detection', () => {
    test('three consecutive same values creates error', () => {
      const game = new TangoPuzzleGame();
      // Set level to one with room for testing
      game.setLevel(0); // 4x4 grid

      // Find 3 consecutive non-given cells in a row
      const size = game.getSize();
      let startCell = -1;
      for (let r = 0; r < size; r++) {
        let consecutive = 0;
        let start = -1;
        for (let c = 0; c < size; c++) {
          const pos = r * size + c;
          if (!game.isGiven(pos)) {
            if (start === -1) start = pos;
            consecutive++;
            if (consecutive >= 3) {
              startCell = start;
              break;
            }
          } else {
            consecutive = 0;
            start = -1;
          }
        }
        if (startCell >= 0) break;
      }

      if (startCell >= 0) {
        // Set 3 consecutive cells to sun
        game.tryClick(startCell);     // sun
        game.tryClick(startCell + 1); // sun
        game.tryClick(startCell + 2); // sun
        const errors = game.getErrors();
        expect(errors.size).toBeGreaterThan(0);
      }
    });
  });

  describe('reset', () => {
    test('reset restores initial state', () => {
      const game = new TangoPuzzleGame();
      const size = game.getSize();
      for (let i = 0; i < size * size; i++) {
        if (!game.isGiven(i)) {
          game.tryClick(i);
        }
      }
      game.reset();
      expect(game.canUndo()).toBe(false);
    });

    test('reset triggers update', () => {
      const game = new TangoPuzzleGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.reset();
      expect(called).toBe(true);
    });
  });

  describe('win condition', () => {
    test('isWon requires full and valid board', () => {
      const game = new TangoPuzzleGame();
      expect(game.isWon()).toBe(false);
    });

    test('getLevelCount returns puzzle count', () => {
      const game = new TangoPuzzleGame();
      expect(game.getLevelCount()).toBe(PUZZLE_COUNT);
    });
  });
});
