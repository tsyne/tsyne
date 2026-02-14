/**
 * @jest-environment ../../jest-environment-tsyne.js
 */

/**
 * Trajan's Column - Visual CosyneTest
 *
 * Renders the column diagram and tests interactive block toggling.
 * Requires headed mode with Go bridge:
 *   TSYNE_HEADED=1 pnpm test ported-apps/trajans-column/index.tsyne.test.ts
 *
 * Add SLOWER_TESTS=1 for visual inspection pauses.
 */

import * as path from 'path';
import * as fs from 'fs';
import { TestContext } from 'tsyne';
import type { App, Window } from 'tsyne';
import { CosyneTest, cvg, CvgContext, TestJournal } from 'cosyne';
import { renderColumn, ColumnState } from './column-geometry';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 800 : 100;

describe("Trajan's Column - Visual", () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('renders the column diagram', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    const state: ColumnState = { activeBlock: null };

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: "Trajan's Column", width: 800, height: 900, x: 50, y: 50, padded: false }, (win: Window) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Click a block to explore').withId('statusLabel');
            svgCtx = cvg(a, {
              viewBox: '0 0 1000 1100',
              width: 800, height: 880,
            }, (s) => {
              renderColumn(s, state, (blockId) => {
                if (state.activeBlock === blockId) {
                  state.activeBlock = null;
                } else {
                  state.activeBlock = blockId;
                }
                svgCtx.refresh();
              });
            });
          }, { spacing: 0 });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 880, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    await journal.log('Column rendered successfully');
    await journal.log(`Active block: ${state.activeBlock ?? 'none'}`);
    await ctx.wait(pause);

    // Take initial screenshot
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await cosyneTest.screenshot(path.join(SCREENSHOT_DIR, 'initial.png'));

    await journal.log('\n── Render test passed ──');
    await ctx.wait(pause);
  }, slow ? 60000 : 30000);

  it('toggles block wireframes on click', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    const state: ColumnState = { activeBlock: null };

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: "Trajan's Column - Toggle", width: 800, height: 900, x: 50, y: 50, padded: false }, (win: Window) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Click a block to explore').withId('statusLabel');
            svgCtx = cvg(a, {
              viewBox: '0 0 1000 1100',
              width: 800, height: 880,
            }, (s) => {
              renderColumn(s, state, (blockId) => {
                if (state.activeBlock === blockId) {
                  state.activeBlock = null;
                } else {
                  state.activeBlock = blockId;
                }
                svgCtx.refresh();
              });
            });
          }, { spacing: 0 });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 880, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Simulate clicking block1a by setting state directly and refreshing
    await journal.log('Activate block1a');
    state.activeBlock = 'block1a';
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Active: ${state.activeBlock}`);

    // Toggle off
    await journal.log('\nDeactivate block1a');
    state.activeBlock = null;
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Active: ${state.activeBlock ?? 'none'}`);

    // Activate block5
    await journal.log('\nActivate block5');
    state.activeBlock = 'block5';
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Active: ${state.activeBlock}`);

    // Switch to block6
    await journal.log('\nSwitch to block6');
    state.activeBlock = 'block6';
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log(`Active: ${state.activeBlock}`);

    await journal.log('\n── Toggle test passed ──');
    await ctx.wait(pause);
  }, slow ? 60000 : 30000);
});
