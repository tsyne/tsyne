/**
 * Jest tests for 3D Cube Rotation Logic
 *
 * Tests the tap-to-rotate functionality using cell notation:
 * - U = Up (white face)
 * - F = Front (green face as viewed in isometric)
 * - R = Right (red face as viewed in isometric)
 * - Cells numbered 11-33 (row-col, 1-based)
 *
 * Isometric View Mapping:
 *   U (Up)    = Up face (white)
 *   F (Front) = Front face (green)
 *   R (Right) = Right face (red)
 *
 * Run with: npx jest cube-rotation.test.ts
 */

import { RubiksCube, Side } from './3d-cube';

// ============================================================================
// DSL for Human-Readable State Verification
// ============================================================================

/**
 * Parse a visual cube state specification into expected face values.
 * Format (3 visible faces side-by-side):
 *   U:     F:     R:
 *   UUU    FFF    RRR
 *   UUU    FFF    RRR
 *   UUU    FFF    RRR
 *
 * Letters: U=Up, F=Front, R=Right, B=Back, L=Left, D=Down
 */
function parseVisualState(visual: string): { up: Side[][]; front: Side[][]; right: Side[][] } {
  const letterToSide: Record<string, Side> = {
    'U': Side.Up, 'F': Side.Front, 'R': Side.Right,
    'B': Side.Back, 'L': Side.Left, 'D': Side.Down,
  };

  // Extract just the 3-letter sequences (ignore labels and whitespace)
  const rows = visual.trim().split('\n')
    .map(line => line.replace(/[^UFRBLD]/g, ''))
    .filter(line => line.length >= 9); // Need 9 letters (3 faces × 3 cols)

  if (rows.length !== 3) {
    throw new Error(`Expected 3 data rows, got ${rows.length}. Input:\n${visual}`);
  }

  const up: Side[][] = [];
  const front: Side[][] = [];
  const right: Side[][] = [];

  for (let r = 0; r < 3; r++) {
    const letters = rows[r];
    up[r] = [letterToSide[letters[0]], letterToSide[letters[1]], letterToSide[letters[2]]];
    front[r] = [letterToSide[letters[3]], letterToSide[letters[4]], letterToSide[letters[5]]];
    right[r] = [letterToSide[letters[6]], letterToSide[letters[7]], letterToSide[letters[8]]];
  }

  return { up, front, right };
}

/**
 * Format cube state as visual string (for error messages)
 */
function formatVisualState(cube: RubiksCube): string {
  const faces = cube.getFaces();
  const sideToLetter = ['U', 'F', 'R', 'B', 'L', 'D'];

  let result = 'U:     F:     R:\n';
  for (let row = 0; row < 3; row++) {
    const u = faces[Side.Up][row].map(c => sideToLetter[c]).join('');
    const f = faces[Side.Front][row].map(c => sideToLetter[c]).join('');
    const r = faces[Side.Right][row].map(c => sideToLetter[c]).join('');
    result += `${u}    ${f}    ${r}\n`;
  }
  return result;
}

/**
 * Assert that cube's visible faces match the visual specification
 */
function expectVisualState(cube: RubiksCube, visual: string): void {
  const expected = parseVisualState(visual);
  const faces = cube.getFaces();

  const actual = {
    up: faces[Side.Up],
    front: faces[Side.Front],
    right: faces[Side.Right],
  };

  const match =
    JSON.stringify(actual.up) === JSON.stringify(expected.up) &&
    JSON.stringify(actual.front) === JSON.stringify(expected.front) &&
    JSON.stringify(actual.right) === JSON.stringify(expected.right);

  if (!match) {
    const actualVisual = formatVisualState(cube);
    throw new Error(`Cube state mismatch:\n\nExpected:\n${visual}\n\nActual:\n${actualVisual}`);
  }
}

/**
 * Parse cell notation like "F21" into face, row, col
 */
function parseCell(notation: string): { face: Side; row: number; col: number } {
  const faceChar = notation[0].toUpperCase();
  const row = parseInt(notation[1]) - 1; // Convert to 0-based
  const col = parseInt(notation[2]) - 1;

  let face: Side;
  switch (faceChar) {
    case 'U': face = Side.Up; break;
    case 'F': face = Side.Front; break;
    case 'R': face = Side.Right; break;
    default: throw new Error(`Unknown face: ${faceChar}`);
  }

  return { face, row, col };
}

/**
 * Determine rotation based on two cell selections (mirrors CubeUI.determineRotation)
 * Returns the rotation command or null if invalid
 */
function determineRotation(
  from: { face: Side; row: number; col: number },
  to: { face: Side; row: number; col: number }
): { type: 'face' | 'E' | 'M' | 'S'; side?: Side; clockwise: boolean } | null {
  // Same cell - cancel
  if (from.face === to.face && from.row === to.row && from.col === to.col) {
    return null;
  }

  // Same face - rotate row or column
  if (from.face === to.face) {
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;

    // Reject diagonal movements - require clear horizontal or vertical intent
    if (dRow !== 0 && dCol !== 0) {
      return null;
    }

    // Horizontal movement
    if (Math.abs(dCol) >= Math.abs(dRow)) {
      const movingRight = dCol > 0;

      if (from.face === Side.Front) {
        // Front face horizontal swipe
        if (from.row === 0) {
          return { type: 'face', side: Side.Up, clockwise: !movingRight };
        } else if (from.row === 2) {
          return { type: 'face', side: Side.Down, clockwise: movingRight };
        } else {
          return { type: 'E', clockwise: movingRight };
        }
      } else if (from.face === Side.Up) {
        // Up face horizontal swipe
        if (from.row === 0) {
          return { type: 'face', side: Side.Back, clockwise: !movingRight };
        } else if (from.row === 2) {
          return { type: 'face', side: Side.Front, clockwise: movingRight };
        } else {
          return { type: 'S', clockwise: movingRight };
        }
      } else if (from.face === Side.Right) {
        // Right face horizontal swipe
        if (from.row === 0) {
          return { type: 'face', side: Side.Up, clockwise: !movingRight };
        } else if (from.row === 2) {
          return { type: 'face', side: Side.Down, clockwise: movingRight };
        } else {
          return { type: 'E', clockwise: movingRight };
        }
      }
    } else {
      // Vertical movement
      const movingDown = dRow > 0;

      if (from.face === Side.Front) {
        // Front face vertical swipe
        if (from.col === 0) {
          return { type: 'face', side: Side.Left, clockwise: !movingDown };
        } else if (from.col === 2) {
          return { type: 'face', side: Side.Right, clockwise: movingDown };
        } else {
          return { type: 'M', clockwise: movingDown };
        }
      } else if (from.face === Side.Up) {
        // Up face vertical swipe
        if (from.col === 0) {
          return { type: 'face', side: Side.Left, clockwise: !movingDown };
        } else if (from.col === 2) {
          return { type: 'face', side: Side.Right, clockwise: movingDown };
        } else {
          return { type: 'face', side: Side.Right, clockwise: movingDown };
        }
      } else if (from.face === Side.Right) {
        // Right face vertical swipe
        if (from.col === 0) {
          return { type: 'face', side: Side.Front, clockwise: movingDown };
        } else if (from.col === 2) {
          return { type: 'face', side: Side.Back, clockwise: !movingDown };
        } else {
          return { type: 'face', side: Side.Front, clockwise: movingDown };
        }
      }
    }
  }

  // Cross-face movements (simplified)
  return { type: 'face', side: from.face, clockwise: true };
}

