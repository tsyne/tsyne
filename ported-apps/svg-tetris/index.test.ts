import { TetrisEngine, ROWS, COLS, SHAPE_DESCRIPTORS } from './tetris-engine';

describe('TetrisEngine', () => {
  let engine: TetrisEngine;

  beforeEach(() => {
    engine = new TetrisEngine();
  });

  // ── Initial State ──────────────────────────────────────────

  test('starts in ready state', () => {
    expect(engine.gameState).toBe('ready');
    expect(engine.score).toBe(0);
    expect(engine.lines).toBe(0);
  });

  test('board is 20 rows × 10 cols of null', () => {
    const board = engine.getBoard();
    expect(board.length).toBe(ROWS);
    for (const row of board) {
      expect(row.length).toBe(COLS);
      expect(row.every(c => c === null)).toBe(true);
    }
  });

  // ── Game Start ─────────────────────────────────────────────

  test('startGame sets running state with pieces', () => {
    engine.startGame();
    expect(engine.gameState).toBe('running');
    expect(engine.getCurrentPiece()).not.toBeNull();
    expect(engine.getNextPiece()).not.toBeNull();
    expect(engine.score).toBe(0);
    expect(engine.lines).toBe(0);
  });

  test('startGame resets a previous game', () => {
    engine.startGame();
    // Place some stuff
    engine._setCell(0, 19, '#ff0000');
    engine.startGame();
    const board = engine.getBoard();
    expect(board[19][0]).toBeNull();
  });

  // ── Piece Cells ────────────────────────────────────────────

  test('getPieceCells returns absolute coordinates', () => {
    const piece = { shapeIndex: 0, orientation: 0, x: 3, y: 0 };
    const cells = engine.getPieceCells(piece);
    // O-piece at (3,0): [[0,0],[1,0],[0,1],[1,1]] → [[3,0],[4,0],[3,1],[4,1]]
    expect(cells).toContainEqual([3, 0]);
    expect(cells).toContainEqual([4, 0]);
    expect(cells).toContainEqual([3, 1]);
    expect(cells).toContainEqual([4, 1]);
    expect(cells.length).toBe(4);
  });

  // ── Collision Detection ────────────────────────────────────

  test('canPlace returns true for empty board', () => {
    const piece = { shapeIndex: 0, orientation: 0, x: 3, y: 0 };
    expect(engine.canPlace(piece)).toBe(true);
  });

  test('canPlace returns false for out of bounds left', () => {
    const piece = { shapeIndex: 0, orientation: 0, x: -1, y: 0 };
    expect(engine.canPlace(piece)).toBe(false);
  });

  test('canPlace returns false for out of bounds right', () => {
    const piece = { shapeIndex: 0, orientation: 0, x: COLS, y: 0 };
    expect(engine.canPlace(piece)).toBe(false);
  });

  test('canPlace returns false for out of bounds bottom', () => {
    const piece = { shapeIndex: 0, orientation: 0, x: 3, y: ROWS };
    expect(engine.canPlace(piece)).toBe(false);
  });

  test('canPlace returns false for occupied cell', () => {
    engine._setCell(3, 0, '#ff0000');
    engine._setGameState('running');
    const piece = { shapeIndex: 0, orientation: 0, x: 3, y: 0 };
    expect(engine.canPlace(piece)).toBe(false);
  });

  // ── Movement ───────────────────────────────────────────────

  test('move left works on empty board', () => {
    engine.startGame();
    const before = engine.getCurrentPiece()!;
    const oldX = before.x;
    const result = engine.move(-1, 0);
    expect(result).toBe(true);
    expect(engine.getCurrentPiece()!.x).toBe(oldX - 1);
  });

  test('move right works on empty board', () => {
    engine.startGame();
    const oldX = engine.getCurrentPiece()!.x;
    engine.move(1, 0);
    expect(engine.getCurrentPiece()!.x).toBe(oldX + 1);
  });

  test('move fails when blocked', () => {
    engine.startGame();
    // Move all the way left until blocked
    let moved = true;
    while (moved) {
      moved = engine.move(-1, 0);
    }
    // One more move should still fail
    expect(engine.move(-1, 0)).toBe(false);
  });

  test('move does nothing when not running', () => {
    expect(engine.move(1, 0)).toBe(false);
  });

  // ── Rotation ───────────────────────────────────────────────

  test('rotate changes orientation', () => {
    engine.startGame();
    // Force a T-piece (shapeIndex 6, has 4 orientations)
    engine._setCurrentPiece({ shapeIndex: 6, orientation: 0, x: 4, y: 2 });
    const before = engine.getCurrentPiece()!.orientation;
    engine.rotate();
    const after = engine.getCurrentPiece()!.orientation;
    expect(after).toBe((before + 1) % SHAPE_DESCRIPTORS[6].orientations.length);
  });

  test('rotate wraps around orientations', () => {
    engine.startGame();
    // O-piece has only 1 orientation — rotation doesn't change it (still valid)
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 4, y: 2 });
    engine.rotate();
    expect(engine.getCurrentPiece()!.orientation).toBe(0);
  });

  test('rotate fails when blocked', () => {
    engine.startGame();
    // I-piece horizontal near right wall
    engine._setCurrentPiece({ shapeIndex: 3, orientation: 0, x: 8, y: 5 });
    // Rotating to vertical would put cells at x=8, y=5..8 which is fine,
    // but the horizontal piece is [0,0],[1,0],[2,0],[3,0] at x=8 → cols 8,9,10,11 — out of bounds!
    // Actually canPlace will fail for x=8 horizontal too.
    // Let's use x=7 for horizontal (cols 7,8,9,10 → col 10 is out of bounds)
    // Actually cols are 0-9, so x=7 means cols 7,8,9,10 which is OOB.
    // x=6 → cols 6,7,8,9 — OK. Rotate to vertical: col 6, rows 5,6,7,8 — OK.
    // Let's test rotation near a wall:
    engine._setCurrentPiece({ shapeIndex: 3, orientation: 1, x: 0, y: 0 });
    // Vertical I at x=0: [[0,0],[0,1],[0,2],[0,3]] — ok
    // Rotate to horizontal: [[0,0],[1,0],[2,0],[3,0]] at x=0 — all in bounds
    // So let's block with occupied cells instead
    engine._setCell(1, 0, '#ff0000');
    engine._setCell(2, 0, '#ff0000');
    // Vertical I at x=0 fits, but horizontal would need col 1 row 0 which is occupied
    expect(engine.rotate()).toBe(false);
  });

  // ── Tick / Gravity ─────────────────────────────────────────

  test('tick moves piece down by 1', () => {
    engine.startGame();
    const oldY = engine.getCurrentPiece()!.y;
    engine.tick();
    expect(engine.getCurrentPiece()!.y).toBe(oldY + 1);
  });

  test('tick at bottom locks piece and spawns next', () => {
    engine.startGame();
    // Place O-piece at bottom
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 0, y: ROWS - 2 });
    const oldPiece = engine.getCurrentPiece()!;
    engine.tick(); // can't move down → lock
    // Board should now have the locked piece
    const board = engine.getBoard();
    expect(board[ROWS - 2][0]).not.toBeNull();
    expect(board[ROWS - 2][1]).not.toBeNull();
    expect(board[ROWS - 1][0]).not.toBeNull();
    expect(board[ROWS - 1][1]).not.toBeNull();
    // Score should increment
    expect(engine.score).toBe(1);
  });

  // ── Drop ───────────────────────────────────────────────────

  test('drop sends piece to bottom and locks it', () => {
    engine.startGame();
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 0, y: 0 });
    engine.drop();
    // Drop moves piece to bottom then locks immediately.
    // O-piece at y=0 drops to y=18 (ROWS-2) then locks → score increments, next piece spawns.
    expect(engine.score).toBe(1);
    // Board should have locked cells at bottom
    const board = engine.getBoard();
    expect(board[ROWS - 2][0]).not.toBeNull();
    expect(board[ROWS - 1][0]).not.toBeNull();
  });

  // ── Line Clearing ──────────────────────────────────────────

  test('full row is cleared', () => {
    engine.startGame();
    // Fill bottom row
    for (let c = 0; c < COLS; c++) {
      engine._setCell(c, ROWS - 1, '#ff0000');
    }
    // Place an O-piece above and let it lock
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 0, y: ROWS - 3 });
    engine.tick(); // moves to y = ROWS - 2, no lock
    // After this tick, piece is now at y = ROWS - 3 + 1 = ROWS - 2
    // The O-piece bottom edge is at y+1 = ROWS - 1, which is occupied
    // So it can't move down and should lock
    // Wait — at y = ROWS - 3, moving to y = ROWS - 2: the O-piece covers rows ROWS-2 and ROWS-1
    // Row ROWS-1 has cells filled, so canPlace will fail. Piece locks at y = ROWS - 3.
    // Actually: move to y = ROWS-3+1 = ROWS-2. O-piece cells: [0,ROWS-2],[1,ROWS-2],[0,ROWS-1],[1,ROWS-1]
    // Row ROWS-1 cols 0,1 are occupied → can't place → lock at y = ROWS-3
    const board = engine.getBoard();
    // The locked piece at y=ROWS-3 covers [0,ROWS-3],[1,ROWS-3],[0,ROWS-2],[1,ROWS-2]
    // The full row at ROWS-1 should be cleared and shifted down
    // After clearing: row ROWS-1 was full → eliminated → rows above shift down
    // Row ROWS-2 (originally [0,1]=O-piece) moves to ROWS-1
    // Row ROWS-3 (originally [0,1]=O-piece) moves to ROWS-2
    expect(engine.lines).toBe(1);
  });

  test('line clear increases speed', () => {
    engine.startGame();
    const initialTick = engine.tickTime;
    // Fill and clear a row
    for (let c = 0; c < COLS; c++) {
      engine._setCell(c, ROWS - 1, '#ff0000');
    }
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 4, y: ROWS - 3 });
    engine.tick(); // lock + clear
    expect(engine.tickTime).toBeLessThan(initialTick);
  });

  // ── Game Over ──────────────────────────────────────────────

  test('game over when new piece cant be placed', () => {
    engine.startGame();
    let gameOverCalled = false;
    engine.onGameOver = () => { gameOverCalled = true; };
    // Fill rows 0-3 (top area) to block any new piece at y=0.
    // Don't fill any row completely to avoid line clears freeing space.
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        engine._setCell(c, r, '#ff0000');
      }
    }
    // Place O-piece at the very bottom where it can't go further
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 0, y: ROWS - 2 });
    // tick: tries y=ROWS-1, O covers [0,ROWS-1],[1,ROWS-1],[0,ROWS],[1,ROWS] — ROWS is OOB → can't
    // Locks at y=ROWS-2, then runNextShape at x=3,y=0 — row 0 col 3 is occupied → game over
    engine.tick();
    expect(engine.gameState).toBe('finished');
    expect(gameOverCalled).toBe(true);
  });

  // ── Pause ──────────────────────────────────────────────────

  test('toggle pause', () => {
    engine.startGame();
    expect(engine.gameState).toBe('running');
    engine.togglePause();
    expect(engine.gameState).toBe('paused');
    engine.togglePause();
    expect(engine.gameState).toBe('running');
  });

  test('tick does nothing when paused', () => {
    engine.startGame();
    engine.togglePause();
    const piece = engine.getCurrentPiece()!;
    const oldY = piece.y;
    engine.tick();
    expect(engine.getCurrentPiece()!.y).toBe(oldY);
  });

  // ── Ghost Piece ────────────────────────────────────────────

  test('ghost row is below current piece', () => {
    engine.startGame();
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 3, y: 0 });
    const ghostRow = engine.getGhostRow();
    expect(ghostRow).not.toBeNull();
    expect(ghostRow!).toBe(ROWS - 2); // O-piece 2 tall, empty board
  });

  test('ghost cells are at ghost position', () => {
    engine.startGame();
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 3, y: 0 });
    const cells = engine.getGhostCells();
    expect(cells).not.toBeNull();
    // Ghost O-piece at (3, 18): [3,18],[4,18],[3,19],[4,19]
    expect(cells).toContainEqual([3, ROWS - 2]);
    expect(cells).toContainEqual([4, ROWS - 2]);
    expect(cells).toContainEqual([3, ROWS - 1]);
    expect(cells).toContainEqual([4, ROWS - 1]);
  });

  test('ghost is null when piece is already at bottom', () => {
    engine.startGame();
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 3, y: ROWS - 2 });
    expect(engine.getGhostRow()).toBeNull();
  });

  // ── Cell Color ─────────────────────────────────────────────

  test('getCellColor returns null for empty cell', () => {
    engine.startGame();
    expect(engine.getCellColor(5, 10)).toBeNull();
  });

  test('getCellColor returns locked cell color', () => {
    engine._setCell(5, 10, '#ff0000');
    expect(engine.getCellColor(5, 10)).toBe('#ff0000');
  });

  test('getCellColor returns piece color for current piece cells', () => {
    engine.startGame();
    engine._setCurrentPiece({ shapeIndex: 0, orientation: 0, x: 3, y: 0 });
    // O-piece at (3,0) is grey (#808080)
    expect(engine.getCellColor(3, 0)).toBe(SHAPE_DESCRIPTORS[0].color);
  });

  // ── Shape Descriptors ──────────────────────────────────────

  test('all 7 shapes defined', () => {
    expect(SHAPE_DESCRIPTORS.length).toBe(7);
  });

  test('each shape has at least 1 orientation', () => {
    for (const desc of SHAPE_DESCRIPTORS) {
      expect(desc.orientations.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('each orientation has exactly 4 cells', () => {
    for (const desc of SHAPE_DESCRIPTORS) {
      for (const orient of desc.orientations) {
        expect(orient.length).toBe(4);
      }
    }
  });

  // ── Callbacks ──────────────────────────────────────────────

  test('onUpdate fires on state changes', () => {
    let updateCount = 0;
    engine.onUpdate = () => { updateCount++; };
    engine.startGame();
    expect(updateCount).toBe(1);
    engine.move(1, 0);
    expect(updateCount).toBe(2);
  });
});
