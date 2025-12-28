/**
 * 3D Cube (Rubik's Cube) Logic Unit Tests
 */

import { RubiksCube, Side, SIDE_COLORS, DEFAULT_CANVAS_SIZE, DEFAULT_CUBE_SIZE } from './3d-cube';

describe('RubiksCube', () => {
  describe('initialization', () => {
    test('should start in solved state', () => {
      const cube = new RubiksCube();
      expect(cube.isSolved()).toBe(true);
    });

    test('should have 6 faces', () => {
      const cube = new RubiksCube();
      const faces = cube.getFaces();
      expect(Object.keys(faces).length).toBe(6);
    });

    test('each face should be 3x3', () => {
      const cube = new RubiksCube();
      const faces = cube.getFaces();
      for (let side = 0; side <= 5; side++) {
        expect(faces[side as Side].length).toBe(3);
        for (let row = 0; row < 3; row++) {
          expect(faces[side as Side][row].length).toBe(3);
        }
      }
    });

    test('each face should have uniform color initially', () => {
      const cube = new RubiksCube();
      for (let side = 0; side <= 5; side++) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            expect(cube.getColor(side as Side, row, col)).toBe(side);
          }
        }
      }
    });

    test('should have zero moves initially', () => {
      const cube = new RubiksCube();
      expect(cube.getMoveCount()).toBe(0);
    });
  });

  describe('reset', () => {
    test('should return cube to solved state', () => {
      const cube = new RubiksCube();
      cube.shuffle(10);
      expect(cube.isSolved()).toBe(false);
      cube.reset();
      expect(cube.isSolved()).toBe(true);
    });

    test('should clear move history', () => {
      const cube = new RubiksCube();
      cube.shuffle(10);
      expect(cube.getMoveCount()).toBeGreaterThan(0);
      cube.reset();
      expect(cube.getMoveCount()).toBe(0);
    });
  });

  describe('rotateSide', () => {
    test('rotating Up should change cube state', () => {
      const cube = new RubiksCube();
      cube.rotateSide(Side.Up, true);
      expect(cube.isSolved()).toBe(false);
    });

    test('rotating same side 4 times should return to solved', () => {
      const cube = new RubiksCube();
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);
      expect(cube.isSolved()).toBe(true);
    });

    test('clockwise then counter-clockwise should cancel out', () => {
      const cube = new RubiksCube();
      cube.rotateSide(Side.Front, true);
      cube.rotateSide(Side.Front, false);
      expect(cube.isSolved()).toBe(true);
    });

    test('should increment move count', () => {
      const cube = new RubiksCube();
      expect(cube.getMoveCount()).toBe(0);
      cube.rotateSide(Side.Up, true);
      expect(cube.getMoveCount()).toBe(1);
      cube.rotateSide(Side.Front, false);
      expect(cube.getMoveCount()).toBe(2);
    });

    test('should call onUpdate callback', () => {
      const cube = new RubiksCube();
      let updateCalled = false;
      cube.setOnUpdate(() => { updateCalled = true; });
      cube.rotateSide(Side.Up, true);
      expect(updateCalled).toBe(true);
    });
  });

  describe('shuffle', () => {
    test('should scramble the cube', () => {
      const cube = new RubiksCube();
      cube.shuffle(20);
      expect(cube.isSolved()).toBe(false);
    });

    test('should set move count equal to shuffle count', () => {
      const cube = new RubiksCube();
      cube.shuffle(15);
      expect(cube.getMoveCount()).toBe(15);
    });

    test('shuffling with 0 moves should leave cube solved', () => {
      const cube = new RubiksCube();
      cube.shuffle(0);
      expect(cube.isSolved()).toBe(true);
    });
  });

  describe('solve', () => {
    test('should return solution moves', () => {
      const cube = new RubiksCube();
      cube.shuffle(10);
      const solution = cube.solve();
      expect(solution.length).toBe(10);
    });

    test('applying solution should solve the cube', () => {
      const cube = new RubiksCube();
      cube.shuffle(10);
      const solution = cube.solve();
      for (const move of solution) {
        cube.rotateSide(move.side, move.clockwise);
      }
      expect(cube.isSolved()).toBe(true);
    });

    test('solution moves should be reversed', () => {
      const cube = new RubiksCube();
      cube.rotateSide(Side.Up, true);  // clockwise
      const solution = cube.solve();
      expect(solution.length).toBe(1);
      expect(solution[0].side).toBe(Side.Up);
      expect(solution[0].clockwise).toBe(false);  // counter-clockwise to reverse
    });

    test('solving already solved cube should return empty array', () => {
      const cube = new RubiksCube();
      const solution = cube.solve();
      expect(solution.length).toBe(0);
    });
  });

  describe('isSolved', () => {
    test('should return true for new cube', () => {
      const cube = new RubiksCube();
      expect(cube.isSolved()).toBe(true);
    });

    test('should return false after single rotation', () => {
      const cube = new RubiksCube();
      cube.rotateSide(Side.Front, true);
      expect(cube.isSolved()).toBe(false);
    });

    test('should return true after reset', () => {
      const cube = new RubiksCube();
      cube.shuffle(20);
      cube.reset();
      expect(cube.isSolved()).toBe(true);
    });
  });

  describe('getColor', () => {
    test('should return correct color for solved cube', () => {
      const cube = new RubiksCube();
      expect(cube.getColor(Side.Up, 0, 0)).toBe(Side.Up);
      expect(cube.getColor(Side.Front, 1, 1)).toBe(Side.Front);
      expect(cube.getColor(Side.Right, 2, 2)).toBe(Side.Right);
    });
  });

  describe('all sides rotation', () => {
    test('rotating each side clockwise 4 times should solve cube', () => {
      const cube = new RubiksCube();

      // Rotate each side 4 times
      for (let side = 0; side <= 5; side++) {
        cube.rotateSide(side as Side, true);
        cube.rotateSide(side as Side, true);
        cube.rotateSide(side as Side, true);
        cube.rotateSide(side as Side, true);
      }

      expect(cube.isSolved()).toBe(true);
    });
  });
});

describe('Side enum', () => {
  test('should have 6 values', () => {
    expect(Side.Up).toBe(0);
    expect(Side.Front).toBe(1);
    expect(Side.Right).toBe(2);
    expect(Side.Back).toBe(3);
    expect(Side.Left).toBe(4);
    expect(Side.Down).toBe(5);
  });
});

describe('SIDE_COLORS', () => {
  test('should have 6 colors', () => {
    expect(Object.keys(SIDE_COLORS).length).toBe(6);
  });

  test('each color should have r, g, b values', () => {
    for (let side = 0; side <= 5; side++) {
      const color = SIDE_COLORS[side as Side];
      expect(typeof color.r).toBe('number');
      expect(typeof color.g).toBe('number');
      expect(typeof color.b).toBe('number');
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });

  test('Up should be white', () => {
    const color = SIDE_COLORS[Side.Up];
    expect(color.r).toBe(255);
    expect(color.g).toBe(255);
    expect(color.b).toBe(255);
  });

  test('Down should be yellow', () => {
    const color = SIDE_COLORS[Side.Down];
    expect(color.r).toBe(255);
    expect(color.g).toBe(213);
    expect(color.b).toBe(0);
  });
});

describe('Constants', () => {
  test('DEFAULT_CANVAS_SIZE should be 280 (phone-friendly)', () => {
    expect(DEFAULT_CANVAS_SIZE).toBe(280);
  });

  test('DEFAULT_CUBE_SIZE should be 140 (half of canvas)', () => {
    expect(DEFAULT_CUBE_SIZE).toBe(140);
  });
});