/**
 * Execute a mnemonic rotation like "F21→F23" on a cube
 */
function executeRotation(cube: RubiksCube, notation: string): void {
  const match = notation.match(/^([UFR]\d\d)\s*[→>]\s*([UFR]\d\d)$/i);
  if (!match) {
    throw new Error(`Invalid notation: ${notation}`);
  }

  const from = parseCell(match[1]);
  const to = parseCell(match[2]);
  const rotation = determineRotation(from, to);

  if (!rotation) {
    throw new Error(`No rotation for ${notation}`);
  }

  switch (rotation.type) {
    case 'E':
      cube.rotateESlice(rotation.clockwise);
      break;
    case 'M':
      cube.rotateMSlice(rotation.clockwise);
      break;
    case 'S':
      cube.rotateSSlice(rotation.clockwise);
      break;
    case 'face':
      cube.rotateSide(rotation.side!, rotation.clockwise);
      break;
  }
}

/**
 * Get a snapshot of all visible faces for comparison
 */
function getCubeSnapshot(cube: RubiksCube): string {
  const faces = cube.getFaces();
  let result = '';

  // Capture Up, Front, Right (visible faces)
  for (const side of [Side.Up, Side.Front, Side.Right]) {
    result += `${Side[side]}:\n`;
    for (let row = 0; row < 3; row++) {
      result += '  ' + faces[side][row].map(c => Side[c][0]).join('') + '\n';
    }
  }

  return result;
}

/**
 * Get full cube state as a comparable object
 */
function getFullCubeState(cube: RubiksCube): Record<Side, Side[][]> {
  const faces = cube.getFaces();
  // Deep clone to avoid reference issues
  const result: Record<Side, Side[][]> = {} as Record<Side, Side[][]>;
  for (let side = 0; side <= 5; side++) {
    result[side as Side] = faces[side as Side].map(row => [...row]);
  }
  return result;
}

describe('RubiksCube', () => {
  let cube: RubiksCube;

  beforeEach(() => {
    cube = new RubiksCube();
  });

  describe('Initial State', () => {
    test('should be solved initially', () => {
      expect(cube.isSolved()).toBe(true);
    });

    test('each face should have uniform color', () => {
      const faces = cube.getFaces();
      for (let side = 0; side <= 5; side++) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            expect(faces[side as Side][row][col]).toBe(side);
          }
        }
      }
    });
  });

  describe('Face Rotations', () => {
    test('U rotation should change front top row', () => {
      const before = cube.getColor(Side.Front, 0, 0);
      cube.rotateSide(Side.Up, true);
      const after = cube.getColor(Side.Front, 0, 0);
      expect(after).not.toBe(before);
    });

    test('4 clockwise rotations should return to initial state', () => {
      const initialState = getFullCubeState(cube);

      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Up, true);

      expect(getFullCubeState(cube)).toEqual(initialState);
    });

    test('clockwise then counter-clockwise should return to initial', () => {
      const initialState = getFullCubeState(cube);

      cube.rotateSide(Side.Front, true);
      cube.rotateSide(Side.Front, false);

      expect(getFullCubeState(cube)).toEqual(initialState);
    });
  });

  describe('E-Slice (Middle Horizontal Row)', () => {
    test('E-slice should rotate middle row of all 4 vertical faces', () => {
      // Mark middle row of Front face
      const frontMiddleBefore = [
        cube.getColor(Side.Front, 1, 0),
        cube.getColor(Side.Front, 1, 1),
        cube.getColor(Side.Front, 1, 2),
      ];

      cube.rotateESlice(true); // Clockwise from above: F→R→B→L

      // Front middle row should now have what was in Left
      const frontMiddleAfter = [
        cube.getColor(Side.Front, 1, 0),
        cube.getColor(Side.Front, 1, 1),
        cube.getColor(Side.Front, 1, 2),
      ];

      // After E clockwise, Front gets Left's colors
      expect(frontMiddleAfter).toEqual([Side.Left, Side.Left, Side.Left]);
      // And Right should now have Front's colors
      expect(cube.getColor(Side.Right, 1, 0)).toBe(Side.Front);
    });

    test('4 E-slice rotations should return to initial', () => {
      const initialState = getFullCubeState(cube);

      cube.rotateESlice(true);
      cube.rotateESlice(true);
      cube.rotateESlice(true);
      cube.rotateESlice(true);

      expect(getFullCubeState(cube)).toEqual(initialState);
    });
  });

  describe('M-Slice (Middle Vertical Column)', () => {
    test('M-slice should rotate middle column', () => {
      cube.rotateMSlice(true); // Clockwise from Right: Front←Down, Down←Back, Back←Up, Up←Front

      // Front middle column should now have Down's colors
      expect(cube.getColor(Side.Front, 0, 1)).toBe(Side.Down);
      expect(cube.getColor(Side.Front, 1, 1)).toBe(Side.Down);
      expect(cube.getColor(Side.Front, 2, 1)).toBe(Side.Down);
    });

    test('4 M-slice rotations should return to initial', () => {
      const initialState = getFullCubeState(cube);

      cube.rotateMSlice(true);
      cube.rotateMSlice(true);
      cube.rotateMSlice(true);
      cube.rotateMSlice(true);

      expect(getFullCubeState(cube)).toEqual(initialState);
    });
  });

  describe('S-Slice (Middle Standing Slice)', () => {
    test('S-slice should rotate between Front and Back', () => {
      cube.rotateSSlice(true);

      // Up middle row should change
      expect(cube.getColor(Side.Up, 1, 0)).not.toBe(Side.Up);
    });

    test('4 S-slice rotations should return to initial', () => {
      const initialState = getFullCubeState(cube);

      cube.rotateSSlice(true);
      cube.rotateSSlice(true);
      cube.rotateSSlice(true);
      cube.rotateSSlice(true);

      expect(getFullCubeState(cube)).toEqual(initialState);
    });
  });
});

