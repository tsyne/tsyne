/**
 * Connect 4 Game Logic
 *
 * Core game state and win detection for Connect 4.
 * Portions copyright Emiliano Carrillo 2018
 */

export type Player = 1 | 2;
export type Cell = Player | null;

export const COLS = 7;
export const ROWS = 6;

// Direction vectors for win checking: horizontal, vertical, diagonal-down, diagonal-up
const DX = [1, -1, 0, 0, 1, -1, 1, -1];
const DY = [0, 0, 1, -1, -1, 1, 1, -1];

export interface WinResult {
  winner: Player;
  positions: [number, number][];
}

export interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  gameOver: boolean;
  winner: Player | null;
  winningPositions: [number, number][];
}

/**
 * Create a new empty game board
 */
export function createBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let col = 0; col < COLS; col++) {
    board[col] = new Array(ROWS).fill(null);
  }
  return board;
}

/**
 * Create initial game state
 */
export function createGameState(): GameState {
  return {
    board: createBoard(),
    currentPlayer: 1,
    gameOver: false,
    winner: null,
    winningPositions: [],
  };
}

/**
 * Find the lowest empty row in a column
 * Returns -1 if column is full
 */
export function findEmptyRow(board: Cell[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[col][row] === null) {
      return row;
    }
  }
  return -1;
}

/**
 * Check if a column can accept a piece
 */
export function canDropInColumn(board: Cell[][], col: number): boolean {
  return col >= 0 && col < COLS && board[col][0] === null;
}

/**
 * Drop a piece in a column
 * Returns the row where the piece landed, or -1 if column is full
 */
export function dropPiece(board: Cell[][], col: number, player: Player): number {
  const row = findEmptyRow(board, col);
  if (row >= 0) {
    board[col][row] = player;
  }
  return row;
}

/**
 * Count consecutive pieces in one direction from a starting position
 */
function countInDirection(
  board: Cell[][],
  col: number,
  row: number,
  dx: number,
  dy: number,
  player: Player
): number {
  let count = 0;
  let c = col + dx;
  let r = row + dy;

  while (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) {
    count++;
    c += dx;
    r += dy;
  }

  return count;
}

/**
 * Collect winning positions in one direction
 */
function collectPositions(
  board: Cell[][],
  col: number,
  row: number,
  dx: number,
  dy: number,
  player: Player
): [number, number][] {
  const positions: [number, number][] = [];
  let c = col + dx;
  let r = row + dy;

  while (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) {
    positions.push([c, r]);
    c += dx;
    r += dy;
  }

  return positions;
}

/**
 * Check if the last move at (col, row) wins the game
 * Returns win info if there's a winner, null otherwise
 */
export function checkWin(board: Cell[][], col: number, row: number): WinResult | null {
  const player = board[col][row];
  if (player === null) return null;

  // Check all 4 directions (each direction checked both ways)
  for (let i = 0; i < 8; i += 2) {
    const count1 = countInDirection(board, col, row, DX[i], DY[i], player);
    const count2 = countInDirection(board, col, row, DX[i + 1], DY[i + 1], player);

    if (count1 + count2 + 1 >= 4) {
      // Found a winner! Collect the winning positions
      const positions: [number, number][] = [[col, row]];
      positions.push(...collectPositions(board, col, row, DX[i], DY[i], player));
      positions.push(...collectPositions(board, col, row, DX[i + 1], DY[i + 1], player));

      return {
        winner: player,
        positions: positions.slice(0, 4), // Only return 4 positions
      };
    }
  }

  return null;
}

/**
 * Check if the board is completely full (draw)
 */
export function isBoardFull(board: Cell[][]): boolean {
  for (let col = 0; col < COLS; col++) {
    if (board[col][0] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Make a move and update game state
 * Returns the updated state and the row where piece landed
 */
export function makeMove(state: GameState, col: number): { state: GameState; row: number } {
  if (state.gameOver || !canDropInColumn(state.board, col)) {
    return { state, row: -1 };
  }

  // Clone the board
  const newBoard = state.board.map(column => [...column]);
  const row = dropPiece(newBoard, col, state.currentPlayer);

  if (row < 0) {
    return { state, row: -1 };
  }

  // Check for win
  const winResult = checkWin(newBoard, col, row);

  if (winResult) {
    return {
      state: {
        board: newBoard,
        currentPlayer: state.currentPlayer,
        gameOver: true,
        winner: winResult.winner,
        winningPositions: winResult.positions,
      },
      row,
    };
  }

  // Check for draw
  if (isBoardFull(newBoard)) {
    return {
      state: {
        board: newBoard,
        currentPlayer: state.currentPlayer,
        gameOver: true,
        winner: null,
        winningPositions: [],
      },
      row,
    };
  }

  // Switch players
  return {
    state: {
      board: newBoard,
      currentPlayer: state.currentPlayer === 1 ? 2 : 1,
      gameOver: false,
      winner: null,
      winningPositions: [],
    },
    row,
  };
}

/**
 * Get player color
 */
export function getPlayerColor(player: Player): string {
  return player === 1 ? '#f7b731' : '#eb3b5a'; // Yellow for P1, Red for P2
}

/**
 * Get player name
 */
export function getPlayerName(player: Player): string {
  return player === 1 ? 'Yellow' : 'Red';
}
