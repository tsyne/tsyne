/**
 * Connect 4 - Fully Declarative with Built-in Bindings
 *
 * Uses Cosyne's built-in .bindFill() and .bindStroke() methods.
 * No manual binding arrays or update loops needed.
 *
 * Run: npx tsx ported-apps/connect4/src/connect4-fully-declarative.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';
import type { CosyneContext } from 'cosyne';
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
const DISABLED_COLOR = '#cccccc';

// Cell dimensions
const CELL_SIZE = 70;
const PIECE_RADIUS = 28;
const BOARD_WIDTH = COLS * CELL_SIZE;
const BOARD_HEIGHT = ROWS * CELL_SIZE;

/**
 * Fully Declarative Connect 4 game
 *
 * Uses Cosyne's built-in binding system - no manual update loops.
 */
class Connect4Game {
  private game: GameState;
  private statusLabel: any = null;

  constructor(private a: App) {
    this.game = createGameState();
  }

  /**
   * Check if a position is a winning position
   */
  private isWinning(col: number, row: number): boolean {
    return this.game.winningPositions.some(([wc, wr]) => wc === col && wr === row);
  }

  /**
   * Build a cell with declarative bindings
   * The circle's fill and stroke are bound to functions that read game state.
   */
  private buildCell(c: CosyneContext, col: number, row: number): void {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = row * CELL_SIZE + CELL_SIZE / 2;

    c.circle(x, y, PIECE_RADIUS)
      .bindFill(() => {
        const state = this.game.board[col][row];
        return state === null ? HOLE_COLOR : getPlayerColor(state);
      })
      .bindStroke(() => {
        const isWinning = this.isWinning(col, row);
        return isWinning ? WIN_HIGHLIGHT_COLOR : '#ffffff';
      });
    // Note: strokeWidth binding not yet available, using static width
  }

  /**
   * Build an indicator with declarative bindings
   */
  private buildIndicator(c: CosyneContext, col: number, centerX: number): void {
    const colNum = col;

    c.circle(centerX, 20, 16)
      .bindFill(() => {
        const canDrop = canDropInColumn(this.game.board, col) && !this.game.gameOver;
        return canDrop ? getPlayerColor(this.game.currentPlayer) : DISABLED_COLOR;
      })
      .onClick(() => this.handleColumnClick(colNum));

    // Column number (static)
    c.text(centerX - 4, 8, `${col + 1}`, {
      fillColor: '#ffffff',
      fontSize: 14,
    }).passthrough();
  }

  /**
   * Handle column click - update state and refresh bindings
   */
  private handleColumnClick(col: number): void {
    if (this.game.gameOver || !canDropInColumn(this.game.board, col)) {
      return;
    }

    const { state: newState } = makeMove(this.game, col);
    this.game = newState;

    // Refresh all bindings - this evaluates all bindFill/bindStroke functions
    refreshAllCosyneContexts();

    // Update status label
    if (this.statusLabel) {
      this.statusLabel.setText(this.getStatusMessage());
    }
  }

  /**
   * Reset the game
   */
  private resetGame(): void {
    this.game = createGameState();
    refreshAllCosyneContexts();
    if (this.statusLabel) {
      this.statusLabel.setText(this.getStatusMessage());
    }
  }

  /**
   * Get status message
   */
  private getStatusMessage(): string {
    if (this.game.gameOver) {
      if (this.game.winner) {
        return `${getPlayerName(this.game.winner)} wins!`;
      }
      return "It's a draw!";
    }
    return `${getPlayerName(this.game.currentPlayer)}'s turn`;
  }

  /**
   * Build the UI - cells and indicators use declarative bindings
   */
  buildUI(): () => void {
    return () => {
      this.a.vbox(() => {
        this.a.label('CONNECT FOUR (Declarative Bindings)');

        // Status label
        this.statusLabel = this.a.label(this.getStatusMessage());

        // Column indicators with bindings
        this.a.canvasStack(() => {
          const indicatorCtx = cosyne(this.a, (c) => {
            c.rect(0, 0, BOARD_WIDTH, 40, { fillColor: BACKGROUND_COLOR });

            for (let col = 0; col < COLS; col++) {
              const centerX = col * CELL_SIZE + CELL_SIZE / 2;
              this.buildIndicator(c, col, centerX);
            }
          });
          enableEventHandling(indicatorCtx, this.a, { width: BOARD_WIDTH, height: 40 });
        });

        // Game board with declarative cell bindings
        this.a.canvasStack(() => {
          const ctx = cosyne(this.a, (c) => {
            // Board background (static)
            c.rect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, { fillColor: BOARD_COLOR });

            // Build cells with declarative bindings
            for (let col = 0; col < COLS; col++) {
              for (let row = 0; row < ROWS; row++) {
                this.buildCell(c, col, row);
              }
            }

            // Click targets for columns (static, on top)
            for (let col = 0; col < COLS; col++) {
              const colNum = col;
              c.rect(col * CELL_SIZE, 0, CELL_SIZE, BOARD_HEIGHT, { fillColor: 'transparent' })
                .onClick(() => this.handleColumnClick(colNum));
            }
          });
          enableEventHandling(ctx, this.a, { width: BOARD_WIDTH, height: BOARD_HEIGHT });
        });

        // Controls
        this.a.hbox(() => {
          this.a.button('New Game', { onClick: () => this.resetGame() });
        });

        this.a.label('Yellow = Player 1  |  Red = Player 2  |  Click to drop');
      });
    };
  }
}

function createConnect4FullyDeclarativeApp(a: App): void {
  const game = new Connect4Game(a);

  a.window(
    {
      title: 'Connect 4 (Fully Declarative)',
      width: BOARD_WIDTH + 120,
      height: BOARD_HEIGHT + 200,
    },
    (win: any) => {
      win.setContent(game.buildUI());
      win.show();
    }
  );
}

// Main entry point
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Connect 4' }, createConnect4FullyDeclarativeApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createConnect4FullyDeclarativeApp, Connect4Game };