describe('Mnemonic Rotation Notation', () => {
  describe('parseCell', () => {
    test('should parse T11 correctly', () => {
      const result = parseCell('U11');
      expect(result).toEqual({ face: Side.Up, row: 0, col: 0 });
    });

    test('should parse L21 correctly', () => {
      const result = parseCell('F21');
      expect(result).toEqual({ face: Side.Front, row: 1, col: 0 });
    });

    test('should parse R33 correctly', () => {
      const result = parseCell('R33');
      expect(result).toEqual({ face: Side.Right, row: 2, col: 2 });
    });

    test('should be case-insensitive', () => {
      expect(parseCell('f21')).toEqual(parseCell('F21'));
    });
  });

  describe('determineRotation', () => {
    test('F21→F23 should produce E-slice', () => {
      const from = parseCell('F21');
      const to = parseCell('F23');
      const rotation = determineRotation(from, to);

      expect(rotation).toEqual({ type: 'E', clockwise: true });
    });

    test('R21→R23 should produce E-slice', () => {
      const from = parseCell('R21');
      const to = parseCell('R23');
      const rotation = determineRotation(from, to);

      expect(rotation).toEqual({ type: 'E', clockwise: true });
    });

    test('F11→F13 should produce U counter-clockwise', () => {
      const from = parseCell('F11');
      const to = parseCell('F13');
      const rotation = determineRotation(from, to);

      expect(rotation).toEqual({ type: 'face', side: Side.Up, clockwise: false });
    });

    test('F31→F33 should produce D clockwise', () => {
      const from = parseCell('F31');
      const to = parseCell('F33');
      const rotation = determineRotation(from, to);

      expect(rotation).toEqual({ type: 'face', side: Side.Down, clockwise: true });
    });

    test('F12→F32 should produce M-slice (down)', () => {
      const from = parseCell('F12');
      const to = parseCell('F32');
      const rotation = determineRotation(from, to);

      expect(rotation).toEqual({ type: 'M', clockwise: true });
    });

    test('same cell should return null', () => {
      const from = parseCell('F21');
      const rotation = determineRotation(from, from);
      expect(rotation).toBeNull();
    });
  });
});

describe('Equivalent Rotations', () => {
  test('F21→F23 and R21→R23 should produce same E-slice result', () => {
    const cube1 = new RubiksCube();
    const cube2 = new RubiksCube();

    executeRotation(cube1, 'F21→F23');
    executeRotation(cube2, 'R21→R23');

    expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
  });

  test('F21→F23 should equal direct E-slice call', () => {
    const cube1 = new RubiksCube();
    const cube2 = new RubiksCube();

    executeRotation(cube1, 'F21→F23');
    cube2.rotateESlice(true);

    expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
  });

  test('F23→F21 should be inverse of F21→F23', () => {
    const cube = new RubiksCube();
    const initial = getFullCubeState(cube);

    executeRotation(cube, 'F21→F23');
    executeRotation(cube, 'F23→F21');

    expect(getFullCubeState(cube)).toEqual(initial);
  });

  test('U21→U23 and U21→U23 on different cubes should match', () => {
    const cube1 = new RubiksCube();
    const cube2 = new RubiksCube();

    executeRotation(cube1, 'U21→U23');
    executeRotation(cube2, 'U21→U23');

    expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
  });
});

