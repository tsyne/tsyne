/**
 * 3D Rubik's Cube - Core Logic
 *
 * Pure TypeScript cube state machine and gesture controller.
 * No UI dependencies - fully testable with Jest.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════

export enum Side { Up, Front, Right, Back, Left, Down }

export type SwipeDir = 'N' | 'S' | 'E' | 'W';

export interface CellId { face: Side; row: number; col: number }

export const COLORS: Record<Side, string> = {
  [Side.Up]: '#ffffff',    // White
  [Side.Front]: '#009b48', // Green
  [Side.Right]: '#b71234', // Red
  [Side.Back]: '#0046ad',  // Blue
  [Side.Left]: '#ff5800',  // Orange
  [Side.Down]: '#ffd500',  // Yellow
};

// Isometric projection constants
export const ISO = Math.PI / 6;  // 30 degrees
export const COS = Math.cos(ISO);
export const SIN = Math.sin(ISO);

export interface Point { x: number; y: number }

// ═══════════════════════════════════════════════════════════════════════════
// RubiksCube - State Machine
// ═══════════════════════════════════════════════════════════════════════════

export class RubiksCube {
  private faces: Record<Side, Side[][]> = {} as Record<Side, Side[][]>;
  private history: Array<{ side: Side; cw: boolean }> = [];
  private listeners: Array<() => void> = [];

  constructor() { this.reset(); }

  subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify(): void { this.listeners.forEach(fn => fn()); }

  reset(): void {
    for (let s = 0; s <= 5; s++) {
      this.faces[s as Side] = [[s, s, s], [s, s, s], [s, s, s]] as Side[][];
    }
    this.history = [];
    this.notify();
  }

  getColor(side: Side, row: number, col: number): Side {
    return this.faces[side][row][col];
  }

  isSolved(): boolean {
    for (let s = 0; s <= 5; s++) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (this.faces[s as Side][r][c] !== s) return false;
        }
      }
    }
    return true;
  }

  getMoveCount(): number { return this.history.length; }

  shuffle(moves = 20): void {
    this.history = [];
    for (let i = 0; i < moves; i++) {
      const side = Math.floor(Math.random() * 6) as Side;
      const cw = Math.random() > 0.5;
      this.rotateSide(side, cw);
    }
  }

  solve(): void {
    const rev = [...this.history].reverse();
    this.history = [];
    for (const m of rev) {
      this.rotateSide(m.side, !m.cw);
    }
  }

  rotateSide(side: Side, cw: boolean): void {
    this.rotateFace(side, cw);
    this.rotateEdges(side, cw);
    this.history.push({ side, cw });
    this.notify();
  }

  rotateESlice(cw: boolean): void { this.rotateMiddleRow(cw); this.notify(); }
  rotateMSlice(cw: boolean): void { this.rotateMiddleCol(cw); this.notify(); }
  rotateSSlice(cw: boolean): void { this.rotateMiddleStanding(cw); this.notify(); }

  private rotateFace(side: Side, cw: boolean): void {
    const f = this.faces[side];
    const n: Side[][] = [[], [], []];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        n[cw ? c : 2 - c][cw ? 2 - r : r] = f[r][c];
      }
    }
    this.faces[side] = n;
  }

  private rotateEdges(side: Side, cw: boolean): void {
    switch (side) {
      case Side.Up: this.rotateUpEdges(cw); break;
      case Side.Down: this.rotateDownEdges(cw); break;
      case Side.Front: this.rotateFrontEdges(cw); break;
      case Side.Back: this.rotateBackEdges(cw); break;
      case Side.Right: this.rotateRightEdges(cw); break;
      case Side.Left: this.rotateLeftEdges(cw); break;
    }
  }

  private rotateUpEdges(cw: boolean): void {
    const { Front: F, Back: B, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[F][0][0], f[F][0][1], f[F][0][2]];
    if (cw) {
      [f[F][0][0], f[F][0][1], f[F][0][2]] = [f[R][0][0], f[R][0][1], f[R][0][2]];
      [f[R][0][0], f[R][0][1], f[R][0][2]] = [f[B][0][0], f[B][0][1], f[B][0][2]];
      [f[B][0][0], f[B][0][1], f[B][0][2]] = [f[L][0][0], f[L][0][1], f[L][0][2]];
      [f[L][0][0], f[L][0][1], f[L][0][2]] = tmp;
    } else {
      [f[F][0][0], f[F][0][1], f[F][0][2]] = [f[L][0][0], f[L][0][1], f[L][0][2]];
      [f[L][0][0], f[L][0][1], f[L][0][2]] = [f[B][0][0], f[B][0][1], f[B][0][2]];
      [f[B][0][0], f[B][0][1], f[B][0][2]] = [f[R][0][0], f[R][0][1], f[R][0][2]];
      [f[R][0][0], f[R][0][1], f[R][0][2]] = tmp;
    }
  }

  private rotateDownEdges(cw: boolean): void {
    const { Front: F, Back: B, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[F][2][0], f[F][2][1], f[F][2][2]];
    if (cw) {
      [f[F][2][0], f[F][2][1], f[F][2][2]] = [f[L][2][0], f[L][2][1], f[L][2][2]];
      [f[L][2][0], f[L][2][1], f[L][2][2]] = [f[B][2][0], f[B][2][1], f[B][2][2]];
      [f[B][2][0], f[B][2][1], f[B][2][2]] = [f[R][2][0], f[R][2][1], f[R][2][2]];
      [f[R][2][0], f[R][2][1], f[R][2][2]] = tmp;
    } else {
      [f[F][2][0], f[F][2][1], f[F][2][2]] = [f[R][2][0], f[R][2][1], f[R][2][2]];
      [f[R][2][0], f[R][2][1], f[R][2][2]] = [f[B][2][0], f[B][2][1], f[B][2][2]];
      [f[B][2][0], f[B][2][1], f[B][2][2]] = [f[L][2][0], f[L][2][1], f[L][2][2]];
      [f[L][2][0], f[L][2][1], f[L][2][2]] = tmp;
    }
  }

  private rotateFrontEdges(cw: boolean): void {
    const { Up: U, Down: D, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[U][2][0], f[U][2][1], f[U][2][2]];
    if (cw) {
      [f[U][2][0], f[U][2][1], f[U][2][2]] = [f[L][2][2], f[L][1][2], f[L][0][2]];
      [f[L][0][2], f[L][1][2], f[L][2][2]] = [f[D][0][0], f[D][0][1], f[D][0][2]];
      [f[D][0][0], f[D][0][1], f[D][0][2]] = [f[R][2][0], f[R][1][0], f[R][0][0]];
      [f[R][0][0], f[R][1][0], f[R][2][0]] = tmp;
    } else {
      [f[U][2][0], f[U][2][1], f[U][2][2]] = [f[R][0][0], f[R][1][0], f[R][2][0]];
      [f[R][0][0], f[R][1][0], f[R][2][0]] = [f[D][0][2], f[D][0][1], f[D][0][0]];
      [f[D][0][0], f[D][0][1], f[D][0][2]] = [f[L][0][2], f[L][1][2], f[L][2][2]];
      [f[L][0][2], f[L][1][2], f[L][2][2]] = [tmp[2], tmp[1], tmp[0]];
    }
  }

  private rotateBackEdges(cw: boolean): void {
    const { Up: U, Down: D, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[U][0][0], f[U][0][1], f[U][0][2]];
    if (cw) {
      [f[U][0][0], f[U][0][1], f[U][0][2]] = [f[R][0][2], f[R][1][2], f[R][2][2]];
      [f[R][0][2], f[R][1][2], f[R][2][2]] = [f[D][2][2], f[D][2][1], f[D][2][0]];
      [f[D][2][0], f[D][2][1], f[D][2][2]] = [f[L][0][0], f[L][1][0], f[L][2][0]];
      [f[L][0][0], f[L][1][0], f[L][2][0]] = [tmp[2], tmp[1], tmp[0]];
    } else {
      [f[U][0][0], f[U][0][1], f[U][0][2]] = [f[L][2][0], f[L][1][0], f[L][0][0]];
      [f[L][0][0], f[L][1][0], f[L][2][0]] = [f[D][2][0], f[D][2][1], f[D][2][2]];
      [f[D][2][0], f[D][2][1], f[D][2][2]] = [f[R][2][2], f[R][1][2], f[R][0][2]];
      [f[R][0][2], f[R][1][2], f[R][2][2]] = tmp;
    }
  }

  private rotateRightEdges(cw: boolean): void {
    const { Up: U, Down: D, Front: F, Back: B } = Side;
    const f = this.faces;
    const tmp = [f[U][0][2], f[U][1][2], f[U][2][2]];
    if (cw) {
      [f[U][0][2], f[U][1][2], f[U][2][2]] = [f[F][0][2], f[F][1][2], f[F][2][2]];
      [f[F][0][2], f[F][1][2], f[F][2][2]] = [f[D][0][2], f[D][1][2], f[D][2][2]];
      [f[D][0][2], f[D][1][2], f[D][2][2]] = [f[B][2][0], f[B][1][0], f[B][0][0]];
      [f[B][0][0], f[B][1][0], f[B][2][0]] = [tmp[2], tmp[1], tmp[0]];
    } else {
      [f[U][0][2], f[U][1][2], f[U][2][2]] = [f[B][2][0], f[B][1][0], f[B][0][0]];
      [f[B][0][0], f[B][1][0], f[B][2][0]] = [f[D][2][2], f[D][1][2], f[D][0][2]];
      [f[D][0][2], f[D][1][2], f[D][2][2]] = [f[F][0][2], f[F][1][2], f[F][2][2]];
      [f[F][0][2], f[F][1][2], f[F][2][2]] = tmp;
    }
  }

  private rotateLeftEdges(cw: boolean): void {
    const { Up: U, Down: D, Front: F, Back: B } = Side;
    const f = this.faces;
    const tmp = [f[U][0][0], f[U][1][0], f[U][2][0]];
    if (cw) {
      [f[U][0][0], f[U][1][0], f[U][2][0]] = [f[B][2][2], f[B][1][2], f[B][0][2]];
      [f[B][0][2], f[B][1][2], f[B][2][2]] = [f[D][2][0], f[D][1][0], f[D][0][0]];
      [f[D][0][0], f[D][1][0], f[D][2][0]] = [f[F][0][0], f[F][1][0], f[F][2][0]];
      [f[F][0][0], f[F][1][0], f[F][2][0]] = tmp;
    } else {
      [f[U][0][0], f[U][1][0], f[U][2][0]] = [f[F][0][0], f[F][1][0], f[F][2][0]];
      [f[F][0][0], f[F][1][0], f[F][2][0]] = [f[D][0][0], f[D][1][0], f[D][2][0]];
      [f[D][0][0], f[D][1][0], f[D][2][0]] = [f[B][2][2], f[B][1][2], f[B][0][2]];
      [f[B][0][2], f[B][1][2], f[B][2][2]] = [tmp[2], tmp[1], tmp[0]];
    }
  }

  private rotateMiddleRow(cw: boolean): void {
    const { Front: F, Back: B, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[F][1][0], f[F][1][1], f[F][1][2]];
    if (cw) {
      [f[F][1][0], f[F][1][1], f[F][1][2]] = [f[L][1][0], f[L][1][1], f[L][1][2]];
      [f[L][1][0], f[L][1][1], f[L][1][2]] = [f[B][1][0], f[B][1][1], f[B][1][2]];
      [f[B][1][0], f[B][1][1], f[B][1][2]] = [f[R][1][0], f[R][1][1], f[R][1][2]];
      [f[R][1][0], f[R][1][1], f[R][1][2]] = tmp;
    } else {
      [f[F][1][0], f[F][1][1], f[F][1][2]] = [f[R][1][0], f[R][1][1], f[R][1][2]];
      [f[R][1][0], f[R][1][1], f[R][1][2]] = [f[B][1][0], f[B][1][1], f[B][1][2]];
      [f[B][1][0], f[B][1][1], f[B][1][2]] = [f[L][1][0], f[L][1][1], f[L][1][2]];
      [f[L][1][0], f[L][1][1], f[L][1][2]] = tmp;
    }
  }

  private rotateMiddleCol(cw: boolean): void {
    const { Up: U, Down: D, Front: F, Back: B } = Side;
    const f = this.faces;
    const tmp = [f[F][0][1], f[F][1][1], f[F][2][1]];
    if (cw) {
      [f[F][0][1], f[F][1][1], f[F][2][1]] = [f[D][0][1], f[D][1][1], f[D][2][1]];
      [f[D][0][1], f[D][1][1], f[D][2][1]] = [f[B][2][1], f[B][1][1], f[B][0][1]];
      [f[B][0][1], f[B][1][1], f[B][2][1]] = [f[U][2][1], f[U][1][1], f[U][0][1]];
      [f[U][0][1], f[U][1][1], f[U][2][1]] = tmp;
    } else {
      [f[F][0][1], f[F][1][1], f[F][2][1]] = [f[U][0][1], f[U][1][1], f[U][2][1]];
      [f[U][0][1], f[U][1][1], f[U][2][1]] = [f[B][2][1], f[B][1][1], f[B][0][1]];
      [f[B][0][1], f[B][1][1], f[B][2][1]] = [f[D][2][1], f[D][1][1], f[D][0][1]];
      [f[D][0][1], f[D][1][1], f[D][2][1]] = tmp;
    }
  }

  private rotateMiddleStanding(cw: boolean): void {
    const { Up: U, Down: D, Left: L, Right: R } = Side;
    const f = this.faces;
    const tmp = [f[U][1][0], f[U][1][1], f[U][1][2]];
    if (cw) {
      [f[U][1][0], f[U][1][1], f[U][1][2]] = [f[L][2][1], f[L][1][1], f[L][0][1]];
      [f[L][0][1], f[L][1][1], f[L][2][1]] = [f[D][1][0], f[D][1][1], f[D][1][2]];
      [f[D][1][0], f[D][1][1], f[D][1][2]] = [f[R][2][1], f[R][1][1], f[R][0][1]];
      [f[R][0][1], f[R][1][1], f[R][2][1]] = tmp;
    } else {
      [f[U][1][0], f[U][1][1], f[U][1][2]] = [f[R][0][1], f[R][1][1], f[R][2][1]];
      [f[R][0][1], f[R][1][1], f[R][2][1]] = [f[D][1][2], f[D][1][1], f[D][1][0]];
      [f[D][1][0], f[D][1][1], f[D][1][2]] = [f[L][0][1], f[L][1][1], f[L][2][1]];
      [f[L][0][1], f[L][1][1], f[L][2][1]] = [tmp[2], tmp[1], tmp[0]];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GestureController - Intuitive Swipe→Rotation Mapping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps swipe gestures on cube cells to cube rotations.
 *
 * Intuition: Swipe in the direction you want that row/column to move.
 * - Swipe right on Front face → row moves right → rotates towards Right face
 * - Swipe down on Front face → column moves down → rotates towards Down face
 */
