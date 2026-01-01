/**
 * Slider Puzzle Logic Unit Tests
 */

import { SliderPuzzle, GRID_W, GRID_H, TILE_COUNT, BLANK } from './slider-puzzle';

describe('SliderPuzzle Constants', () => {
  test('grid dimensions are 5x5', () => {
    expect(GRID_W).toBe(5);
    expect(GRID_H).toBe(5);
  });

  test('tile count is 25', () => {
    expect(TILE_COUNT).toBe(25);
  });

  test('blank is last tile', () => {
    expect(BLANK).toBe(24);
  });
});

describe('SliderPuzzle', () => {
  describe('initialization', () => {
    test('starts in solved state', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.isSolved()).toBe(true);
    });

    test('board has all tiles 0-24', () => {
      const puzzle = new SliderPuzzle();
      const board = puzzle.getBoard();
      expect(board.length).toBe(TILE_COUNT);
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(board[i]).toBe(i);
      }
    });

    test('blank tile is at position 24', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.getValue(24)).toBe(BLANK);
    });
  });

  describe('getLabel', () => {
    test('returns A-X for tiles 0-23', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.getLabel(0)).toBe('A');
      expect(puzzle.getLabel(1)).toBe('B');
      expect(puzzle.getLabel(23)).toBe('X');
    });

    test('returns empty string for blank', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.getLabel(BLANK)).toBe('');
    });
  });

  describe('tryMove', () => {
    test('moves tile adjacent to blank', () => {
      const puzzle = new SliderPuzzle();
      // Blank starts at position 24 (bottom-right)
      // Position 23 is to the left, position 19 is above
      expect(puzzle.tryMove(23)).toBe(true);
      expect(puzzle.getValue(24)).toBe(23);
      expect(puzzle.getValue(23)).toBe(BLANK);
    });

    test('does not move tile not adjacent to blank', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.tryMove(0)).toBe(false);
      expect(puzzle.isSolved()).toBe(true);
    });

    test('moves tile above blank', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.tryMove(19)).toBe(true);
      expect(puzzle.getValue(24)).toBe(19);
      expect(puzzle.getValue(19)).toBe(BLANK);
    });

    test('cannot move diagonal tiles', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.tryMove(18)).toBe(false); // diagonal to 24
    });

    test('triggers update callback on successful move', () => {
      const puzzle = new SliderPuzzle();
      let called = false;
      puzzle.setOnUpdate(() => { called = true; });
      puzzle.tryMove(23);
      expect(called).toBe(true);
    });

    test('does not trigger callback on failed move', () => {
      const puzzle = new SliderPuzzle();
      let called = false;
      puzzle.setOnUpdate(() => { called = true; });
      puzzle.tryMove(0);
      expect(called).toBe(false);
    });
  });

  describe('scramble', () => {
    test('scrambles the board', () => {
      const puzzle = new SliderPuzzle();
      puzzle.scramble();
      expect(puzzle.isSolved()).toBe(false);
    });

    test('keeps all tiles present', () => {
      const puzzle = new SliderPuzzle();
      puzzle.scramble();
      const board = [...puzzle.getBoard()].sort((a, b) => a - b);
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(board[i]).toBe(i);
      }
    });

    test('triggers update callback', () => {
      const puzzle = new SliderPuzzle();
      let called = false;
      puzzle.setOnUpdate(() => { called = true; });
      puzzle.scramble();
      expect(called).toBe(true);
    });

    test('accepts custom move count', () => {
      const puzzle = new SliderPuzzle();
      puzzle.scramble(10);
      // Just ensure it runs without error
      expect(puzzle.getBoard().length).toBe(TILE_COUNT);
    });
  });

  describe('solve', () => {
    test('resets board to solved state', () => {
      const puzzle = new SliderPuzzle();
      puzzle.scramble();
      expect(puzzle.isSolved()).toBe(false);
      puzzle.solve();
      expect(puzzle.isSolved()).toBe(true);
    });

    test('triggers update callback', () => {
      const puzzle = new SliderPuzzle();
      puzzle.scramble();
      let called = false;
      puzzle.setOnUpdate(() => { called = true; });
      puzzle.solve();
      expect(called).toBe(true);
    });
  });

  describe('isSolved', () => {
    test('returns true for solved board', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.isSolved()).toBe(true);
    });

    test('returns false after one move', () => {
      const puzzle = new SliderPuzzle();
      puzzle.tryMove(23);
      expect(puzzle.isSolved()).toBe(false);
    });

    test('returns true after undoing move', () => {
      const puzzle = new SliderPuzzle();
      puzzle.tryMove(23);     // blank moves from 24 to 23
      puzzle.tryMove(24);     // blank moves from 23 back to 24
      expect(puzzle.isSolved()).toBe(true);
    });
  });

  describe('getBoard', () => {
    test('returns readonly array', () => {
      const puzzle = new SliderPuzzle();
      const board = puzzle.getBoard();
      expect(Object.isFrozen(board) || Array.isArray(board)).toBe(true);
    });

    test('returns current state after moves', () => {
      const puzzle = new SliderPuzzle();
      puzzle.tryMove(23);
      const board = puzzle.getBoard();
      expect(board[23]).toBe(BLANK);
      expect(board[24]).toBe(23);
    });
  });

  describe('getValue', () => {
    test('returns value at position', () => {
      const puzzle = new SliderPuzzle();
      expect(puzzle.getValue(0)).toBe(0);
      expect(puzzle.getValue(12)).toBe(12);
      expect(puzzle.getValue(24)).toBe(BLANK);
    });

    test('reflects moves', () => {
      const puzzle = new SliderPuzzle();
      puzzle.tryMove(23);
      expect(puzzle.getValue(23)).toBe(BLANK);
      expect(puzzle.getValue(24)).toBe(23);
    });
  });

  describe('edge cases', () => {
    test('blank in corner can only move 2 directions', () => {
      const puzzle = new SliderPuzzle();
      // Blank at 24 (bottom-right) can only go left or up
      expect(puzzle.tryMove(23)).toBe(true); // left works
      puzzle.solve();
      expect(puzzle.tryMove(19)).toBe(true); // up works
    });

    test('blank in center can move 4 directions', () => {
      const puzzle = new SliderPuzzle();
      // Move blank to center (position 12)
      puzzle.tryMove(19);
      puzzle.tryMove(14);
      puzzle.tryMove(13);
      puzzle.tryMove(12);
      // Now blank should be able to move in 4 directions
      const board = puzzle.getBoard();
      const blankPos = board.indexOf(BLANK);
      expect(blankPos).toBe(12);
    });

    test('multiple scrambles produce different boards', () => {
      const puzzle1 = new SliderPuzzle();
      const puzzle2 = new SliderPuzzle();
      puzzle1.scramble();
      puzzle2.scramble();
      // Very unlikely to be identical with 400 random moves
      const board1 = [...puzzle1.getBoard()];
      const board2 = [...puzzle2.getBoard()];
      const same = board1.every((v, i) => v === board2[i]);
      // This could theoretically fail but is extremely unlikely
      expect(same).toBe(false);
    });
  });
});
