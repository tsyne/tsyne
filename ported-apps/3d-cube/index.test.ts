/**
 * 3D Cube Tests - Comprehensive coverage for cube logic and gesture mapping
 */

import { RubiksCube, GestureController, Side, computeSwipeDirection } from './cube';

describe('RubiksCube', () => {
  let cube: RubiksCube;

  beforeEach(() => {
    cube = new RubiksCube();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initial state', () => {
    it('should start solved', () => {
      expect(cube.isSolved()).toBe(true);
    });

    it('should have correct colors on each face', () => {
      // Each face should have all cells matching the face color
      for (let side = 0; side <= 5; side++) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            expect(cube.getColor(side as Side, row, col)).toBe(side);
          }
        }
      }
    });

    it('should have zero move count', () => {
      expect(cube.getMoveCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Face Rotations
  // ═══════════════════════════════════════════════════════════════════════════

  describe('face rotations', () => {
    it('should increment move count on rotation', () => {
      cube.rotateSide(Side.Front, true);
      expect(cube.getMoveCount()).toBe(1);
    });

    it('should not be solved after one rotation', () => {
      cube.rotateSide(Side.Front, true);
      expect(cube.isSolved()).toBe(false);
    });

    it('should return to solved after 4 rotations of same face', () => {
      for (let i = 0; i < 4; i++) {
        cube.rotateSide(Side.Front, true);
      }
      expect(cube.isSolved()).toBe(true);
    });

    it('should return to solved after CW then CCW rotation', () => {
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, false);
      expect(cube.isSolved()).toBe(true);
    });

    it('should correctly rotate Up face edges', () => {
      // After Up CW: Front row 0 → Right row 0
      const originalFrontRow = [
        cube.getColor(Side.Front, 0, 0),
        cube.getColor(Side.Front, 0, 1),
        cube.getColor(Side.Front, 0, 2),
      ];
      cube.rotateSide(Side.Up, true);

      // Front row 0 should now have what was Right row 0 (red)
      expect(cube.getColor(Side.Front, 0, 0)).toBe(Side.Right);
      expect(cube.getColor(Side.Front, 0, 1)).toBe(Side.Right);
      expect(cube.getColor(Side.Front, 0, 2)).toBe(Side.Right);
    });

    it('should correctly rotate Right face edges', () => {
      cube.rotateSide(Side.Right, true);
      // After Right CW: Front col 2 → Up col 2
      expect(cube.getColor(Side.Up, 0, 2)).toBe(Side.Front);
      expect(cube.getColor(Side.Up, 1, 2)).toBe(Side.Front);
      expect(cube.getColor(Side.Up, 2, 2)).toBe(Side.Front);
    });

    it('should correctly rotate Front face edges', () => {
      cube.rotateSide(Side.Front, true);
      // After Front CW: Up row 2 → Right col 0
      expect(cube.getColor(Side.Right, 0, 0)).toBe(Side.Up);
      expect(cube.getColor(Side.Right, 1, 0)).toBe(Side.Up);
      expect(cube.getColor(Side.Right, 2, 0)).toBe(Side.Up);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Slice Rotations
  // ═══════════════════════════════════════════════════════════════════════════

  describe('slice rotations', () => {
    it('should rotate E slice (middle horizontal)', () => {
      cube.rotateESlice(true);
      // E slice CW (from above): Front row 1 → Right row 1
      expect(cube.getColor(Side.Right, 1, 0)).toBe(Side.Front);
      expect(cube.getColor(Side.Right, 1, 1)).toBe(Side.Front);
      expect(cube.getColor(Side.Right, 1, 2)).toBe(Side.Front);
    });

    it('should rotate M slice (middle vertical)', () => {
      cube.rotateMSlice(true);
      // M slice CW: Front col 1 → Down col 1
      expect(cube.getColor(Side.Up, 0, 1)).toBe(Side.Front);
      expect(cube.getColor(Side.Up, 1, 1)).toBe(Side.Front);
      expect(cube.getColor(Side.Up, 2, 1)).toBe(Side.Front);
    });

    it('should rotate S slice (middle standing)', () => {
      cube.rotateSSlice(true);
      // S slice CW: Up row 1 → Right col 1
      expect(cube.getColor(Side.Right, 0, 1)).toBe(Side.Up);
      expect(cube.getColor(Side.Right, 1, 1)).toBe(Side.Up);
      expect(cube.getColor(Side.Right, 2, 1)).toBe(Side.Up);
    });

    it('should return to solved after 4 E slice rotations', () => {
      for (let i = 0; i < 4; i++) {
        cube.rotateESlice(true);
      }
      expect(cube.isSolved()).toBe(true);
    });

    it('should return to solved after 4 M slice rotations', () => {
      for (let i = 0; i < 4; i++) {
        cube.rotateMSlice(true);
      }
      expect(cube.isSolved()).toBe(true);
    });

    it('should return to solved after 4 S slice rotations', () => {
      for (let i = 0; i < 4; i++) {
        cube.rotateSSlice(true);
      }
      expect(cube.isSolved()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Shuffle and Solve
  // ═══════════════════════════════════════════════════════════════════════════

  describe('shuffle and solve', () => {
    it('should not be solved after shuffle', () => {
      cube.shuffle(10);
      expect(cube.isSolved()).toBe(false);
    });

    it('should have move count equal to shuffle count', () => {
      cube.shuffle(15);
      expect(cube.getMoveCount()).toBe(15);
    });

    it('should return to solved state after solve', () => {
      cube.shuffle(20);
      cube.solve();
      expect(cube.isSolved()).toBe(true);
    });

    it('should have zero move count after solve then reset', () => {
      cube.shuffle(10);
      cube.solve();
      cube.reset();
      expect(cube.getMoveCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Observable Pattern
  // ═══════════════════════════════════════════════════════════════════════════

  describe('observable pattern', () => {
    it('should notify on rotation', () => {
      const listener = jest.fn();
      cube.subscribe(listener);
      cube.rotateSide(Side.Up, true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify on reset', () => {
      const listener = jest.fn();
      cube.subscribe(listener);
      cube.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify on shuffle (multiple times)', () => {
      const listener = jest.fn();
      cube.subscribe(listener);
      cube.shuffle(5);
      expect(listener).toHaveBeenCalledTimes(5);
    });

    it('should allow unsubscribe', () => {
      const listener = jest.fn();
      const unsub = cube.subscribe(listener);
      cube.rotateSide(Side.Up, true);
      unsub();
      cube.rotateSide(Side.Up, true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      cube.subscribe(listener1);
      cube.subscribe(listener2);
      cube.rotateSide(Side.Front, true);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Complex Sequences
  // ═══════════════════════════════════════════════════════════════════════════

  describe('complex sequences', () => {
    it('should handle sexy move (R U R\' U\')', () => {
      // The sexy move repeated 6 times returns to solved
      for (let i = 0; i < 6; i++) {
        cube.rotateSide(Side.Right, true);
        cube.rotateSide(Side.Up, true);
        cube.rotateSide(Side.Right, false);
        cube.rotateSide(Side.Up, false);
      }
      expect(cube.isSolved()).toBe(true);
    });

    it('should correctly sequence multiple faces', () => {
      // Perform a known sequence and verify intermediate state
      cube.rotateSide(Side.Front, true);
      cube.rotateSide(Side.Right, true);

      // After F R: specific pattern should emerge
      // Check that cube is scrambled
      expect(cube.isSolved()).toBe(false);

      // Undo
      cube.rotateSide(Side.Right, false);
      cube.rotateSide(Side.Front, false);
      expect(cube.isSolved()).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GestureController Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('GestureController', () => {
  let cube: RubiksCube;
  let gestures: GestureController;

  beforeEach(() => {
    cube = new RubiksCube();
    gestures = new GestureController(cube);
  });

  describe('Front face swipes', () => {
    it('should rotate Up on swipe west from row 0 (pieces move left)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 0, col: 1 }, 'W');
      // Up CW: Front row 0 → Left row 0
      expect(cube.getColor(Side.Left, 0, 1)).toBe(Side.Front);
    });

    it('should rotate Up on swipe east from row 0 (pieces move right)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 0, col: 1 }, 'E');
      // Up CCW: Front row 0 → Right row 0
      expect(cube.getColor(Side.Right, 0, 1)).toBe(Side.Front);
    });

    it('should rotate Down on swipe west from row 2 (pieces move left)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 2, col: 1 }, 'W');
      // Down CCW: Front row 2 → Left row 2
      expect(cube.getColor(Side.Left, 2, 1)).toBe(Side.Front);
    });

    it('should rotate E slice on swipe west from row 1 (pieces move left)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 1, col: 1 }, 'W');
      // E slice CW: Front row 1 → Left row 1
      expect(cube.getColor(Side.Left, 1, 1)).toBe(Side.Front);
    });

    it('should rotate Right on swipe south from col 2 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 1, col: 2 }, 'S');
      // Right CCW: Front col 2 → Down col 2
      expect(cube.getColor(Side.Down, 1, 2)).toBe(Side.Front);
    });

    it('should rotate Left on swipe south from col 0 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 1, col: 0 }, 'S');
      // Left CW: Front col 0 → Down col 0
      expect(cube.getColor(Side.Down, 1, 0)).toBe(Side.Front);
    });

    it('should rotate M slice on swipe south from col 1 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Front, row: 1, col: 1 }, 'S');
      // M slice CCW: Front col 1 → Down col 1
      expect(cube.getColor(Side.Down, 1, 1)).toBe(Side.Front);
    });
  });

  describe('Up face swipes', () => {
    it('should rotate Front on swipe east from row 2 (pieces move right)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 2, col: 1 }, 'E');
      // Front CW: Up row 2 → Right col 0
      expect(cube.getColor(Side.Right, 1, 0)).toBe(Side.Up);
    });

    it('should rotate Back on swipe east from row 0 (pieces move right)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 0, col: 1 }, 'E');
      // Back CCW: Up row 0 → Right col 2
      expect(cube.getColor(Side.Right, 1, 2)).toBe(Side.Up);
    });

    it('should rotate S slice on swipe east from row 1 (pieces move right)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 1, col: 1 }, 'E');
      // S slice CW: Up row 1 → Right col 1
      expect(cube.getColor(Side.Right, 1, 1)).toBe(Side.Up);
    });

    it('should rotate Right on swipe south from col 2 (pieces move forward)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 1, col: 2 }, 'S');
      // Right CCW: Up col 2 → Front col 2
      expect(cube.getColor(Side.Front, 1, 2)).toBe(Side.Up);
    });

    it('should rotate Left on swipe south from col 0 (pieces move forward)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 1, col: 0 }, 'S');
      // Left CW: Up col 0 → Front col 0
      expect(cube.getColor(Side.Front, 1, 0)).toBe(Side.Up);
    });

    it('should rotate M slice on swipe south from col 1 (pieces move forward)', () => {
      gestures.handleSwipe({ face: Side.Up, row: 1, col: 1 }, 'S');
      // M slice CCW: Up col 1 → Front col 1
      expect(cube.getColor(Side.Front, 1, 1)).toBe(Side.Up);
    });
  });

  describe('Right face swipes', () => {
    it('should rotate Up on swipe west from row 0 (pieces move toward Front)', () => {
      gestures.handleSwipe({ face: Side.Right, row: 0, col: 1 }, 'W');
      // Up CW: Right row 0 → Front row 0
      expect(cube.getColor(Side.Front, 0, 1)).toBe(Side.Right);
    });

    it('should rotate Up on swipe east from row 0 (pieces move toward Back)', () => {
      gestures.handleSwipe({ face: Side.Right, row: 0, col: 1 }, 'E');
      // Up CCW: Right row 0 → Back row 0
      expect(cube.getColor(Side.Back, 0, 1)).toBe(Side.Right);
    });

    it('should rotate Front on swipe south from col 0 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Right, row: 1, col: 0 }, 'S');
      // Front CW: Right col 0 → Down row 0 (reversed)
      expect(cube.getColor(Side.Down, 0, 2)).toBe(Side.Right);
    });

    it('should rotate Back on swipe south from col 2 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Right, row: 1, col: 2 }, 'S');
      // Back CCW: Right col 2 → Down row 2 (reversed)
      expect(cube.getColor(Side.Down, 2, 0)).toBe(Side.Right);
    });

    it('should rotate S slice on swipe south from col 1 (pieces move down)', () => {
      gestures.handleSwipe({ face: Side.Right, row: 1, col: 1 }, 'S');
      // S slice CW: Right col 1 → Down row 1 (reversed)
      expect(cube.getColor(Side.Down, 1, 1)).toBe(Side.Right);
    });
  });

  describe('gesture coverage', () => {
    it('should handle all 4 directions on Front face', () => {
      const directions = ['N', 'S', 'E', 'W'] as const;
      for (const dir of directions) {
        const freshCube = new RubiksCube();
        const freshGestures = new GestureController(freshCube);
        freshGestures.handleSwipe({ face: Side.Front, row: 1, col: 1 }, dir);
        expect(freshCube.isSolved()).toBe(false);
      }
    });

    it('should handle all 4 directions on Up face', () => {
      const directions = ['N', 'S', 'E', 'W'] as const;
      for (const dir of directions) {
        const freshCube = new RubiksCube();
        const freshGestures = new GestureController(freshCube);
        freshGestures.handleSwipe({ face: Side.Up, row: 1, col: 1 }, dir);
        expect(freshCube.isSolved()).toBe(false);
      }
    });

    it('should handle all 4 directions on Right face', () => {
      const directions = ['N', 'S', 'E', 'W'] as const;
      for (const dir of directions) {
        const freshCube = new RubiksCube();
        const freshGestures = new GestureController(freshCube);
        freshGestures.handleSwipe({ face: Side.Right, row: 1, col: 1 }, dir);
        expect(freshCube.isSolved()).toBe(false);
      }
    });

    it('should handle all 9 cells on each visible face', () => {
      const faces = [Side.Front, Side.Up, Side.Right];
      for (const face of faces) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const freshCube = new RubiksCube();
            const freshGestures = new GestureController(freshCube);
            freshGestures.handleSwipe({ face, row, col }, 'E');
            expect(freshCube.isSolved()).toBe(false);
          }
        }
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('edge cases', () => {
  it('should handle rapid successive rotations', () => {
    const cube = new RubiksCube();
    for (let i = 0; i < 100; i++) {
      cube.rotateSide(Math.floor(Math.random() * 6) as Side, Math.random() > 0.5);
    }
    // Should not throw, cube should have valid state
    expect(cube.getMoveCount()).toBe(100);
  });

  it('should maintain valid state after many operations', () => {
    const cube = new RubiksCube();
    cube.shuffle(50);
    cube.solve();

    // Verify every cell has a valid color
    for (let side = 0; side <= 5; side++) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const color = cube.getColor(side as Side, row, col);
          expect(color).toBeGreaterThanOrEqual(0);
          expect(color).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('should handle alternating CW/CCW rotations', () => {
    const cube = new RubiksCube();
    for (let i = 0; i < 10; i++) {
      cube.rotateSide(Side.Front, true);
      cube.rotateSide(Side.Front, false);
    }
    expect(cube.isSolved()).toBe(true);
  });
});
