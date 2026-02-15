/**
 * Tetris Engine — Pure game logic, no UI dependencies
 *
 * Ported from SVGtetris.svg by alex fritze (public domain).
 * 10×20 grid, 7 tetrominoes with all rotation states, line clearing, scoring.
 */

// ─── Shape Descriptors (from SVG source) ─────────────────────

export interface ShapeDescriptor {
  color: string;
  orientations: [number, number][][];
}

export const SHAPE_DESCRIPTORS: ShapeDescriptor[] = [
  { color: '#808080', orientations: [ [[0,0],[1,0],[0,1],[1,1]] ] },                                             // O - grey
  { color: '#4444ff', orientations: [ [[0,0],[1,0],[2,0],[2,1]], [[1,0],[1,1],[1,2],[0,2]],                       // J - blue
                                      [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[0,1],[0,2]] ] },
  { color: '#aa44ff', orientations: [ [[0,0],[0,1],[1,0],[2,0]], [[0,0],[1,0],[1,1],[1,2]],                       // L - purple
                                      [[0,1],[1,1],[2,1],[2,0]], [[0,0],[0,1],[0,2],[1,2]] ] },
  { color: '#00cccc', orientations: [ [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]] ] },                   // I - cyan
  { color: '#00cc00', orientations: [ [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]] ] },                   // S - green
  { color: '#cc0000', orientations: [ [[1,0],[1,1],[0,1],[0,2]], [[0,0],[1,0],[1,1],[2,1]] ] },                   // Z - red
  { color: '#cccc00', orientations: [ [[0,1],[1,1],[2,1],[1,0]], [[0,0],[0,1],[0,2],[1,1]],                       // T - yellow
                                      [[0,0],[1,0],[2,0],[1,1]], [[1,0],[1,1],[1,2],[0,1]] ] },
];

export const ROWS = 20;
export const COLS = 10;
const TICK_TIME_REDUCER = 0.98;
const INITIAL_TICK_TIME = 300;

// ─── Piece ───────────────────────────────────────────────────

export interface Piece {
  shapeIndex: number;
  orientation: number;
  x: number;  // col offset
  y: number;  // row offset
}

export type GameState = 'ready' | 'running' | 'paused' | 'finished';

// ─── Engine ──────────────────────────────────────────────────

export class TetrisEngine {
  /** Board grid: board[row][col] = color string or null */
  private board: (string | null)[][];
  private occupied: boolean[][];
  private currentPiece: Piece | null = null;
  private nextPiece: Piece | null = null;
  private _score = 0;
  private _lines = 0;
  private _gameState: GameState = 'ready';
  private _tickTime = INITIAL_TICK_TIME;

  onUpdate?: () => void;
  onGameOver?: () => void;

  constructor() {
    this.board = [];
    this.occupied = [];
    this.initBoard();
  }

  private initBoard(): void {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.occupied = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  }

  // ── Accessors ──────────────────────────────────────────────

  get score(): number { return this._score; }
  get lines(): number { return this._lines; }
  get gameState(): GameState { return this._gameState; }
  get tickTime(): number { return this._tickTime; }

  getBoard(): (string | null)[][] { return this.board; }
  getCurrentPiece(): Piece | null { return this.currentPiece; }
  getNextPiece(): Piece | null { return this.nextPiece; }

  /** Get the cells the current piece occupies in absolute [col, row] coords. */
  getPieceCells(piece: Piece): [number, number][] {
    const desc = SHAPE_DESCRIPTORS[piece.shapeIndex];
    const orient = desc.orientations[piece.orientation];
    return orient.map(([dx, dy]) => [dx + piece.x, dy + piece.y]);
  }

  /** Get the color for a piece. */
  getPieceColor(piece: Piece): string {
    return SHAPE_DESCRIPTORS[piece.shapeIndex].color;
  }

  /** Get the effective color of a board cell (piece + locked cells). */
  getCellColor(col: number, row: number): string | null {
    // Check current piece first
    if (this.currentPiece && this._gameState === 'running') {
      const cells = this.getPieceCells(this.currentPiece);
      for (const [cx, cy] of cells) {
        if (cx === col && cy === row) {
          return this.getPieceColor(this.currentPiece);
        }
      }
    }
    return this.board[row]?.[col] ?? null;
  }

  /** Get where the ghost piece would land. */
  getGhostRow(): number | null {
    if (!this.currentPiece || this._gameState !== 'running') return null;
    let ghostY = this.currentPiece.y;
    while (this.canPlace({ ...this.currentPiece, y: ghostY + 1 })) {
      ghostY++;
    }
    return ghostY === this.currentPiece.y ? null : ghostY;
  }

  /** Get ghost piece cells for rendering. */
  getGhostCells(): [number, number][] | null {
    const ghostY = this.getGhostRow();
    if (ghostY === null || !this.currentPiece) return null;
    return this.getPieceCells({ ...this.currentPiece, y: ghostY });
  }