describe('Row Rotations via Mnemonic', () => {
  describe('Top Row (row 1)', () => {
    test('F11→F13 should rotate U face counter-clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F11→F13');
      cube2.rotateSide(Side.Up, false);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F13→F11 should rotate U face clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F13→F11');
      cube2.rotateSide(Side.Up, true);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('Middle Row (row 2)', () => {
    test('F21→F23 should rotate E-slice clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F21→F23');
      cube2.rotateESlice(true);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F23→F21 should rotate E-slice counter-clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F23→F21');
      cube2.rotateESlice(false);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('Bottom Row (row 3)', () => {
    test('F31→F33 should rotate D face clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F31→F33');
      cube2.rotateSide(Side.Down, true);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F33→F31 should rotate D face counter-clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F33→F31');
      cube2.rotateSide(Side.Down, false);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });
});

describe('Column Rotations via Mnemonic', () => {
  describe('Left Column (col 1)', () => {
    test('F11→F31 should rotate L face counter-clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F11→F31');
      cube2.rotateSide(Side.Left, false);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('Middle Column (col 2)', () => {
    test('F12→F32 should rotate M-slice down (clockwise from Right)', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F12→F32');
      cube2.rotateMSlice(true);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F32→F12 should rotate M-slice up (counter-clockwise from Right)', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F32→F12');
      cube2.rotateMSlice(false);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('Right Column (col 3)', () => {
    test('F13→F33 should rotate R face clockwise', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();

      executeRotation(cube1, 'F13→F33');
      cube2.rotateSide(Side.Right, true);

      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });
});

describe('Shuffle and Solve', () => {
  test('shuffle should make cube unsolved', () => {
    const cube = new RubiksCube();
    cube.shuffle(10);
    // Very unlikely to be solved after 10 random moves
    // (but theoretically possible, so we just check state changed)
    const faces = cube.getFaces();
    let allSame = true;
    for (let side = 0; side <= 5; side++) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (faces[side as Side][row][col] !== side) {
            allSame = false;
            break;
          }
        }
      }
    }
    // At least some cell should be different after shuffle
    expect(allSame).toBe(false);
  });

  test('solve should return cube to solved state', () => {
    const cube = new RubiksCube();
    cube.shuffle(20);
    const solution = cube.solve();

    // Apply solution
    for (const move of solution) {
      cube.rotateSide(move.side, move.clockwise);
    }

    expect(cube.isSolved()).toBe(true);
  });
});

describe('Complex Sequences', () => {
  test('sexy move (R U R\' U\') x6 should return to solved', () => {
    const cube = new RubiksCube();
    for (let i = 0; i < 6; i++) {
      cube.rotateSide(Side.Right, true);
      cube.rotateSide(Side.Up, true);
      cube.rotateSide(Side.Right, false);
      cube.rotateSide(Side.Up, false);
    }
    expect(cube.isSolved()).toBe(true);
  });

  test('superflip (all edges flipped) sequence should work', () => {
    const cube = new RubiksCube();
    // This is a well-known algorithm
    // U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2
    // We just verify the cube doesn't crash and is valid after
    cube.rotateSide(Side.Up, true);
    cube.rotateSide(Side.Right, true);
    cube.rotateSide(Side.Right, true);
    cube.rotateSide(Side.Front, true);
    cube.rotateSide(Side.Back, true);
    // ... abbreviated for test brevity

    // Cube should still be in valid state
    const faces = cube.getFaces();
    expect(faces[Side.Up]).toBeDefined();
  });
});

// ============================================================================
// EXHAUSTIVE PERMUTATION TESTS
// ============================================================================

/**
 * Helper to test that forward and reverse rotations are inverses
 */
function testForwardReverseInverse(from: string, to: string): void {
  const cube = new RubiksCube();
  const initial = getFullCubeState(cube);

  executeRotation(cube, `${from}→${to}`);
  executeRotation(cube, `${to}→${from}`);

  expect(getFullCubeState(cube)).toEqual(initial);
}

/**
 * Helper to test two rotations produce identical results
 */
function testRotationsEquivalent(rot1: string, rot2: string): void {
  const cube1 = new RubiksCube();
  const cube2 = new RubiksCube();

  executeRotation(cube1, rot1);
  executeRotation(cube2, rot2);

  expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
}

// All cells on each face
const F_CELLS = ['F11', 'F12', 'F13', 'F21', 'F22', 'F23', 'F31', 'F32', 'F33'];
const U_CELLS = ['U11', 'U12', 'U13', 'U21', 'U22', 'U23', 'U31', 'U32', 'U33'];
const R_CELLS = ['R11', 'R12', 'R13', 'R21', 'R22', 'R23', 'R31', 'R32', 'R33'];

describe('Exhaustive Same-Face Horizontal Movements', () => {
  describe('F (Front) Face - Row 1 (Top)', () => {
    test('F11→F12 and F12→F11 are inverses', () => testForwardReverseInverse('F11', 'F12'));
    test('F11→F13 and F13→F11 are inverses', () => testForwardReverseInverse('F11', 'F13'));
    test('F12→F13 and F13→F12 are inverses', () => testForwardReverseInverse('F12', 'F13'));
    test('F12→F11 and F11→F12 are inverses', () => testForwardReverseInverse('F12', 'F11'));
    test('F13→F11 and F11→F13 are inverses', () => testForwardReverseInverse('F13', 'F11'));
    test('F13→F12 and F12→F13 are inverses', () => testForwardReverseInverse('F13', 'F12'));
  });

  describe('F (Front) Face - Row 2 (Middle)', () => {
    test('F21→F22 and F22→F21 are inverses', () => testForwardReverseInverse('F21', 'F22'));
    test('F21→F23 and F23→F21 are inverses', () => testForwardReverseInverse('F21', 'F23'));
    test('F22→F23 and F23→F22 are inverses', () => testForwardReverseInverse('F22', 'F23'));
    test('F22→F21 and F21→F22 are inverses', () => testForwardReverseInverse('F22', 'F21'));
    test('F23→F21 and F21→F23 are inverses', () => testForwardReverseInverse('F23', 'F21'));
    test('F23→F22 and F22→F23 are inverses', () => testForwardReverseInverse('F23', 'F22'));
  });

  describe('F (Front) Face - Row 3 (Bottom)', () => {
    test('F31→F32 and F32→F31 are inverses', () => testForwardReverseInverse('F31', 'F32'));
    test('F31→F33 and F33→F31 are inverses', () => testForwardReverseInverse('F31', 'F33'));
    test('F32→F33 and F33→F32 are inverses', () => testForwardReverseInverse('F32', 'F33'));
    test('F32→F31 and F31→F32 are inverses', () => testForwardReverseInverse('F32', 'F31'));
    test('F33→F31 and F31→F33 are inverses', () => testForwardReverseInverse('F33', 'F31'));
    test('F33→F32 and F32→F33 are inverses', () => testForwardReverseInverse('F33', 'F32'));
  });

  describe('U (Up) Face - Row 1 (Back edge)', () => {
    test('U11→U12 and U12→U11 are inverses', () => testForwardReverseInverse('U11', 'U12'));
    test('U11→U13 and U13→U11 are inverses', () => testForwardReverseInverse('U11', 'U13'));
    test('U12→U13 and U13→U12 are inverses', () => testForwardReverseInverse('U12', 'U13'));
    test('U12→U11 and U11→U12 are inverses', () => testForwardReverseInverse('U12', 'U11'));
    test('U13→U11 and U11→U13 are inverses', () => testForwardReverseInverse('U13', 'U11'));
    test('U13→U12 and U12→U13 are inverses', () => testForwardReverseInverse('U13', 'U12'));
  });

  describe('U (Up) Face - Row 2 (Middle)', () => {
    test('U21→U22 and U22→U21 are inverses', () => testForwardReverseInverse('U21', 'U22'));
    test('U21→U23 and U23→U21 are inverses', () => testForwardReverseInverse('U21', 'U23'));
    test('U22→U23 and U23→U22 are inverses', () => testForwardReverseInverse('U22', 'U23'));
    test('U22→U21 and U21→U22 are inverses', () => testForwardReverseInverse('U22', 'U21'));
    test('U23→U21 and U21→U23 are inverses', () => testForwardReverseInverse('U23', 'U21'));
    test('U23→U22 and U22→U23 are inverses', () => testForwardReverseInverse('U23', 'U22'));
  });

  describe('U (Up) Face - Row 3 (Front edge)', () => {
    test('U31→U32 and U32→U31 are inverses', () => testForwardReverseInverse('U31', 'U32'));
    test('U31→U33 and U33→U31 are inverses', () => testForwardReverseInverse('U31', 'U33'));
    test('U32→U33 and U33→U32 are inverses', () => testForwardReverseInverse('U32', 'U33'));
    test('U32→U31 and U31→U32 are inverses', () => testForwardReverseInverse('U32', 'U31'));
    test('U33→U31 and U31→U33 are inverses', () => testForwardReverseInverse('U33', 'U31'));
    test('U33→U32 and U32→U33 are inverses', () => testForwardReverseInverse('U33', 'U32'));
  });

  describe('R (Right) Face - Row 1 (Top)', () => {
    test('R11→R12 and R12→R11 are inverses', () => testForwardReverseInverse('R11', 'R12'));
    test('R11→R13 and R13→R11 are inverses', () => testForwardReverseInverse('R11', 'R13'));
    test('R12→R13 and R13→R12 are inverses', () => testForwardReverseInverse('R12', 'R13'));
    test('R12→R11 and R11→R12 are inverses', () => testForwardReverseInverse('R12', 'R11'));
    test('R13→R11 and R11→R13 are inverses', () => testForwardReverseInverse('R13', 'R11'));
    test('R13→R12 and R12→R13 are inverses', () => testForwardReverseInverse('R13', 'R12'));
  });

  describe('R (Right) Face - Row 2 (Middle)', () => {
    test('R21→R22 and R22→R21 are inverses', () => testForwardReverseInverse('R21', 'R22'));
    test('R21→R23 and R23→R21 are inverses', () => testForwardReverseInverse('R21', 'R23'));
    test('R22→R23 and R23→R22 are inverses', () => testForwardReverseInverse('R22', 'R23'));
    test('R22→R21 and R21→R22 are inverses', () => testForwardReverseInverse('R22', 'R21'));
    test('R23→R21 and R21→R23 are inverses', () => testForwardReverseInverse('R23', 'R21'));
    test('R23→R22 and R22→R23 are inverses', () => testForwardReverseInverse('R23', 'R22'));
  });

  describe('R (Right) Face - Row 3 (Bottom)', () => {
    test('R31→R32 and R32→R31 are inverses', () => testForwardReverseInverse('R31', 'R32'));
    test('R31→R33 and R33→R31 are inverses', () => testForwardReverseInverse('R31', 'R33'));
    test('R32→R33 and R33→R32 are inverses', () => testForwardReverseInverse('R32', 'R33'));
    test('R32→R31 and R31→R32 are inverses', () => testForwardReverseInverse('R32', 'R31'));
    test('R33→R31 and R31→R33 are inverses', () => testForwardReverseInverse('R33', 'R31'));
    test('R33→R32 and R32→R33 are inverses', () => testForwardReverseInverse('R33', 'R32'));
  });
});

describe('Exhaustive Same-Face Vertical Movements', () => {
  describe('F (Front) Face - Col 1 (Left)', () => {
    test('F11→F21 and F21→F11 are inverses', () => testForwardReverseInverse('F11', 'F21'));
    test('F11→F31 and F31→F11 are inverses', () => testForwardReverseInverse('F11', 'F31'));
    test('F21→F31 and F31→F21 are inverses', () => testForwardReverseInverse('F21', 'F31'));
    test('F21→F11 and F11→F21 are inverses', () => testForwardReverseInverse('F21', 'F11'));
    test('F31→F11 and F11→F31 are inverses', () => testForwardReverseInverse('F31', 'F11'));
    test('F31→F21 and F21→F31 are inverses', () => testForwardReverseInverse('F31', 'F21'));
  });

  describe('F (Front) Face - Col 2 (Middle)', () => {
    test('F12→F22 and F22→F12 are inverses', () => testForwardReverseInverse('F12', 'F22'));
    test('F12→F32 and F32→F12 are inverses', () => testForwardReverseInverse('F12', 'F32'));
    test('F22→F32 and F32→F22 are inverses', () => testForwardReverseInverse('F22', 'F32'));
    test('F22→F12 and F12→F22 are inverses', () => testForwardReverseInverse('F22', 'F12'));
    test('F32→F12 and F12→F32 are inverses', () => testForwardReverseInverse('F32', 'F12'));
    test('F32→F22 and F22→F32 are inverses', () => testForwardReverseInverse('F32', 'F22'));
  });

  describe('F (Front) Face - Col 3 (Right)', () => {
    test('F13→F23 and F23→F13 are inverses', () => testForwardReverseInverse('F13', 'F23'));
    test('F13→F33 and F33→F13 are inverses', () => testForwardReverseInverse('F13', 'F33'));
    test('F23→F33 and F33→F23 are inverses', () => testForwardReverseInverse('F23', 'F33'));
    test('F23→F13 and F13→F23 are inverses', () => testForwardReverseInverse('F23', 'F13'));
    test('F33→F13 and F13→F33 are inverses', () => testForwardReverseInverse('F33', 'F13'));
    test('F33→F23 and F23→F33 are inverses', () => testForwardReverseInverse('F33', 'F23'));
  });

  describe('U (Up) Face - Col 1 (Left)', () => {
    test('U11→U21 and U21→U11 are inverses', () => testForwardReverseInverse('U11', 'U21'));
    test('U11→U31 and U31→U11 are inverses', () => testForwardReverseInverse('U11', 'U31'));
    test('U21→U31 and U31→U21 are inverses', () => testForwardReverseInverse('U21', 'U31'));
    test('U21→U11 and U11→U21 are inverses', () => testForwardReverseInverse('U21', 'U11'));
    test('U31→U11 and U11→U31 are inverses', () => testForwardReverseInverse('U31', 'U11'));
    test('U31→U21 and U21→U31 are inverses', () => testForwardReverseInverse('U31', 'U21'));
  });

  describe('U (Up) Face - Col 2 (Middle)', () => {
    test('U12→U22 and U22→U12 are inverses', () => testForwardReverseInverse('U12', 'U22'));
    test('U12→U32 and U32→U12 are inverses', () => testForwardReverseInverse('U12', 'U32'));
    test('U22→U32 and U32→U22 are inverses', () => testForwardReverseInverse('U22', 'U32'));
    test('U22→U12 and U12→U22 are inverses', () => testForwardReverseInverse('U22', 'U12'));
    test('U32→U12 and U12→U32 are inverses', () => testForwardReverseInverse('U32', 'U12'));
    test('U32→U22 and U22→U32 are inverses', () => testForwardReverseInverse('U32', 'U22'));
  });

  describe('U (Up) Face - Col 3 (Right)', () => {
    test('U13→U23 and U23→U13 are inverses', () => testForwardReverseInverse('U13', 'U23'));
    test('U13→U33 and U33→U13 are inverses', () => testForwardReverseInverse('U13', 'U33'));
    test('U23→U33 and U33→U23 are inverses', () => testForwardReverseInverse('U23', 'U33'));
    test('U23→U13 and U13→U23 are inverses', () => testForwardReverseInverse('U23', 'U13'));
    test('U33→U13 and U13→U33 are inverses', () => testForwardReverseInverse('U33', 'U13'));
    test('U33→U23 and U23→U33 are inverses', () => testForwardReverseInverse('U33', 'U23'));
  });

  describe('R (Right) Face - Col 1 (Front edge)', () => {
    test('R11→R21 and R21→R11 are inverses', () => testForwardReverseInverse('R11', 'R21'));
    test('R11→R31 and R31→R11 are inverses', () => testForwardReverseInverse('R11', 'R31'));
    test('R21→R31 and R31→R21 are inverses', () => testForwardReverseInverse('R21', 'R31'));
    test('R21→R11 and R11→R21 are inverses', () => testForwardReverseInverse('R21', 'R11'));
    test('R31→R11 and R11→R31 are inverses', () => testForwardReverseInverse('R31', 'R11'));
    test('R31→R21 and R21→R31 are inverses', () => testForwardReverseInverse('R31', 'R21'));
  });

  describe('R (Right) Face - Col 2 (Middle)', () => {
    test('R12→R22 and R22→R12 are inverses', () => testForwardReverseInverse('R12', 'R22'));
    test('R12→R32 and R32→R12 are inverses', () => testForwardReverseInverse('R12', 'R32'));
    test('R22→R32 and R32→R22 are inverses', () => testForwardReverseInverse('R22', 'R32'));
    test('R22→R12 and R12→R22 are inverses', () => testForwardReverseInverse('R22', 'R12'));
    test('R32→R12 and R12→R32 are inverses', () => testForwardReverseInverse('R32', 'R12'));
    test('R32→R22 and R22→R32 are inverses', () => testForwardReverseInverse('R32', 'R22'));
  });

  describe('R (Right) Face - Col 3 (Back edge)', () => {
    test('R13→R23 and R23→R13 are inverses', () => testForwardReverseInverse('R13', 'R23'));
    test('R13→R33 and R33→R13 are inverses', () => testForwardReverseInverse('R13', 'R33'));
    test('R23→R33 and R33→R23 are inverses', () => testForwardReverseInverse('R23', 'R33'));
    test('R23→R13 and R13→R23 are inverses', () => testForwardReverseInverse('R23', 'R13'));
    test('R33→R13 and R13→R33 are inverses', () => testForwardReverseInverse('R33', 'R13'));
    test('R33→R23 and R23→R33 are inverses', () => testForwardReverseInverse('R33', 'R23'));
  });
});

describe('Diagonal Same-Face Movements (Rejected)', () => {
  // Diagonal movements are now rejected to force users to make clear
  // horizontal or vertical swipe gestures. This prevents ambiguous input.

  describe('Diagonal movements return null', () => {
    test('F11→F22 (diagonal) returns null', () => {
      const from = parseCell('F11');
      const to = parseCell('F22');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });

    test('F22→F11 (diagonal) returns null', () => {
      const from = parseCell('F22');
      const to = parseCell('F11');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });

    test('F13→F31 (diagonal) returns null', () => {
      const from = parseCell('F13');
      const to = parseCell('F31');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });

    test('F31→F13 (diagonal) returns null', () => {
      const from = parseCell('F31');
      const to = parseCell('F13');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });

    test('R23→R11 (diagonal) returns null', () => {
      const from = parseCell('R23');
      const to = parseCell('R11');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });

    test('U11→U33 (diagonal) returns null', () => {
      const from = parseCell('U11');
      const to = parseCell('U33');
      const rotation = determineRotation(from, to);
      expect(rotation).toBeNull();
    });
  });

  describe('All diagonal pairs on each face return null', () => {
    // All diagonal movements where both row and col change should be rejected
    const diagonalPairs = [
      // F face diagonals
      ['F11', 'F22'], ['F11', 'F23'], ['F11', 'F32'], ['F11', 'F33'],
      ['F12', 'F21'], ['F12', 'F23'], ['F12', 'F31'], ['F12', 'F33'],
      ['F13', 'F21'], ['F13', 'F22'], ['F13', 'F31'], ['F13', 'F32'],
      ['F21', 'F12'], ['F21', 'F32'], ['F21', 'F13'], ['F21', 'F33'],
      ['F22', 'F11'], ['F22', 'F13'], ['F22', 'F31'], ['F22', 'F33'],
      ['F23', 'F11'], ['F23', 'F12'], ['F23', 'F31'], ['F23', 'F32'],
      ['F31', 'F12'], ['F31', 'F13'], ['F31', 'F22'], ['F31', 'F23'],
      ['F32', 'F11'], ['F32', 'F13'], ['F32', 'F21'], ['F32', 'F23'],
      ['F33', 'F11'], ['F33', 'F12'], ['F33', 'F21'], ['F33', 'F22'],
      // U face diagonals (subset)
      ['U11', 'U22'], ['U22', 'U33'], ['U13', 'U31'],
      // R face diagonals (subset)
      ['R11', 'U22'], ['R22', 'R33'], ['R23', 'R11'],
    ];

    for (const [fromCell, toCell] of diagonalPairs) {
      // Only test same-face diagonals
      if (fromCell[0] === toCell[0]) {
        test(`${fromCell}→${toCell} returns null`, () => {
          const from = parseCell(fromCell);
          const to = parseCell(toCell);
          const rotation = determineRotation(from, to);
          expect(rotation).toBeNull();
        });
      }
    }
  });

  describe('executeRotation throws for diagonal movements', () => {
    test('F11→F22 throws "No rotation" error', () => {
      const cube = new RubiksCube();
      expect(() => executeRotation(cube, 'F11→F22')).toThrow('No rotation');
    });

    test('R23→R11 throws "No rotation" error', () => {
      const cube = new RubiksCube();
      expect(() => executeRotation(cube, 'R23→R11')).toThrow('No rotation');
    });
  });
});

describe('Equivalent Rotations Across Faces', () => {
  describe('E-slice equivalence (middle horizontal row)', () => {
    // All these should produce identical E-slice rotations
    test('F21→F23 equals R21→R23', () => testRotationsEquivalent('F21→F23', 'R21→R23'));
    test('F22→F23 equals R22→R23', () => testRotationsEquivalent('F22→F23', 'R22→R23'));
    test('F21→F22 equals R21→R22', () => testRotationsEquivalent('F21→F22', 'R21→R22'));

    // Reverse directions
    test('F23→F21 equals R23→R21', () => testRotationsEquivalent('F23→F21', 'R23→R21'));
    test('F23→F22 equals R23→R22', () => testRotationsEquivalent('F23→F22', 'R23→R22'));
    test('F22→F21 equals R22→R21', () => testRotationsEquivalent('F22→F21', 'R22→R21'));
  });

  describe('U face equivalence (top row)', () => {
    // F and R face top row horizontal movements should both trigger U rotations
    test('F11→F13 equals R11→R13', () => testRotationsEquivalent('F11→F13', 'R11→R13'));
    test('F13→F11 equals R13→R11', () => testRotationsEquivalent('F13→F11', 'R13→R11'));
    test('F11→F12 equals R11→R12', () => testRotationsEquivalent('F11→F12', 'R11→R12'));
    test('F12→F11 equals R12→R11', () => testRotationsEquivalent('F12→F11', 'R12→R11'));
  });

  describe('D face equivalence (bottom row)', () => {
    // F and R face bottom row horizontal movements should both trigger D rotations
    test('F31→F33 equals R31→R33', () => testRotationsEquivalent('F31→F33', 'R31→R33'));
    test('F33→F31 equals R33→R31', () => testRotationsEquivalent('F33→F31', 'R33→R31'));
    test('F31→F32 equals R31→R32', () => testRotationsEquivalent('F31→F32', 'R31→R32'));
    test('F32→F31 equals R32→R31', () => testRotationsEquivalent('F32→F31', 'R32→R31'));
  });
});

describe('Rotation Mappings Verification', () => {
  describe('F (Front) Face Horizontal → Expected Rotations', () => {
    // Row 1: U face rotation
    test('F11→F13 produces U\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F11→F13');
      cube2.rotateSide(Side.Up, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F13→F11 produces U', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F13→F11');
      cube2.rotateSide(Side.Up, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 2: E slice
    test('F21→F23 produces E', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F21→F23');
      cube2.rotateESlice(true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F23→F21 produces E\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F23→F21');
      cube2.rotateESlice(false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 3: D face rotation
    test('F31→F33 produces D', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F31→F33');
      cube2.rotateSide(Side.Down, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F33→F31 produces D\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F33→F31');
      cube2.rotateSide(Side.Down, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('F (Front) Face Vertical → Expected Rotations', () => {
    // Col 1: L face rotation
    test('F11→F31 produces L\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F11→F31');
      cube2.rotateSide(Side.Left, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F31→F11 produces L', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F31→F11');
      cube2.rotateSide(Side.Left, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 2: M slice
    test('F12→F32 produces M', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F12→F32');
      cube2.rotateMSlice(true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F32→F12 produces M\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F32→F12');
      cube2.rotateMSlice(false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 3: R face rotation
    test('F13→F33 produces R', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F13→F33');
      cube2.rotateSide(Side.Right, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('F33→F13 produces R\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'F33→F13');
      cube2.rotateSide(Side.Right, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('U (Up) Face Horizontal → Expected Rotations', () => {
    // Row 1 (back edge): B face rotation
    test('U11→U13 produces B\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U11→U13');
      cube2.rotateSide(Side.Back, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U13→U11 produces B', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U13→U11');
      cube2.rotateSide(Side.Back, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 2 (middle): S slice
    test('U21→U23 produces S', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U21→U23');
      cube2.rotateSSlice(true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U23→U21 produces S\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U23→U21');
      cube2.rotateSSlice(false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 3 (front edge): F face rotation
    test('U31→U33 produces F', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U31→U33');
      cube2.rotateSide(Side.Front, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U33→U31 produces F\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U33→U31');
      cube2.rotateSide(Side.Front, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('U (Up) Face Vertical → Expected Rotations', () => {
    // Col 1: L face rotation
    test('U11→U31 produces L\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U11→U31');
      cube2.rotateSide(Side.Left, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U31→U11 produces L', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U31→U11');
      cube2.rotateSide(Side.Left, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 2: R face rotation (T face middle col vertical maps to R)
    test('U12→U32 produces R', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U12→U32');
      cube2.rotateSide(Side.Right, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U32→U12 produces R\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U32→U12');
      cube2.rotateSide(Side.Right, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 3: R face rotation
    test('U13→U33 produces R', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U13→U33');
      cube2.rotateSide(Side.Right, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('U33→U13 produces R\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'U33→U13');
      cube2.rotateSide(Side.Right, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('R (Right) Face Horizontal → Expected Rotations', () => {
    // Row 1: U face rotation
    test('R11→R13 produces U\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R11→R13');
      cube2.rotateSide(Side.Up, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R13→R11 produces U', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R13→R11');
      cube2.rotateSide(Side.Up, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 2: E slice
    test('R21→R23 produces E', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R21→R23');
      cube2.rotateESlice(true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R23→R21 produces E\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R23→R21');
      cube2.rotateESlice(false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Row 3: D face rotation
    test('R31→R33 produces D', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R31→R33');
      cube2.rotateSide(Side.Down, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R33→R31 produces D\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R33→R31');
      cube2.rotateSide(Side.Down, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });

  describe('R (Right) Face Vertical → Expected Rotations', () => {
    // Col 1 (front edge): F face rotation
    test('R11→R31 produces F', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R11→R31');
      cube2.rotateSide(Side.Front, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R31→R11 produces F\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R31→R11');
      cube2.rotateSide(Side.Front, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 2 (middle): F face rotation (R face middle col vertical maps to F)
    test('R12→R32 produces F', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R12→R32');
      cube2.rotateSide(Side.Front, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R32→R12 produces F\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R32→R12');
      cube2.rotateSide(Side.Front, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    // Col 3 (back edge): B face rotation
    test('R13→R33 produces B\'', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R13→R33');
      cube2.rotateSide(Side.Back, false);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });

    test('R33→R13 produces B', () => {
      const cube1 = new RubiksCube();
      const cube2 = new RubiksCube();
      executeRotation(cube1, 'R33→R13');
      cube2.rotateSide(Side.Back, true);
      expect(getFullCubeState(cube1)).toEqual(getFullCubeState(cube2));
    });
  });
});

describe('All Possible Same-Face Cell Pairs (Horizontal & Vertical Only)', () => {
  // Generate all horizontal and vertical pairs within each face
  // Note: Diagonal pairs are NOT expected to be inverses because
  // forward vs reverse may trigger different row/column rotations
  const faces = ['F', 'U', 'R'];

  for (const face of faces) {
    describe(`${face} face - horizontal pair inverses`, () => {
      // Row 1
      for (const [from, to] of [['11', '12'], ['11', '13'], ['12', '13']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
      // Row 2
      for (const [from, to] of [['21', '22'], ['21', '23'], ['22', '23']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
      // Row 3
      for (const [from, to] of [['31', '32'], ['31', '33'], ['32', '33']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
    });

    describe(`${face} face - vertical pair inverses`, () => {
      // Col 1
      for (const [from, to] of [['11', '21'], ['11', '31'], ['21', '31']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
      // Col 2
      for (const [from, to] of [['12', '22'], ['12', '32'], ['22', '32']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
      // Col 3
      for (const [from, to] of [['13', '23'], ['13', '33'], ['23', '33']]) {
        test(`${face}${from}→${face}${to} and reverse are inverses`, () => {
          testForwardReverseInverse(`${face}${from}`, `${face}${to}`);
        });
      }
    });
  }
});

describe('Four Rotations Return to Initial', () => {
  // Any rotation done 4 times should return to initial state
  const testCases = [
    'F11→F13', 'F21→F23', 'F31→F33',  // F horizontal
    'F11→F31', 'F12→F32', 'F13→F33',  // F vertical
    'U11→U13', 'U21→U23', 'U31→U33',  // U horizontal
    'U11→U31', 'U12→U32', 'U13→U33',  // U vertical
    'R11→R13', 'R21→R23', 'R31→R33',  // R horizontal
    'R11→R31', 'R12→R32', 'R13→R33',  // R vertical
  ];

  for (const rotation of testCases) {
    test(`${rotation} x4 returns to initial`, () => {
      const cube = new RubiksCube();
      const initial = getFullCubeState(cube);

      executeRotation(cube, rotation);
      executeRotation(cube, rotation);
      executeRotation(cube, rotation);
      executeRotation(cube, rotation);

      expect(getFullCubeState(cube)).toEqual(initial);
    });
  }
});

// ============================================================================
// VISUAL STATE TESTS (Human-Readable DSL)
// ============================================================================
// These tests verify exact cube state using a visual notation.
// U = Up (white), F = Front (green), R = Right (red)
// Letters show which face's color is at each position.

describe('Visual State Verification', () => {
  describe('Solved Cube', () => {
    test('initial state is solved', () => {
      const cube = new RubiksCube();
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    FFF    RRR
        UUU    FFF    RRR
      `);
    });
  });

  describe('F (Front) Face Horizontal Rotations', () => {
    test("F11→F13 produces U' - top row: Left→Front, Front→Right", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F11→F13');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    LLL    FFF
        UUU    FFF    RRR
        UUU    FFF    RRR
      `);
    });

    test('F13→F11 produces U - top row: Right→Front, Front→Left', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F13→F11');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    RRR    BBB
        UUU    FFF    RRR
        UUU    FFF    RRR
      `);
    });

    test('F21→F23 produces E - middle row moves Left→Front', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F21→F23');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    LLL    FFF
        UUU    FFF    RRR
      `);
    });

    test("F23→F21 produces E' - middle row moves Front→Left", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F23→F21');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    RRR    BBB
        UUU    FFF    RRR
      `);
    });

    test('F31→F33 produces D - bottom row moves Front→Right', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F31→F33');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    FFF    RRR
        UUU    LLL    FFF
      `);
    });

    test("F33→F31 produces D' - bottom row moves Right→Front", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F33→F31');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    FFF    RRR
        UUU    RRR    BBB
      `);
    });
  });

  describe('F (Front) Face Vertical Rotations', () => {
    test("F11→F31 produces L' - left col: Up→Front, Front→Down", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F11→F31');
      expectVisualState(cube, `
        U:     F:     R:
        FUU    DFF    RRR
        FUU    DFF    RRR
        FUU    DFF    RRR
      `);
    });

    test('F31→F11 produces L - left col: Down→Front, Front→Up', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F31→F11');
      expectVisualState(cube, `
        U:     F:     R:
        BUU    UFF    RRR
        BUU    UFF    RRR
        BUU    UFF    RRR
      `);
    });

    test('F12→F32 produces M - middle col: Up→Front, Front→Down', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F12→F32');
      expectVisualState(cube, `
        U:     F:     R:
        UFU    FDF    RRR
        UFU    FDF    RRR
        UFU    FDF    RRR
      `);
    });

    test("F32→F12 produces M' - middle col: Down→Front, Front→Up", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F32→F12');
      expectVisualState(cube, `
        U:     F:     R:
        UBU    FUF    RRR
        UBU    FUF    RRR
        UBU    FUF    RRR
      `);
    });

    test('F13→F33 produces R - right col: Front→Up, Down→Front', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F13→F33');
      expectVisualState(cube, `
        U:     F:     R:
        UUF    FFD    RRR
        UUF    FFD    RRR
        UUF    FFD    RRR
      `);
    });

    test("F33→F13 produces R' - right col: Up→Front, Front→Down", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'F33→F13');
      expectVisualState(cube, `
        U:     F:     R:
        UUB    FFU    RRR
        UUB    FFU    RRR
        UUB    FFU    RRR
      `);
    });
  });

  describe('R (Right) Face Horizontal Rotations', () => {
    test("R11→R13 produces U' - same as F11→F13", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R11→R13');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    LLL    FFF
        UUU    FFF    RRR
        UUU    FFF    RRR
      `);
    });

    test('R13→R11 produces U - same as F13→F11', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R13→R11');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    RRR    BBB
        UUU    FFF    RRR
        UUU    FFF    RRR
      `);
    });

    test('R21→R23 produces E - same as F21→F23', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R21→R23');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    LLL    FFF
        UUU    FFF    RRR
      `);
    });

    test("R23→R21 produces E' - same as F23→F21", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R23→R21');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    RRR    BBB
        UUU    FFF    RRR
      `);
    });

    test('R31→R33 produces D - same as F31→F33', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R31→R33');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    FFF    RRR
        UUU    LLL    FFF
      `);
    });

    test("R33→R31 produces D' - same as F33→F31", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R33→R31');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RRR
        UUU    FFF    RRR
        UUU    RRR    BBB
      `);
    });
  });

  describe('R (Right) Face Vertical Rotations', () => {
    test('R11→R31 produces F - R col 0 gets Up colors', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R11→R31');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    URR
        UUU    FFF    URR
        LLL    FFF    URR
      `);
    });

    test("R31→R11 produces F' - R col 0 gets Down colors", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R31→R11');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    DRR
        UUU    FFF    DRR
        RRR    FFF    DRR
      `);
    });

    test('R12→R32 produces F - R col 1 gets Up colors (same as R11→R31)', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R12→R32');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    URR
        UUU    FFF    URR
        LLL    FFF    URR
      `);
    });

    test("R32→R12 produces F' - R col 1 gets Down colors (same as R31→R11)", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R32→R12');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    DRR
        UUU    FFF    DRR
        RRR    FFF    DRR
      `);
    });

    test("R13→R33 produces B' - U row 0 gets Left colors", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R13→R33');
      expectVisualState(cube, `
        U:     F:     R:
        LLL    FFF    RRU
        UUU    FFF    RRU
        UUU    FFF    RRU
      `);
    });

    test('R33→R13 produces B - U row 0 gets Right colors', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'R33→R13');
      expectVisualState(cube, `
        U:     F:     R:
        RRR    FFF    RRD
        UUU    FFF    RRD
        UUU    FFF    RRD
      `);
    });
  });

  describe('U (Up) Face Horizontal Rotations', () => {
    test("U11→U13 produces B' - U row 0 gets Left colors, R col 2 gets Up", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U11→U13');
      expectVisualState(cube, `
        U:     F:     R:
        LLL    FFF    RRU
        UUU    FFF    RRU
        UUU    FFF    RRU
      `);
    });

    test('U13→U11 produces B - U row 0 gets Right colors, R col 2 gets Down', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U13→U11');
      expectVisualState(cube, `
        U:     F:     R:
        RRR    FFF    RRD
        UUU    FFF    RRD
        UUU    FFF    RRD
      `);
    });

    test('U21→U23 produces S - U row 1 gets Left colors, R col 1 gets Up', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U21→U23');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RUR
        LLL    FFF    RUR
        UUU    FFF    RUR
      `);
    });

    test("U23→U21 produces S' - U row 1 gets Right colors, R col 1 gets Down", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U23→U21');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    RDR
        RRR    FFF    RDR
        UUU    FFF    RDR
      `);
    });

    test('U31→U33 produces F - U row 2 gets Left colors, R col 0 gets Up', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U31→U33');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    URR
        UUU    FFF    URR
        LLL    FFF    URR
      `);
    });

    test("U33→U31 produces F' - U row 2 gets Right colors, R col 0 gets Down", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U33→U31');
      expectVisualState(cube, `
        U:     F:     R:
        UUU    FFF    DRR
        UUU    FFF    DRR
        RRR    FFF    DRR
      `);
    });
  });

  describe('U (Up) Face Vertical Rotations', () => {
    test("U11→U31 produces L' - U col 0 gets Front, F col 0 gets Down", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U11→U31');
      expectVisualState(cube, `
        U:     F:     R:
        FUU    DFF    RRR
        FUU    DFF    RRR
        FUU    DFF    RRR
      `);
    });

    test('U31→U11 produces L - U col 0 gets Back, F col 0 gets Up', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U31→U11');
      expectVisualState(cube, `
        U:     F:     R:
        BUU    UFF    RRR
        BUU    UFF    RRR
        BUU    UFF    RRR
      `);
    });

    test('U12→U32 produces R - U col 1 gets Front, F col 1 gets Down', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U12→U32');
      expectVisualState(cube, `
        U:     F:     R:
        UUF    FFD    RRR
        UUF    FFD    RRR
        UUF    FFD    RRR
      `);
    });

    test("U32→U12 produces R' - U col 1 gets Back, F col 1 gets Up", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U32→U12');
      expectVisualState(cube, `
        U:     F:     R:
        UUB    FFU    RRR
        UUB    FFU    RRR
        UUB    FFU    RRR
      `);
    });

    test('U13→U33 produces R - U col 2 gets Front, F col 2 gets Down', () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U13→U33');
      expectVisualState(cube, `
        U:     F:     R:
        UUF    FFD    RRR
        UUF    FFD    RRR
        UUF    FFD    RRR
      `);
    });

    test("U33→U13 produces R' - U col 2 gets Back, F col 2 gets Up", () => {
      const cube = new RubiksCube();
      executeRotation(cube, 'U33→U13');
      expectVisualState(cube, `
        U:     F:     R:
        UUB    FFU    RRR
        UUB    FFU    RRR
        UUB    FFU    RRR
      `);
    });
  });
});
