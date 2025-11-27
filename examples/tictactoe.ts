import { app, window, vbox, hbox, grid, button, label } from '../src';
// In production: import { app, window, vbox, hbox, grid, button, label } from 'tsyne';

/**
 * Basic Tic-Tac-Toe
 * A simple implementation of the classic game
 *
 * For the full-featured accessible version with TTS, high contrast mode,
 * keyboard navigation, and more, see tictactoe-accessible.ts
 */

// Game state
type Player = 'X' | 'O' | '';
type Board = Player[];
type GameState = 'playing' | 'won' | 'draw';

let board: Board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer: Player = 'X';
let gameState: GameState = 'playing';
let winner: Player = '';

// UI references
let cellButtons: any[] = [];
let statusLabel: any;

// Check for winner
function checkWinner(): Player {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return '';
}

// Check if board is full
function isBoardFull(): boolean {
  return board.every(cell => cell !== '');
}

// Make a move
function makeMove(index: number) {
  if (gameState !== 'playing' || board[index] !== '') {
    return;
  }

  // Place the mark
  board[index] = currentPlayer;
  updateCell(index);

  // Check for winner
  winner = checkWinner();
  if (winner) {
    gameState = 'won';
    updateStatus();
    return;
  }

  // Check for draw
  if (isBoardFull()) {
    gameState = 'draw';
    updateStatus();
    return;
  }

  // Switch player
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
}

// Update cell display
function updateCell(index: number) {
  if (cellButtons[index]) {
    const value = board[index] || ' ';
    cellButtons[index].setText(value);
  }
}

// Update status display
function updateStatus() {
  if (!statusLabel) return;

  if (gameState === 'won') {
    statusLabel.setText(`Player ${winner} wins!`);
  } else if (gameState === 'draw') {
    statusLabel.setText("It's a draw!");
  } else {
    statusLabel.setText(`Player ${currentPlayer}'s turn`);
  }
}

// Start new game
function newGame() {
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameState = 'playing';
  winner = '';

  // Update all cells
  for (let i = 0; i < 9; i++) {
    updateCell(i);
  }

  updateStatus();
}

// Build the UI
export function buildTicTacToe(a: any) {
  // Reset state for fresh game (important for test isolation)
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameState = 'playing';
  winner = '';
  cellButtons = [];

  a.window({ title: "Tic-Tac-Toe" }, () => {
    a.vbox(() => {
      // Status
      statusLabel = a.label("Player X's turn");

      // Game board (3x3 grid)
      a.grid(3, () => {
        for (let i = 0; i < 9; i++) {
          const cellButton = a.button(" ", () => makeMove(i)).withId(`cell${i}`);
          cellButtons[i] = cellButton;
        }
      });

      // Controls
      a.hbox(() => {
        a.button('New Game', () => newGame());
        a.button('Show Source', () => a.showSource(__filename));
      });
    });
  });
}

// Run the app if this file is executed directly
if (require.main === module) {
  app({ title: 'Tic-Tac-Toe' }, buildTicTacToe);
}
