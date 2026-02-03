/**
 * Connect 4 - Imperative Style
 *
 * A two-player Connect 4 game using imperative UI rebuilds on state change.
 * Portions copyright Emiliano Carrillo 2018
 *
 * Run: npx tsx ported-apps/connect4/src/connect4-imperative.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, enableEventHandling, type CosyneContext } from 'cosyne';
import {
  createGameState,
  makeMove,
  getPlayerColor,
  getPlayerName,
  canDropInColumn,
  COLS,
  ROWS,
  type GameState,
} from './game-logic';

// Board colors
const BOARD_COLOR = '#3867d6';
const BACKGROUND_COLOR = '#f0f0f0';
const WIN_HIGHLIGHT_COLOR = '#66FF33';
const HOLE_COLOR = '#e0e0e0';

// Cell dimensions
const CELL_SIZE = 70;
const PIECE_RADIUS = 28;
const BOARD_WIDTH = COLS * CELL_SIZE;
const BOARD_HEIGHT = ROWS * CELL_SIZE;

interface AppState {
  game: GameState;
}

function createConnect4ImperativeApp(a: App): void {
  const state: AppState = {
    game: createGameState(),
  };

  let currentWindow: any = null;

  /**
   * Handle column click
   */
  function handleColumnClick(col: number): void {
    if (state.game.gameOver) {
      return;
    }
    if (!canDropInColumn(state.game.board, col)) {
      return;
    }

    const { state: newState } = makeMove(state.game, col);
    state.game = newState;
    refreshUI();
  }

  /**
   * Reset the game
   */
  function resetGame(): void {
    state.game = createGameState();
    refreshUI();
  }

  /**
   * Refresh UI - rebuild content since game state creates new primitives
   */
  function refreshUI(): void {
    if (currentWindow) {
      currentWindow.setContent(renderContent);
    }
  }

  /**
   * Check if a position is a winning position
   */
  function isWinningPosition(col: number, row: number): boolean {
    return state.game.winningPositions.some(([wc, wr]) => wc === col && wr === row);
  }

  /**
   * Render the game board using Cosyne with click handling
   */
  function renderBoard(c: CosyneContext): void {
    // Draw board background
    c.rect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, { fillColor: BOARD_COLOR });

    // Draw holes and pieces
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = row * CELL_SIZE + CELL_SIZE / 2;
        const cell = state.game.board[col][row];

        if (cell === null) {
          // Empty hole
          c.circle(x, y, PIECE_RADIUS, { fillColor: HOLE_COLOR });
        } else {
          // Piece
          const isWinning = isWinningPosition(col, row);
          c.circle(x, y, PIECE_RADIUS, {
            fillColor: getPlayerColor(cell),
            strokeColor: isWinning ? WIN_HIGHLIGHT_COLOR : '#ffffff',
            strokeWidth: isWinning ? 4 : 2,
          });
        }
      }
    }

    // Invisible click targets for each column (drawn on top)
    for (let col = 0; col < COLS; col++) {
      const colNum = col;
      const rectX = col * CELL_SIZE;
      c.rect(rectX, 0, CELL_SIZE, BOARD_HEIGHT, { fillColor: 'transparent' })
        .withId(`col-${col}`)
        .onClick(() => {
          handleColumnClick(colNum);
        });
    }
  }

  /**
   * Render the app content
   */
  const renderContent = () => {
    a.vbox(() => {
      // Title
      a.label('CONNECT FOUR').withId('title');

      // Status message
      a.hbox(() => {
        if (state.game.gameOver && state.game.winner) {
          a.label(`Winner: ${getPlayerName(state.game.winner)}!`);
        } else if (state.game.gameOver) {
          a.label("It's a draw!");
        } else {
          a.label(`Current turn: ${getPlayerName(state.game.currentPlayer)}`);
        }
      });

      // Column indicators - click numbers to drop pieces
      a.canvasStack(() => {
        const indicatorCtx = cosyne(a, (c) => {
          // Background
          c.rect(0, 0, BOARD_WIDTH, 40, { fillColor: BACKGROUND_COLOR });

          // Draw column numbers centered in each column
          for (let col = 0; col < COLS; col++) {
            const centerX = col * CELL_SIZE + CELL_SIZE / 2;
            const canDrop = canDropInColumn(state.game.board, col) && !state.game.gameOver;
            const playerColor = getPlayerColor(state.game.currentPlayer);
            const colNum = col;

            // Group at circle center - children use relative coordinates
            c.group(centerX, 20, (g) => {
              // Clickable indicator circle at origin
              g.circle(0, 0, 16, {
                fillColor: canDrop ? playerColor : '#cccccc',
              })
                .withId(`indicator-${col}`)
                .onClick(() => {
                  handleColumnClick(colNum);
                });

              // Column number text centered in circle
              // x=-4 centers single digit, y=-12 centers vertically
              g.text(-4, -12, `${col + 1}`, {
                fillColor: '#ffffff',
                fontSize: 14,
              }).passthrough();
            });
          }
        });
        enableEventHandling(indicatorCtx, a, { width: BOARD_WIDTH, height: 40 });
      });

      // Game board - click anywhere on a column to drop a piece
      a.canvasStack(() => {
        const ctx = cosyne(a, (c) => {
          renderBoard(c);
        });
        enableEventHandling(ctx, a, { width: BOARD_WIDTH, height: BOARD_HEIGHT });
      });

      // Controls
      a.hbox(() => {
        a.button('New Game', { onClick: resetGame });
      });

      // Legend
      a.label('Yellow = Player 1  |  Red = Player 2  |  Click to drop');
    });
  };

  // Create window
  a.window(
    {
      title: 'Connect 4',
      width: BOARD_WIDTH + 120,
      height: BOARD_HEIGHT + 200,
    },
    (win: any) => {
      currentWindow = win;
      win.setContent(renderContent);
      win.show();
    }
  );
}

// Main entry point
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Connect 4' }, createConnect4ImperativeApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createConnect4ImperativeApp };
