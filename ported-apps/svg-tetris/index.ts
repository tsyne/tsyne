/**
 * SVG Tetris → CVG Port
 *
 * Original: SVGtetris.svg by alex fritze (public domain, 2004)
 * Uses CVG rect elements with bindFill() for reactive cell rendering,
 * matching the spirit of the original SVG DOM rect-per-cell approach.
 *
 * @tsyne-app:name SVG Tetris
 * @tsyne-app:icon <svg viewBox="0 0 24 24"><rect x="2" y="1" width="20" height="22" rx="1" fill="#222" stroke="#888"/><rect x="4" y="10" width="4" height="4" fill="#00cccc"/><rect x="8" y="10" width="4" height="4" fill="#00cccc"/><rect x="12" y="10" width="4" height="4" fill="#00cccc"/><rect x="16" y="10" width="4" height="4" fill="#00cccc"/><rect x="4" y="14" width="4" height="4" fill="#cc0000"/><rect x="8" y="14" width="4" height="4" fill="#cc0000"/><rect x="8" y="18" width="4" height="4" fill="#00cc00"/><rect x="12" y="18" width="4" height="4" fill="#00cc00"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder createSvgTetrisApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { cvg } from 'cosyne';
import type { CvgContext } from 'cosyne';
import { TetrisEngine, ROWS, COLS, SHAPE_DESCRIPTORS } from './tetris-engine';

// ─── Layout Constants ────────────────────────────────────────

const CELL_SIZE = 1;
const BOARD_X = 0.5;
const BOARD_Y = 0.5;
const BOARD_W = COLS * CELL_SIZE;           // 10
const BOARD_H = ROWS * CELL_SIZE;           // 20
const PREVIEW_X = BOARD_X + BOARD_W + 0.5;  // 11
const PREVIEW_Y = 0.5;
const PREVIEW_COLS = 4;
const PREVIEW_ROWS = 4;
const VIEW_W = PREVIEW_X + PREVIEW_COLS + 0.5; // 15.5
const VIEW_H = BOARD_H + 1;                    // 21

const BG_COLOR = '#111111';
const BORDER_COLOR = '#555555';
const GRID_COLOR = '#222222';
const GHOST_ALPHA = 0.3;

// ─── UI Controller ───────────────────────────────────────────

export class SvgTetrisUI {
  private a: App;
  private engine: TetrisEngine;
  private cvgCtx: CvgContext = null as any;
  private gameLoop: ReturnType<typeof setInterval> | null = null;
  private statusLabel: any = null;

  constructor(a: App) {
    this.a = a;
    this.engine = new TetrisEngine();
    this.engine.onUpdate = () => this.updateStatus();
    this.engine.onGameOver = () => {
      this.stopLoop();
      this.updateStatus();
    };
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      this.statusLabel = this.a.label('Press R to start, arrows to move, space to drop').withId('status');

      this.cvgCtx = cvg(this.a, {
        viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
        width: 310,
        height: Math.round(310 * (VIEW_H / VIEW_W)),
      }, (s) => {
        this.buildScene(s);
      });
    }, { spacing: 0 });
  }

  private buildScene(s: CvgContext): void {
    const engine = this.engine;

    // ── Board border + background ────────────────────────────
    s.rect({
      x: BOARD_X - 0.05, y: BOARD_Y - 0.05,
      width: BOARD_W + 0.1, height: BOARD_H + 0.1,
      fill: BORDER_COLOR,
    });
    s.rect({
      x: BOARD_X, y: BOARD_Y,
      width: BOARD_W, height: BOARD_H,
      fill: BG_COLOR,
    });

    // ── Board cells (10×20 = 200 rects with bindFill) ────────
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const r = row, c = col;  // capture for closure
        s.rect({
          x: BOARD_X + c * CELL_SIZE,
          y: BOARD_Y + r * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          stroke: GRID_COLOR,
          'stroke-width': 0.02,
          bindFill: () => {
            // Ghost piece
            const ghostCells = engine.getGhostCells();
            if (ghostCells) {
              for (const [gx, gy] of ghostCells) {
                if (gx === c && gy === r) {
                  const piece = engine.getCurrentPiece();
                  if (piece) {
                    return dimColor(engine.getPieceColor(piece), GHOST_ALPHA);
                  }
                }
              }
            }
            // Active piece + locked board
            return engine.getCellColor(c, r) ?? BG_COLOR;
          },
        });
      }
    }

    // ── Preview border + background ──────────────────────────
    s.rect({
      x: PREVIEW_X - 0.05, y: PREVIEW_Y - 0.05,
      width: PREVIEW_COLS + 0.1, height: PREVIEW_ROWS + 0.1,
      fill: BORDER_COLOR,
    });
    s.rect({
      x: PREVIEW_X, y: PREVIEW_Y,
      width: PREVIEW_COLS, height: PREVIEW_ROWS,
      fill: BG_COLOR,
    });

    // ── Preview cells (4×4 = 16 rects with bindFill) ─────────
    for (let row = 0; row < PREVIEW_ROWS; row++) {
      for (let col = 0; col < PREVIEW_COLS; col++) {
        const r = row, c = col;
        s.rect({
          x: PREVIEW_X + c * CELL_SIZE,
          y: PREVIEW_Y + r * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          stroke: GRID_COLOR,
          'stroke-width': 0.02,
          bindFill: () => {
            const next = engine.getNextPiece();
            if (next) {
              const cells = engine.getPieceCells(next);
              for (const [cx, cy] of cells) {
                if (cx === c && cy === r) {
                  return engine.getPieceColor(next);
                }
              }
            }
            return BG_COLOR;
          },
        });
      }
    }

    // Score/lines are shown via the Tsyne label above the CVG.

    // ── Keyboard handling ────────────────────────────────────
    s.onKeyDown((key: string) => this.handleKey(key));
    s.enableEvents();
  }

  private handleKey(key: string): void {
    switch (key) {
      case 'Left':
        this.engine.move(-1, 0);
        break;
      case 'Right':
        this.engine.move(1, 0);
        break;
      case 'Down':
        this.engine.tick();
        break;
      case 'Up':
        this.engine.rotate();
        break;
      case ' ':
      case 'Space':
        this.engine.drop();
        break;
      case 'p':
      case 'P':
        this.engine.togglePause();
        if (this.engine.gameState === 'paused') {
          this.stopLoop();
        } else if (this.engine.gameState === 'running') {
          this.startLoop();
        }
        break;
      case 'r':
      case 'R':
        this.stopLoop();
        this.engine.startGame();
        this.startLoop();
        break;
    }
    this.cvgCtx.refresh();
  }

  private startLoop(): void {
    this.stopLoop();
    this.gameLoop = setInterval(() => {
      if (this.engine.gameState === 'running') {
        this.engine.tick();
        this.cvgCtx.refresh();
        this.updateStatus();
      }
    }, this.engine.tickTime);
  }

  private stopLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private updateStatus(): void {
    if (!this.statusLabel) return;
    const state = this.engine.gameState;
    if (state === 'finished') {
      this.statusLabel.setText(`Game Over! Score: ${this.engine.score}  Lines: ${this.engine.lines}`);
    } else if (state === 'paused') {
      this.statusLabel.setText(`PAUSED  Score: ${this.engine.score}  Lines: ${this.engine.lines}`);
    } else if (state === 'running') {
      this.statusLabel.setText(`Score: ${this.engine.score}  Lines: ${this.engine.lines}`);
    } else {
      this.statusLabel.setText('Press R to start, arrows to move, space to drop');
    }
  }

  // ── Test Helpers ──

  getEngine(): TetrisEngine { return this.engine; }
  getCvgContext(): CvgContext { return this.cvgCtx; }
  /** Stop the game loop (for deterministic test assertions). */
  testStopLoop(): void { this.stopLoop(); }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Dim a hex color by mixing with black. */
function dimColor(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * alpha);
  const dg = Math.round(g * alpha);
  const db = Math.round(b * alpha);
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

// ─── App Entry Points ────────────────────────────────────────

export async function createSvgTetrisApp(a: App): Promise<SvgTetrisUI> {
  const ui = new SvgTetrisUI(a);

  a.window({ title: 'SVG Tetris', width: 340, height: 500 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'SVG Tetris' }, async (a: App) => {
    await createSvgTetrisApp(a);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
  });
}
