/**
 * Find Pairs Logic Unit Tests
 */

import { FindPairsGame, GRID_W, GRID_H, TILE_COUNT, PAIR_COUNT, MATCH_SCORE, MISMATCH_PENALTY } from './find-pairs';

describe('FindPairs Constants', () => {
  test('grid dimensions are 10x5', () => {
    expect(GRID_W).toBe(10);
    expect(GRID_H).toBe(5);
  });

  test('tile count is 50', () => {
    expect(TILE_COUNT).toBe(50);
  });

  test('pair count is 25', () => {
    expect(PAIR_COUNT).toBe(25);
  });

  test('match score is 10', () => {
    expect(MATCH_SCORE).toBe(10);
  });

  test('mismatch penalty is 1', () => {
    expect(MISMATCH_PENALTY).toBe(1);
  });
});

describe('FindPairsGame', () => {
  describe('initialization', () => {
    test('starts with score 0', () => {
      const game = new FindPairsGame();
      expect(game.getScore()).toBe(0);
    });

    test('all tiles start hidden', () => {
      const game = new FindPairsGame();
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(game.getState(i)).toBe('hidden');
      }
    });

    test('is not won initially', () => {
      const game = new FindPairsGame();
      expect(game.isWon()).toBe(false);
    });

    test('is not locked initially', () => {
      const game = new FindPairsGame();
      expect(game.isLocked()).toBe(false);
    });

    test('has 50 tiles with values', () => {
      const game = new FindPairsGame();
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(game.getValue(i)).toBeDefined();
        expect(game.getValue(i).length).toBe(1);
      }
    });

    test('each character appears exactly twice', () => {
      const game = new FindPairsGame();
      const counts: Record<string, number> = {};
      for (let i = 0; i < TILE_COUNT; i++) {
        const v = game.getValue(i);
        counts[v] = (counts[v] || 0) + 1;
      }
      Object.values(counts).forEach(count => {
        expect(count).toBe(2);
      });
    });
  });

  describe('tryClick', () => {
    test('first click reveals tile', () => {
      const game = new FindPairsGame();
      game.tryClick(0);
      expect(game.getState(0)).toBe('revealed');
    });

    test('clicking hidden tile triggers update', () => {
      const game = new FindPairsGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.tryClick(0);
      expect(called).toBe(true);
    });

    test('clicking revealed tile does nothing', () => {
      const game = new FindPairsGame();
      game.tryClick(0);
      let callCount = 0;
      game.setOnUpdate(() => { callCount++; });
      game.tryClick(0);
      expect(callCount).toBe(0);
    });

    test('clicking matched tile does nothing', () => {
      const game = new FindPairsGame();
      game.peek(); // Match all
      let callCount = 0;
      game.setOnUpdate(() => { callCount++; });
      game.tryClick(0);
      expect(callCount).toBe(0);
    });
  });

  describe('matching pairs', () => {
    test('matching pair increases score by 10', () => {
      const game = new FindPairsGame();
      // Find a matching pair
      const val0 = game.getValue(0);
      let matchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) === val0) {
          matchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(matchIdx);
      expect(game.getScore()).toBe(MATCH_SCORE);
    });

    test('matching pair sets both tiles to matched', () => {
      const game = new FindPairsGame();
      const val0 = game.getValue(0);
      let matchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) === val0) {
          matchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(matchIdx);
      expect(game.getState(0)).toBe('matched');
      expect(game.getState(matchIdx)).toBe('matched');
    });
  });

  describe('mismatching pairs', () => {
    test('mismatch decreases score by 1', () => {
      const game = new FindPairsGame();
      // Find a non-matching pair
      const val0 = game.getValue(0);
      let mismatchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) !== val0) {
          mismatchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(mismatchIdx);
      expect(game.getScore()).toBe(-MISMATCH_PENALTY);
    });

    test('mismatch locks the game', () => {
      const game = new FindPairsGame();
      const val0 = game.getValue(0);
      let mismatchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) !== val0) {
          mismatchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(mismatchIdx);
      expect(game.isLocked()).toBe(true);
    });

    test('mismatch hides tiles after delay', async () => {
      jest.useFakeTimers();
      const game = new FindPairsGame();
      const val0 = game.getValue(0);
      let mismatchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) !== val0) {
          mismatchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(mismatchIdx);
      expect(game.getState(0)).toBe('revealed');
      expect(game.getState(mismatchIdx)).toBe('revealed');

      jest.advanceTimersByTime(1000);

      expect(game.getState(0)).toBe('hidden');
      expect(game.getState(mismatchIdx)).toBe('hidden');
      expect(game.isLocked()).toBe(false);
      jest.useRealTimers();
    });

    test('cannot click while locked', () => {
      const game = new FindPairsGame();
      const val0 = game.getValue(0);
      let mismatchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) !== val0) {
          mismatchIdx = i;
          break;
        }
      }

      game.tryClick(0);
      game.tryClick(mismatchIdx);

      // Try clicking another tile while locked
      let callCount = 0;
      game.setOnUpdate(() => { callCount++; });
      game.tryClick(2);
      expect(callCount).toBe(0);
    });
  });

  describe('scramble', () => {
    test('resets score to 0', () => {
      const game = new FindPairsGame();
      const val0 = game.getValue(0);
      let matchIdx = -1;
      for (let i = 1; i < TILE_COUNT; i++) {
        if (game.getValue(i) === val0) {
          matchIdx = i;
          break;
        }
      }
      game.tryClick(0);
      game.tryClick(matchIdx);
      expect(game.getScore()).toBe(MATCH_SCORE);

      game.scramble();
      expect(game.getScore()).toBe(0);
    });

    test('hides all tiles', () => {
      const game = new FindPairsGame();
      game.tryClick(0);
      expect(game.getState(0)).toBe('revealed');

      game.scramble();
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(game.getState(i)).toBe('hidden');
      }
    });

    test('triggers update callback', () => {
      const game = new FindPairsGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.scramble();
      expect(called).toBe(true);
    });

    test('shuffles values', () => {
      const game1 = new FindPairsGame();
      const game2 = new FindPairsGame();
      const vals1 = Array.from({ length: TILE_COUNT }, (_, i) => game1.getValue(i));
      const vals2 = Array.from({ length: TILE_COUNT }, (_, i) => game2.getValue(i));
      const same = vals1.every((v, i) => v === vals2[i]);
      expect(same).toBe(false); // Very unlikely to be same
    });
  });

  describe('peek', () => {
    test('reveals all tiles as matched', () => {
      const game = new FindPairsGame();
      game.peek();
      for (let i = 0; i < TILE_COUNT; i++) {
        expect(game.getState(i)).toBe('matched');
      }
    });

    test('triggers update callback', () => {
      const game = new FindPairsGame();
      let called = false;
      game.setOnUpdate(() => { called = true; });
      game.peek();
      expect(called).toBe(true);
    });
  });

  describe('win condition', () => {
    test('isWon returns true when all matched', () => {
      const game = new FindPairsGame();
      expect(game.isWon()).toBe(false);
      game.peek();
      expect(game.isWon()).toBe(true);
    });

    test('win callback is triggered', () => {
      const game = new FindPairsGame();
      let winCalled = false;
      game.setOnWin(() => { winCalled = true; });

      // Match all pairs manually
      const matched = new Set<number>();
      for (let i = 0; i < TILE_COUNT; i++) {
        if (matched.has(i)) continue;
        const val = game.getValue(i);
        for (let j = i + 1; j < TILE_COUNT; j++) {
          if (game.getValue(j) === val && !matched.has(j)) {
            game.tryClick(i);
            game.tryClick(j);
            matched.add(i);
            matched.add(j);
            break;
          }
        }
      }

      expect(winCalled).toBe(true);
    });
  });
});
