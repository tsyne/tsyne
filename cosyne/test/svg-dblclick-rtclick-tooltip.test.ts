/**
 * Tests for SVG double-click, right-click, and tooltip events
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-dblclick-rtclick-tooltip.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, svg, TestJournal, SvgContext, SvgEvent, SvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG double-click, right-click, and tooltip events', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('onDoubleClick fires on correct element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let dblClicked = false;
    let dblClickCoords = { x: 0, y: 0 };
    let singleClicked = false;
    let rectEl: SvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG DoubleClick Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              rectEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#4488cc',
                onClick: () => { singleClicked = true; },
                onDoubleClick: (e) => {
                  dblClicked = true;
                  dblClickCoords = e;
                  rectEl.fill('#ff8800');
                },
              }).name('target');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Double-tap the center of the rect
    await journal.log('Double-tap → rect center (150, 150)');
    svgCtx.dispatchDoubleTap(150, 150);
    await ctx.wait(pause);

    expect(dblClicked).toBe(true);
    expect(dblClickCoords.x).toBe(150);
    expect(dblClickCoords.y).toBe(150);
    await journal.log(`  dblClicked=${dblClicked} at (${dblClickCoords.x}, ${dblClickCoords.y})`);

    // Double-tap outside — should NOT fire
    dblClicked = false;
    await journal.log('\nDouble-tap → outside (10, 10)');
    svgCtx.dispatchDoubleTap(10, 10);
    await ctx.wait(pause);

    expect(dblClicked).toBe(false);
    await journal.log(`  dblClicked=${dblClicked} (correct miss)`);

    await journal.log('\n── Double-click test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onRightClick fires on correct element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let rtClicked = false;
    let rtClickCoords = { x: 0, y: 0 };
    let rectEl: SvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG RightClick Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              rectEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#44cc88',
                onRightClick: (e) => {
                  rtClicked = true;
                  rtClickCoords = e;
                  rectEl.fill('#cc4444');
                },
              }).name('target');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Right-click the center of the rect
    await journal.log('Right-click → rect center (150, 150)');
    svgCtx.dispatchSecondaryTap(150, 150);
    await ctx.wait(pause);

    expect(rtClicked).toBe(true);
    expect(rtClickCoords.x).toBe(150);
    await journal.log(`  rtClicked=${rtClicked} at (${rtClickCoords.x}, ${rtClickCoords.y})`);

    // Right-click outside — should NOT fire
    rtClicked = false;
    await journal.log('\nRight-click → outside (10, 10)');
    svgCtx.dispatchSecondaryTap(10, 10);
    await ctx.wait(pause);

    expect(rtClicked).toBe(false);
    await journal.log(`  rtClicked=${rtClicked} (correct miss)`);

    await journal.log('\n── Right-click test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('tooltip shows on hover with delay and hides on leave', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;
    const events: SvgEvent[] = [];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Tooltip Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#8844cc',
                tooltip: 'Hello from tooltip!',
              }).name('tipRect');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
      const prevCb = (svgCtx as any).eventCallback;
      svgCtx.onEvent((e) => { prevCb?.(e); events.push(e); });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Hover into the rect — tooltip should NOT show immediately
    await journal.log('Hover → rect center (150, 150)');
    svgCtx.dispatchHover(150, 150);
    await ctx.wait(100);  // less than default 500ms delay

    const showsBefore = events.filter(e => e.type === 'tooltip-show');
    expect(showsBefore.length).toBe(0);
    await journal.log(`  tooltip-show count: ${showsBefore.length} (not yet)`);

    // Wait for tooltip delay to elapse
    await journal.log('Waiting for tooltip delay...');
    await ctx.wait(600);

    const showsAfter = events.filter(e => e.type === 'tooltip-show');
    expect(showsAfter.length).toBe(1);
    await journal.log(`  tooltip-show count: ${showsAfter.length} (shown)`);

    // Move outside — tooltip should hide
    await journal.log('\nHover → outside (10, 10)');
    svgCtx.dispatchHover(10, 10);
    await ctx.wait(pause);

    const hides = events.filter(e => e.type === 'tooltip-hide');
    expect(hides.length).toBe(1);
    await journal.log(`  tooltip-hide count: ${hides.length} (hidden)`);

    await journal.log('\n── Tooltip test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onDoubleClick and onRightClick work together on same element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let dblCount = 0;
    let rtCount = 0;
    let clickCount = 0;
    let rectEl: SvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Multi-Event Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              rectEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#cc8844',
                onClick: () => { clickCount++; rectEl.fill('#4488cc'); },
                onDoubleClick: () => { dblCount++; rectEl.fill('#ff8800'); },
                onRightClick: () => { rtCount++; rectEl.fill('#cc4444'); },
              }).name('multi');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log('Click → rect');
    svgCtx.dispatchTap(150, 150);
    await ctx.wait(pause);
    expect(clickCount).toBe(1);

    await journal.log('Double-click → rect');
    svgCtx.dispatchDoubleTap(150, 150);
    await ctx.wait(pause);
    expect(dblCount).toBe(1);

    await journal.log('Right-click → rect');
    svgCtx.dispatchSecondaryTap(150, 150);
    await ctx.wait(pause);
    expect(rtCount).toBe(1);

    await journal.log(`\nclick=${clickCount} dbl=${dblCount} rt=${rtCount}`);
    expect(clickCount).toBe(1);
    expect(dblCount).toBe(1);
    expect(rtCount).toBe(1);

    await journal.log('\n── Multi-event test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
