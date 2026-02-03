/**
 * Connect 4 - Declarative/Binding Style
 *
 * Uses a pseudo-declarative binding pattern similar to clock app.
 * Cells and indicators are bound to state functions and updated in place.
 *
 * Run: npx tsx ported-apps/connect4/src/connect4-declarative.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from '../../../core/src/index';
import type { App } from '../../../core/src/index';
import { cosyne, enableEventHandling, type CosyneContext } from '../../../cosyne/src/index';
import type { CosyneCircle } from '../../../cosyne/src/index';
import {
  createGameState,
  makeMove,
  getPlayerColor,
  getPlayerName,
  canDropInColumn,
  COLS,
  ROWS,
  type GameState,
  type Player,
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
 * Cell binding - binds a circle primitive to a cell state function
 */
interface CellBinding {
  circle: CosyneCircle;
  col: number;
  row: number;
  getState: () => Player | null;
  isWinning: () => boolean;
}

/**
 * Indicator binding - binds an indicator circle to game state
 */
interface IndicatorBinding {
  circle: CosyneCircle;
  col: number;
  canDrop: () => boolean;
  currentPlayerColor: () => string;
}

/**
 * Declarative Connect 4 game
 */
class Connect4Game {
  private game: GameState;
  private cellBindings: CellBinding[] = [];
  private indicatorBindings: IndicatorBinding[] = [];
  private statusLabel: any = null;

  constructor(private a: App) {
    this.game = createGameState();
  }

  /**
   * Bind a cell circle to its position in the board
   */
  private bindCell(c: CosyneContext, col: number, row: number): void {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = row * CELL_SIZE + CELL_SIZE / 2;

    const circle = c.circle(x, y, PIECE_RADIUS, { fillColor: HOLE_COLOR });

    this.cellBindings.push({
      circle,
      col,
      row,
      getState: () => this.game.board[col][row],
      isWinning: () => this.game.winningPositions.some(([wc, wr]) => wc === col && wr === row),
    });
  }

  /**
   * Bind an indicator circle to its column
   */
  private bindIndicator(c: CosyneContext, col: number, centerX: number): void {
    const colNum = col;
    const circle = c.circle(centerX, 20, 16, { fillColor: DISABLED_COLOR })
      .onClick(() => this.handleColumnClick(colNum));

    this.indicatorBindings.push({
      circle,
      col,
      canDrop: () => canDropInColumn(this.game.board, col) && !this.game.gameOver,
      currentPlayerColor: () => getPlayerColor(this.game.currentPlayer),
    });
  }

  /**
   * Update all bindings based on current game state
   */
  private updateBindings(): void {
    // Update cell bindings
    for (const binding of this.cellBindings) {
      const state = binding.getState();
      const isWinning = binding.isWinning();

      if (state === null) {
        binding.circle.fill(HOLE_COLOR).stroke('transparent', 0);
      } else {
        binding.circle
          .fill(getPlayerColor(state))
          .stroke(isWinning ? WIN_HIGHLIGHT_COLOR : '#ffffff', isWinning ? 4 : 2);
      }
    }

    // Update indicator bindings
    for (const binding of this.indicatorBindings) {
      const canDrop = binding.canDrop();
      binding.circle.fill(canDrop ? binding.currentPlayerColor() : DISABLED_COLOR);
    }

    // Update status label
    if (this.statusLabel) {
      this.statusLabel.setText(this.getStatusMessage());
    }
  }

  /**
   * Handle column click
   */
  private handleColumnClick(col: number): void {
    if (this.game.gameOver || !canDropInColumn(this.game.board, col)) {
      return;
    }

    const { state: newState } = makeMove(this.game, col);
    this.game = newState;
    this.updateBindings();
  }

  /**
   * Reset the game
   */
  private resetGame(): void {
    this.game = createGameState();
    this.updateBindings();
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
   * Build the UI with declarative bindings
   */
  buildUI(): () => void {
    return () => {
      this.a.vbox(() => {
        this.a.label('CONNECT FOUR');

        // Status - bound to game state
        this.statusLabel = this.a.label(this.getStatusMessage());

        // Column indicators with bindings
        this.a.canvasStack(() => {
          const indicatorCtx = cosyne(this.a, (c) => {
            c.rect(0, 0, BOARD_WIDTH, 40, { fillColor: BACKGROUND_COLOR });

            this.indicatorBindings = [];
            for (let col = 0; col < COLS; col++) {
              const centerX = col * CELL_SIZE + CELL_SIZE / 2;
              this.bindIndicator(c, col, centerX);

              // Column number (static, passthrough)
              c.text(centerX - 4, 8, `${col + 1}`, {
                fillColor: '#ffffff',
                fontSize: 14,
              }).passthrough();
            }
          });
          enableEventHandling(indicatorCtx, this.a, { width: BOARD_WIDTH, height: 40 });
        });

        // Game board with cell bindings
        this.a.canvasStack(() => {
          const ctx = cosyne(this.a, (c) => {
            // Board background (static)
            c.rect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, { fillColor: BOARD_COLOR });

            // Create cell bindings for all positions
            this.cellBindings = [];
            for (let col = 0; col < COLS; col++) {
              for (let row = 0; row < ROWS; row++) {
                this.bindCell(c, col, row);
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

        // Initial binding update
        this.updateBindings();
      });
    };
  }
}

function createConnect4DeclarativeApp(a: App): void {
  const game = new Connect4Game(a);

  a.window(
    {
      title: 'Connect 4 (Declarative)',
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
  const appInstance = app(resolveTransport(), { title: 'Connect 4' }, createConnect4DeclarativeApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createConnect4DeclarativeApp, Connect4Game };
