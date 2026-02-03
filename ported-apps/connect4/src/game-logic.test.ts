/**
 * Connect 4 Game Logic Tests
 */

import {
  createBoard,
  createGameState,
  findEmptyRow,
  canDropInColumn,
  dropPiece,
  checkWin,
  isBoardFull,
  makeMove,
  getPlayerColor,
  getPlayerName,
  COLS,
  ROWS,
  type Cell,
  type Player,
} from './game-logic';

describe('createBoard', () => {
  it('should create a 7x6 empty board', () => {
    const board = createBoard();
    expect(board.length).toBe(COLS);
    for (let col = 0; col < COLS; col++) {
      expect(board[col].length).toBe(ROWS);
      for (let row = 0; row < ROWS; row++) {
        expect(board[col][row]).toBeNull();
      }
    }
  });
});

describe('createGameState', () => {
  it('should create initial game state', () => {
    const state = createGameState();
    expect(state.currentPlayer).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.winningPositions).toEqual([]);
    expect(state.board.length).toBe(COLS);
  });
});

describe('findEmptyRow', () => {
  it('should return bottom row for empty column', () => {
    const board = createBoard();
    expect(findEmptyRow(board, 0)).toBe(ROWS - 1);
  });

  it('should return next empty row after pieces', () => {
    const board = createBoard();
    board[0][5] = 1;
    board[0][4] = 2;
    expect(findEmptyRow(board, 0)).toBe(3);
  });

  it('should return -1 for full column', () => {
    const board = createBoard();
    for (let row = 0; row < ROWS; row++) {
      board[0][row] = 1;
    }
    expect(findEmptyRow(board, 0)).toBe(-1);
  });
});

describe('canDropInColumn', () => {
  it('should return true for empty column', () => {
    const board = createBoard();
    expect(canDropInColumn(board, 0)).toBe(true);
    expect(canDropInColumn(board, 3)).toBe(true);
    expect(canDropInColumn(board, 6)).toBe(true);
  });

  it('should return false for full column', () => {
    const board = createBoard();
    for (let row = 0; row < ROWS; row++) {
      board[3][row] = 1;
    }
    expect(canDropInColumn(board, 3)).toBe(false);
  });

  it('should return false for invalid column', () => {
    const board = createBoard();
    expect(canDropInColumn(board, -1)).toBe(false);
    expect(canDropInColumn(board, 7)).toBe(false);
  });
});

describe('dropPiece', () => {
  it('should drop piece to bottom of empty column', () => {
    const board = createBoard();
    const row = dropPiece(board, 0, 1);
    expect(row).toBe(5);
    expect(board[0][5]).toBe(1);
  });

  it('should stack pieces correctly', () => {
    const board = createBoard();
    dropPiece(board, 0, 1);
    const row = dropPiece(board, 0, 2);
    expect(row).toBe(4);
    expect(board[0][4]).toBe(2);
  });

  it('should return -1 for full column', () => {
    const board = createBoard();
    for (let i = 0; i < ROWS; i++) {
      dropPiece(board, 0, 1);
    }
    const row = dropPiece(board, 0, 2);
    expect(row).toBe(-1);
  });
});

describe('checkWin', () => {
  it('should detect horizontal win', () => {
    const board = createBoard();
    // Place 4 in a row horizontally at bottom
    board[0][5] = 1;
    board[1][5] = 1;
    board[2][5] = 1;
    board[3][5] = 1;

    const result = checkWin(board, 3, 5);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(1);
    expect(result!.positions.length).toBe(4);
  });

  it('should detect vertical win', () => {
    const board = createBoard();
    // Place 4 in a column vertically
    board[0][5] = 2;
    board[0][4] = 2;
    board[0][3] = 2;
    board[0][2] = 2;

    const result = checkWin(board, 0, 2);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(2);
    expect(result!.positions.length).toBe(4);
  });

  it('should detect diagonal win (down-right)', () => {
    const board = createBoard();
    board[0][5] = 1;
    board[1][4] = 1;
    board[2][3] = 1;
    board[3][2] = 1;

    const result = checkWin(board, 3, 2);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(1);
  });

  it('should detect diagonal win (up-right)', () => {
    const board = createBoard();
    board[0][2] = 1;
    board[1][3] = 1;
    board[2][4] = 1;
    board[3][5] = 1;

    const result = checkWin(board, 3, 5);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(1);
  });

  it('should return null for no win', () => {
    const board = createBoard();
    board[0][5] = 1;
    board[1][5] = 1;
    board[2][5] = 1;
    // Only 3 in a row

    const result = checkWin(board, 2, 5);
    expect(result).toBeNull();
  });

  it('should return null for empty cell', () => {
    const board = createBoard();
    const result = checkWin(board, 0, 0);
    expect(result).toBeNull();
  });
});

