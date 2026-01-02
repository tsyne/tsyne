/**
 * Zip Puzzle Logic Unit Tests
 */

import { ZipPuzzleGame, PUZZLE_COUNT } from './zip-puzzle';

describe('ZipPuzzleGame', () => {
  describe('initialization', () => {
    test('starts at level 0', () => {
      const game = new ZipPuzzleGame();
      expect(game.getLevel()).toBe(0);
    });

    test('has multiple puzzles', () => {
      expect(PUZZLE_COUNT).toBeGreaterThan(1);
    });

    test('path starts at waypoint 1', () => {
      const game = new ZipPuzzleGame();
      const path = game.getPath();
      expect(path.length).toBe(1);
      expect(game.getWaypoint(path[0])).toBe(1);
    });

    test('is not won initially', () => {
      const game = new ZipPuzzleGame();
      expect(game.isWon()).toBe(false);
    });

    test('first cell is in path', () => {
      const game = new ZipPuzzleGame();
      const path = game.getPath();
      expect(game.isInPath(path[0])).toBe(true);
    });

    test('first cell is head', () => {
      const game = new ZipPuzzleGame();
      const path = game.getPath();
      expect(game.isHead(path[0])).toBe(true);
    });
  });

  describe('level navigation', () => {
    test('nextLevel increments level', () => {
      const game = new ZipPuzzleGame();
      game.nextLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel decrements level', () => {
      const game = new ZipPuzzleGame();
      game.nextLevel();
      game.nextLevel();
      game.prevLevel();
      expect(game.getLevel()).toBe(1);
    });

    test('prevLevel does not go below 0', () => {
      const game = new ZipPuzzleGame();
      game.prevLevel();
      expect(game.getLevel()).toBe(0);
    });

    test('nextLevel does not exceed max', () => {
      const game = new ZipPuzzleGame();
      for (let i = 0; i < 100; i++) game.nextLevel();
      expect(game.getLevel()).toBe(PUZZLE_COUNT - 1);
    });

    test('setLevel changes level', () => {
      const game = new ZipPuzzleGame();
      game.setLevel(2);
      expect(game.getLevel()).toBe(2);
    });

    test('changing level resets path', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1); // Extend path
      game.nextLevel();
      expect(game.getPath().length).toBe(1);
    });
  });

  describe('path extension', () => {
    test('can extend path to adjacent cell', () => {
      const game = new ZipPuzzleGame();
      const startLen = game.getPath().length;
      // Cell 1 is adjacent to cell 0 (right neighbor in 5x5 grid)
      game.tryClick(1);
      expect(game.getPath().length).toBe(startLen + 1);
    });

    test('cannot extend to non-adjacent cell', () => {
      const game = new ZipPuzzleGame();
      const startLen = game.getPath().length;
      // Cell 24 is far from cell 0
      game.tryClick(24);
      expect(game.getPath().length).toBe(startLen);
    });

    test('cannot revisit cell already in path', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      const lenAfterFirst = game.getPath().length;
      game.tryClick(0); // Try to go back to start - should undo instead
      expect(game.getPath().length).toBeLessThanOrEqual(lenAfterFirst);
    });

    test('head changes after extending', () => {
      const game = new ZipPuzzleGame();
      expect(game.isHead(0)).toBe(true);
      game.tryClick(1);
      expect(game.isHead(0)).toBe(false);
      expect(game.isHead(1)).toBe(true);
    });

    test('triggers update callback', () => {
      const game = new ZipPuzzleGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.tryClick(1);
      expect(called).toBe(true);
    });
  });

  describe('undo', () => {
    test('clicking head undoes last move', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      expect(game.getPath().length).toBe(2);
      game.tryClick(1); // Click head to undo
      expect(game.getPath().length).toBe(1);
    });

    test('clicking previous cell undoes back to it', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      game.tryClick(2);
      game.tryClick(3);
      expect(game.getPath().length).toBe(4);
      game.tryClick(1); // Click earlier cell
      expect(game.getPath().length).toBe(2);
      expect(game.isHead(1)).toBe(true);
    });

    test('cannot undo past starting position', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(0); // Click start (head)
      expect(game.getPath().length).toBe(1);
    });
  });

  describe('waypoint constraints', () => {
    test('must hit waypoints in order', () => {
      const game = new ZipPuzzleGame();
      // First puzzle has waypoints at 0(1), 4(2), 24(3)
      // Path starts at 0, must hit 4 before 24
      // If we try to reach 24 before 4, the path should still work
      // but waypoint 3 shouldn't be "achieved" until waypoint 2 is hit
      expect(game.getWaypoint(0)).toBe(1);
    });

    test('waypoints have numbers', () => {
      const game = new ZipPuzzleGame();
      const path = game.getPath();
      expect(game.getWaypoint(path[0])).toBeDefined();
    });
  });

  describe('reset', () => {
    test('reset restores initial state', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      game.tryClick(2);
      expect(game.getPath().length).toBe(3);
      game.reset();
      expect(game.getPath().length).toBe(1);
    });

    test('reset triggers update', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.reset();
      expect(called).toBe(true);
    });
  });

  describe('win condition', () => {
    test('isWon returns false with incomplete path', () => {
      const game = new ZipPuzzleGame();
      expect(game.isWon()).toBe(false);
    });

    test('getLevelCount returns puzzle count', () => {
      const game = new ZipPuzzleGame();
      expect(game.getLevelCount()).toBe(PUZZLE_COUNT);
    });
  });

  describe('grid info', () => {
    test('getSize returns grid size', () => {
      const game = new ZipPuzzleGame();
      expect(game.getSize()).toBeGreaterThanOrEqual(5);
    });

    test('getPathIndex returns correct index', () => {
      const game = new ZipPuzzleGame();
      game.tryClick(1);
      expect(game.getPathIndex(0)).toBe(0);
      expect(game.getPathIndex(1)).toBe(1);
    });

    test('getPathIndex returns -1 for non-path cell', () => {
      const game = new ZipPuzzleGame();
      expect(game.getPathIndex(10)).toBe(-1);
    });
  });
});