  // ── Piece Creation ─────────────────────────────────────────

  private randomPiece(x: number, y: number): Piece {
    const shapeIndex = Math.floor(Math.random() * SHAPE_DESCRIPTORS.length);
    const desc = SHAPE_DESCRIPTORS[shapeIndex];
    const orientation = Math.floor(Math.random() * desc.orientations.length);
    return { shapeIndex, orientation, x, y };
  }

  // ── Collision Detection ────────────────────────────────────

  canPlace(piece: Piece): boolean {
    const cells = this.getPieceCells(piece);
    return cells.every(([cx, cy]) =>
      cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && !this.occupied[cy][cx]
    );
  }

  // ── Game Control ───────────────────────────────────────────

  startGame(): void {
    this.initBoard();
    this._score = 0;
    this._lines = 0;
    this._tickTime = INITIAL_TICK_TIME;
    this.currentPiece = this.randomPiece(3, 0);
    this.nextPiece = this.randomPiece(0, 0);
    this._gameState = 'running';
    this.onUpdate?.();
  }

  togglePause(): void {
    if (this._gameState === 'running') {
      this._gameState = 'paused';
    } else if (this._gameState === 'paused') {
      this._gameState = 'running';
    }
    this.onUpdate?.();
  }

  // ── Movement ───────────────────────────────────────────────

  move(dx: number, dy: number): boolean {
    if (!this.currentPiece || this._gameState !== 'running') return false;
    const moved: Piece = { ...this.currentPiece, x: this.currentPiece.x + dx, y: this.currentPiece.y + dy };
    if (this.canPlace(moved)) {
      this.currentPiece = moved;
      this.onUpdate?.();
      return true;
    }
    return false;
  }

  rotate(): boolean {
    if (!this.currentPiece || this._gameState !== 'running') return false;
    const desc = SHAPE_DESCRIPTORS[this.currentPiece.shapeIndex];
    const newOrientation = (this.currentPiece.orientation + 1) % desc.orientations.length;
    const rotated: Piece = { ...this.currentPiece, orientation: newOrientation };
    if (this.canPlace(rotated)) {
      this.currentPiece = rotated;
      this.onUpdate?.();
      return true;
    }
    return false;
  }

  drop(): void {
    if (!this.currentPiece || this._gameState !== 'running') return;
    while (this.move(0, 1)) { /* keep dropping */ }
    // Lock immediately — don't wait for next tick
    this.lockPiece();
  }

  // ── Tick (gravity) ─────────────────────────────────────────

  tick(): void {
    if (this._gameState !== 'running') return;
    if (!this.move(0, 1)) {
      this.lockPiece();
    }
  }

  // ── Lock & Line Clear ──────────────────────────────────────

  private lockPiece(): void {
    if (!this.currentPiece) return;
    const cells = this.getPieceCells(this.currentPiece);
    const color = this.getPieceColor(this.currentPiece);
    for (const [cx, cy] of cells) {
      if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
        this.board[cy][cx] = color;
        this.occupied[cy][cx] = true;
      }
    }
    this._score++;
    this.eliminateFullRows();
    this.runNextShape();
  }

  private eliminateFullRows(): void {
    let cleared = 0;
    for (let r = 0; r < ROWS; r++) {
      if (this.occupied[r].every(v => v)) {
        // Row is full — remove it and shift everything above down
        for (let rr = r; rr > 0; rr--) {
          for (let c = 0; c < COLS; c++) {
            this.board[rr][c] = this.board[rr - 1][c];
            this.occupied[rr][c] = this.occupied[rr - 1][c];
          }
        }
        // Clear top row
        for (let c = 0; c < COLS; c++) {
          this.board[0][c] = null;
          this.occupied[0][c] = false;
        }
        cleared++;
        this._lines++;
        this._tickTime *= TICK_TIME_REDUCER;
      }
    }
    return;
  }

  private runNextShape(): void {
    if (!this.nextPiece) return;
    this.currentPiece = { ...this.nextPiece, x: 3, y: 0 };
    this.nextPiece = this.randomPiece(0, 0);
    if (!this.canPlace(this.currentPiece)) {
      this._gameState = 'finished';
      this.onGameOver?.();
    }
    this.onUpdate?.();
  }

  // ── Test Helpers ───────────────────────────────────────────

  /** Set the current piece directly (for testing). */
  _setCurrentPiece(piece: Piece): void {
    this.currentPiece = piece;
  }

  /** Set a board cell directly (for testing). */
  _setCell(col: number, row: number, color: string): void {
    this.board[row][col] = color;
    this.occupied[row][col] = true;
  }

  /** Force game state (for testing). */
  _setGameState(state: GameState): void {
    this._gameState = state;
  }
}