export class GestureController {
  constructor(private cube: RubiksCube) {}

  handleSwipe(cell: CellId, dir: SwipeDir): void {
    const { face, row, col } = cell;

    switch (face) {
      case Side.Front: this.handleFrontSwipe(row, col, dir); break;
      case Side.Up: this.handleUpSwipe(row, col, dir); break;
      case Side.Right: this.handleRightSwipe(row, col, dir); break;
    }
  }

  private handleFrontSwipe(row: number, col: number, dir: SwipeDir): void {
    if (dir === 'E' || dir === 'W') {
      // Horizontal swipes rotate rows
      // Swipe W (left) → pieces move left → Up CW / Down CCW / E CCW
      const cw = dir === 'W';
      if (row === 0) this.cube.rotateSide(Side.Up, cw);
      else if (row === 2) this.cube.rotateSide(Side.Down, !cw);
      else this.cube.rotateESlice(!cw);  // E slice CCW for W swipe (pieces go left)
    } else {
      // Vertical swipes rotate columns
      // Swipe S (down) → pieces move down → Left CW / Right CCW / M CCW
      const cw = dir === 'S';
      if (col === 0) this.cube.rotateSide(Side.Left, cw);
      else if (col === 2) this.cube.rotateSide(Side.Right, !cw);
      else this.cube.rotateMSlice(!cw);
    }
  }