describe('isBoardFull', () => {
  it('should return false for empty board', () => {
    const board = createBoard();
    expect(isBoardFull(board)).toBe(false);
  });

  it('should return false for partially filled board', () => {
    const board = createBoard();
    board[0][5] = 1;
    board[1][5] = 2;
    expect(isBoardFull(board)).toBe(false);
  });

  it('should return true for full board', () => {
    const board = createBoard();
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        board[col][row] = ((col + row) % 2 + 1) as Player;
      }
    }
    expect(isBoardFull(board)).toBe(true);
  });
});

describe('makeMove', () => {
  it('should make a valid move', () => {
    const state = createGameState();
    const { state: newState, row } = makeMove(state, 3);

    expect(row).toBe(5);
    expect(newState.board[3][5]).toBe(1);
    expect(newState.currentPlayer).toBe(2);
    expect(newState.gameOver).toBe(false);
  });

  it('should alternate players', () => {
    let state = createGameState();
    expect(state.currentPlayer).toBe(1);

    const result1 = makeMove(state, 0);
    state = result1.state;
    expect(state.currentPlayer).toBe(2);

    const result2 = makeMove(state, 1);
    state = result2.state;
    expect(state.currentPlayer).toBe(1);
  });

  it('should detect win', () => {
    let state = createGameState();

    // Player 1 plays columns 0-3, Player 2 plays column 6
    state = makeMove(state, 0).state; // P1 at (0,5)
    state = makeMove(state, 6).state; // P2 at (6,5)
    state = makeMove(state, 1).state; // P1 at (1,5)
    state = makeMove(state, 6).state; // P2 at (6,4)
    state = makeMove(state, 2).state; // P1 at (2,5)
    state = makeMove(state, 6).state; // P2 at (6,3)
    state = makeMove(state, 3).state; // P1 at (3,5) - wins!

    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(1);
    expect(state.winningPositions.length).toBe(4);
  });

  it('should not allow moves when game is over', () => {
    let state = createGameState();
    state.gameOver = true;
    state.winner = 1;

    const { state: newState, row } = makeMove(state, 0);
    expect(row).toBe(-1);
    expect(newState).toBe(state);
  });

  it('should not allow moves in full column', () => {
    let state = createGameState();

    // Fill column 0
    for (let i = 0; i < ROWS; i++) {
      const result = makeMove(state, 0);
      if (result.row >= 0) {
        state = result.state;
      }
    }

    // Try to add another piece
    const { row } = makeMove(state, 0);
    expect(row).toBe(-1);
  });
});

describe('getPlayerColor', () => {
  it('should return yellow for player 1', () => {
    expect(getPlayerColor(1)).toBe('#f7b731');
  });

  it('should return red for player 2', () => {
    expect(getPlayerColor(2)).toBe('#eb3b5a');
  });
});

describe('getPlayerName', () => {
  it('should return Yellow for player 1', () => {
    expect(getPlayerName(1)).toBe('Yellow');
  });

  it('should return Red for player 2', () => {
    expect(getPlayerName(2)).toBe('Red');
  });
});

describe('integration: full game scenarios', () => {
  it('should handle a complete game with winner', () => {
    let state = createGameState();

    // Simulate a game where Player 1 wins vertically
    // P1: 0, P2: 1, P1: 0, P2: 1, P1: 0, P2: 1, P1: 0 (wins)
    state = makeMove(state, 0).state;
    expect(state.currentPlayer).toBe(2);

    state = makeMove(state, 1).state;
    state = makeMove(state, 0).state;
    state = makeMove(state, 1).state;
    state = makeMove(state, 0).state;
    state = makeMove(state, 1).state;

    // P1's winning move
    const finalResult = makeMove(state, 0);
    state = finalResult.state;

    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(1);
  });

  it('should handle diagonal win scenario', () => {
    // Test diagonal win directly on the board
    const board = createBoard();

    // Set up a diagonal win for player 1: (0,5), (1,4), (2,3), (3,2)
    board[0][5] = 1;
    board[1][5] = 2; // Support piece
    board[1][4] = 1;
    board[2][5] = 2; // Support
    board[2][4] = 2; // Support
    board[2][3] = 1;
    board[3][5] = 2; // Support
    board[3][4] = 2; // Support
    board[3][3] = 2; // Support
    board[3][2] = 1;

    const result = checkWin(board, 3, 2);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(1);
    expect(result!.positions.length).toBe(4);
  });
});
