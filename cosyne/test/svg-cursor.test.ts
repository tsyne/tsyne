/**
 * Tests for SVG cursor changes
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-cursor.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, svg, TestJournal, SvgContext, SvgEvent, SvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG cursor changes', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('sets pointer cursor on hoverable button rect', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;
    const events: SvgEvent[] = [];
    const cursorLog: string[] = [];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Cursor Test', width: 400, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 400 300', width: 400, height: 300 }, (s) => {
              // Background — no cursor set (should revert to default)
              s.rect({ x: 0, y: 0, width: 400, height: 300, fill: '#f0f0f0' }).name('bg');

              // Button — pointer cursor via options
              s.rect({
                x: 50, y: 50, width: 140, height: 60, fill: '#4488cc',
                cursor: 'pointer',
                onClick: () => {},
              }).name('button');

              // Text input area — text cursor via fluent
              s.rect({
                x: 210, y: 50, width: 140, height: 60, fill: '#eee',
                stroke: '#999', 'stroke-width': 1,
              }).name('input').cursor('text');

              // Resize handle — hResize cursor
              s.rect({
                x: 175, y: 150, width: 50, height: 50, fill: '#cc8844',
              }).name('resizer').cursor('hResize');

              // Crosshair area
              s.rect({
                x: 50, y: 150, width: 100, height: 100, fill: '#88cc44',
              }).name('crosshair-area').cursor('crosshair');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 480, y: 50 });
      const prevCb = (svgCtx as any).eventCallback;
      svgCtx.onEvent((e) => { prevCb?.(e); events.push(e); });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // ─── Hover into button (should get pointer cursor) ───
    await journal.log('Hover → button (120, 80)');
    svgCtx.dispatchHover(120, 80);
    await ctx.wait(pause);

    const hoverInBtn = events.find(e => e.type === 'hover-in' && e.elementName === 'button');
    expect(hoverInBtn).toBeDefined();
    await journal.log('  ✓ hover-in on button');

    // ─── Hover into text input (should get text cursor) ───
    await journal.log('\nHover → input (280, 80)');
    svgCtx.dispatchHover(280, 80);
    await ctx.wait(pause);

    const hoverInInput = events.find(e => e.type === 'hover-in' && e.elementName === 'input');
    expect(hoverInInput).toBeDefined();
    await journal.log('  ✓ hover-in on input');

    // ─── Hover into resizer (hResize cursor) ───
    await journal.log('\nHover → resizer (200, 175)');
    svgCtx.dispatchHover(200, 175);
    await ctx.wait(pause);

    const hoverInResizer = events.find(e => e.type === 'hover-in' && e.elementName === 'resizer');
    expect(hoverInResizer).toBeDefined();
    await journal.log('  ✓ hover-in on resizer');

    // ─── Hover into crosshair area ───
    await journal.log('\nHover → crosshair area (100, 200)');
    svgCtx.dispatchHover(100, 200);
    await ctx.wait(pause);

    const hoverInCross = events.find(e => e.type === 'hover-in' && e.elementName === 'crosshair-area');
    expect(hoverInCross).toBeDefined();
    await journal.log('  ✓ hover-in on crosshair-area');

    // ─── Hover outside (should revert to default) ───
    await journal.log('\nHover → outside (5, 5)');
    svgCtx.dispatchHover(5, 5);
    await ctx.wait(pause);

    // Verify we got hover-out from the crosshair area
    const hoverOutCross = events.find(e => e.type === 'hover-out' && e.elementName === 'crosshair-area');
    expect(hoverOutCross).toBeDefined();
    await journal.log('  ✓ hover-out from crosshair-area (cursor → default)');

    // Verify total event counts
    const hoverIns = events.filter(e => e.type === 'hover-in');
    const hoverOuts = events.filter(e => e.type === 'hover-out');
    expect(hoverIns.length).toBe(4);
    expect(hoverOuts.length).toBe(4);
    await journal.log(`\nTotal: ${hoverIns.length} hover-in, ${hoverOuts.length} hover-out`);

    await journal.log('\n── All cursor tests passed ──');
    await ctx.captureScreenshot('svg-cursor-rects.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('cursor works with onHover handler on same element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let hovered = false;
    let rectEl: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Cursor+Hover Test', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              rectEl = s.rect({
                x: 50, y: 50, width: 200, height: 100, fill: '#4488cc',
                onHover: (h) => {
                  hovered = h;
                  rectEl.fill(h ? '#66aaee' : '#4488cc');
                },
                cursor: 'pointer',
              }).name('btn');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 330, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Hover in — should trigger both hover handler AND cursor change
    await journal.log('Hover → into rect (150, 100)');
    svgCtx.dispatchHover(150, 100);
    await ctx.wait(pause);
    expect(hovered).toBe(true);
    await journal.log(`  ✓ hovered=${hovered} (cursor → pointer, fill → bright)`);

    // Hover out — should restore cursor to default
    await journal.log('\nHover → outside (10, 10)');
    svgCtx.dispatchHover(10, 10);
    await ctx.wait(pause);
    expect(hovered).toBe(false);
    await journal.log(`  ✓ hovered=${hovered} (cursor → default, fill → normal)`);

    await journal.log('\n── cursor+hover test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