  private handleUpSwipe(row: number, col: number, dir: SwipeDir): void {
    if (dir === 'E' || dir === 'W') {
      // Horizontal swipes on Up face (E/W moves pieces toward Right/Left)
      // Swipe E → pieces move right → Front CW (row 2) / Back CCW (row 0)
      const cw = dir === 'E';
      if (row === 0) this.cube.rotateSide(Side.Back, !cw);
      else if (row === 2) this.cube.rotateSide(Side.Front, cw);
      else this.cube.rotateSSlice(cw);
    } else {
      // Vertical swipes on Up face (S/N moves pieces toward Front/Back)
      // Swipe S → pieces move forward → Left CW (col 0) / Right CCW (col 2)
      const cw = dir === 'S';
      if (col === 0) this.cube.rotateSide(Side.Left, cw);
      else if (col === 2) this.cube.rotateSide(Side.Right, !cw);
      else this.cube.rotateMSlice(!cw);
    }
  }

  private handleRightSwipe(row: number, col: number, dir: SwipeDir): void {
    if (dir === 'E' || dir === 'W') {
      // Horizontal swipes on Right face (W→Front, E→Back in isometric view)
      // Swipe W → pieces move toward Front → Up CW (row 0) / Down CCW (row 2) / E CCW (row 1)
      const cw = dir === 'W';
      if (row === 0) this.cube.rotateSide(Side.Up, cw);
      else if (row === 2) this.cube.rotateSide(Side.Down, !cw);
      else this.cube.rotateESlice(!cw);  // E slice CCW for W swipe (Right→Front)
    } else {
      // Vertical swipes on Right face (S→Down, N→Up)
      // Swipe S → pieces move down → Front CW (col 0) / Back CCW (col 2) / S CW (col 1)
      const cw = dir === 'S';
      if (col === 0) this.cube.rotateSide(Side.Front, cw);
      else if (col === 2) this.cube.rotateSide(Side.Back, !cw);
      else this.cube.rotateSSlice(cw);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

export function project(x: number, y: number, z: number, cx: number, cy: number): Point {
  return {
    x: cx + (x - z) * COS,
    y: cy - y + (x + z) * SIN,
  };
}

export function computeSwipeDirection(dx: number, dy: number): SwipeDir | null {
  const MIN_DISTANCE = 20;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < MIN_DISTANCE) return null;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'E' : 'W';
  } else {
    return dy > 0 ? 'S' : 'N';
  }
}
