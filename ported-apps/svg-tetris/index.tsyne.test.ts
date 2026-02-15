/**
 * @jest-environment ../../jest-environment-tsyne.js
 */

/**
 * SVG Tetris — Visual CosyneTest
 *
 * Renders the Tetris board and tests basic game interaction.
 * Requires headed mode with Go bridge:
 *   TSYNE_HEADED=1 pnpm test ported-apps/svg-tetris/index.tsyne.test.ts
 *
 * Add SLOWER_TESTS=1 for visual inspection pauses.
 */

import * as path from 'path';
import * as fs from 'fs';
import { TestContext } from 'tsyne';
import type { App, Window } from 'tsyne';
import { CosyneTest, cvg, CvgContext, TestJournal } from 'cosyne';
import { TetrisEngine, ROWS, COLS } from './tetris-engine';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 800 : 100;

// ─── Layout constants (duplicated from index.ts for test isolation) ──

const CELL_SIZE = 1;
const BOARD_X = 0.5;
const BOARD_Y = 0.5;
const BOARD_W = COLS * CELL_SIZE;
const BOARD_H = ROWS * CELL_SIZE;
const PREVIEW_X = BOARD_X + BOARD_W + 1;
const PREVIEW_Y = 0.5;
const PREVIEW_COLS = 4;
const PREVIEW_ROWS = 4;
const VIEW_W = PREVIEW_X + PREVIEW_COLS + 1;
const VIEW_H = BOARD_H + 1;
const BG_COLOR = '#111111';
const BORDER_COLOR = '#555555';
const GRID_COLOR = '#222222';

describe('SVG Tetris — Visual', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('renders the empty board', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    const engine = new TetrisEngine();

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Tetris', width: 500, height: 650, x: 50, y: 50, padded: false }, (win: Window) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('SVG Tetris — Visual Test');
            svgCtx = cvg(a, {
              viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
              width: 480,
              height: Math.round(480 * (VIEW_H / VIEW_W)),
            }, (s) => {
              // Board background
              s.rect({ x: BOARD_X, y: BOARD_Y, width: BOARD_W, height: BOARD_H, fill: BG_COLOR, stroke: BORDER_COLOR, 'stroke-width': 0.05 });
              // Board cells
              for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                  const r = row, c = col;
                  s.rect({
                    x: BOARD_X + c * CELL_SIZE,
                    y: BOARD_Y + r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                    stroke: GRID_COLOR, 'stroke-width': 0.02,
                    bindFill: () => engine.getCellColor(c, r) ?? BG_COLOR,
                  });
                }
              }
              // Preview background
              s.rect({ x: PREVIEW_X, y: PREVIEW_Y, width: PREVIEW_COLS, height: PREVIEW_ROWS, fill: BG_COLOR, stroke: BORDER_COLOR, 'stroke-width': 0.05 });
              s.enableEvents();
            });
          }, { spacing: 0 });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 540, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    await journal.log('Empty board rendered');
    await ctx.wait(pause);

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await cosyneTest.screenshot(path.join(SCREENSHOT_DIR, 'empty-board.png'));

    await journal.log('\n── Render test passed ──');
    await ctx.wait(pause);
  }, slow ? 60000 : 30000);

  it('shows a game in progress with pieces', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    const engine = new TetrisEngine();

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Tetris — Game', width: 500, height: 650, x: 50, y: 50, padded: false }, (win: Window) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('SVG Tetris — Game Test');
            svgCtx = cvg(a, {
              viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
              width: 480,
              height: Math.round(480 * (VIEW_H / VIEW_W)),
            }, (s) => {
              s.rect({ x: BOARD_X, y: BOARD_Y, width: BOARD_W, height: BOARD_H, fill: BG_COLOR, stroke: BORDER_COLOR, 'stroke-width': 0.05 });
              for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                  const r = row, c = col;
                  s.rect({
                    x: BOARD_X + c * CELL_SIZE,
                    y: BOARD_Y + r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                    stroke: GRID_COLOR, 'stroke-width': 0.02,
                    bindFill: () => engine.getCellColor(c, r) ?? BG_COLOR,
                  });
                }
              }
              s.rect({ x: PREVIEW_X, y: PREVIEW_Y, width: PREVIEW_COLS, height: PREVIEW_ROWS, fill: BG_COLOR, stroke: BORDER_COLOR, 'stroke-width': 0.05 });
              // Preview cells
              for (let row = 0; row < PREVIEW_ROWS; row++) {
                for (let col = 0; col < PREVIEW_COLS; col++) {
                  const r = row, c = col;
                  s.rect({
                    x: PREVIEW_X + c * CELL_SIZE,
                    y: PREVIEW_Y + r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                    stroke: GRID_COLOR, 'stroke-width': 0.02,
                    bindFill: () => {
                      const next = engine.getNextPiece();
                      if (next) {
                        const cells = engine.getPieceCells(next);
                        for (const [cx, cy] of cells) {
                          if (cx === c && cy === r) return engine.getPieceColor(next);
                        }
                      }
                      return BG_COLOR;
                    },
                  });
                }
              }
              s.enableEvents();
            });
          }, { spacing: 0 });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 540, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Start a game
    engine.startGame();
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log('Game started');

    // Drop the first piece
    engine.drop();
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Score: ${engine.score}, piece dropped`);

    // Tick a few times to lock and get next piece
    engine.tick();
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Score: ${engine.score} after lock`);

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await cosyneTest.screenshot(path.join(SCREENSHOT_DIR, 'game-in-progress.png'));

    await journal.log('\n── Game test passed ──');
    await ctx.wait(pause);
  }, slow ? 60000 : 30000);
});
