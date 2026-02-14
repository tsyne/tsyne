/**
 * Tests for SVG hover events using CosyneTest integration
 *
 * Test 1: Renders three overlapping circles (Venn diagram style) with onHover
 *   handlers set via the options-object pattern. Hovering brightens the circle.
 * Test 2: Verifies onHover and onClick work together via options on a simple rect.
 *
 * Run with SLOWER_TESTS=1 to add pauses between interactions for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-hover.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext, CvgEvent, CvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG hover events', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('dispatches onHover via options object on overlapping circles', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    // Track hover state per circle
    const hoverState: Record<string, boolean> = { red: false, green: false, blue: false };
    const events: CvgEvent[] = [];

    // Capture CvgElement refs so we can change their fill on hover
    let redEl: CvgElement, blueEl: CvgElement, greenEl: CvgElement;

    // Hover handlers: brighten on hover-in, restore on hover-out
    function makeHoverHandler(name: string, el: () => CvgElement, normal: string, bright: string) {
      return (hovered: boolean) => {
        hoverState[name] = hovered;
        el().fill(hovered ? bright : normal);
      };
    }

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Hover Test', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
              s.g({ style: 'fill-opacity:0.7;' }, () => {
                redEl = s.circle({
                  cx: '6.5cm', cy: '2cm', r: 100,
                  style: 'fill:red; stroke:black; stroke-width:0.1cm',
                  transform: 'translate(0,50)',
                  onHover: makeHoverHandler('red', () => redEl, '#cc0000', '#ff6666'),
                }).name('red');

                blueEl = s.circle({
                  cx: '6.5cm', cy: '2cm', r: 100,
                  style: 'fill:blue; stroke:black; stroke-width:0.1cm',
                  transform: 'translate(70,150)',
                  onHover: makeHoverHandler('blue', () => blueEl, '#0000cc', '#6666ff'),
                }).name('blue');

                greenEl = s.circle({
                  cx: '6.5cm', cy: '2cm', r: 100,
                  style: 'fill:green; stroke:black; stroke-width:0.1cm',
                  transform: 'translate(-70,150)',
                  onHover: makeHoverHandler('green', () => greenEl, '#008800', '#66ff66'),
                }).name('green');
              });
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 480, y: 50 });
      // Register event collector AFTER journal.monitor() so it wraps the callback
      const prevCb = (svgCtx as any).eventCallback;
      svgCtx.onEvent((e) => { prevCb?.(e); events.push(e); });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Log actual bounds to journal
    const rb = redEl!.getBounds()!;
    const bb = blueEl!.getBounds()!;
    const gb = greenEl!.getBounds()!;
    await journal.log(`Red   bounds: x=${rb.x.toFixed(0)} y=${rb.y.toFixed(0)} w=${rb.width.toFixed(0)}`);
    await journal.log(`Blue  bounds: x=${bb.x.toFixed(0)} y=${bb.y.toFixed(0)} w=${bb.width.toFixed(0)}`);
    await journal.log(`Green bounds: x=${gb.x.toFixed(0)} y=${gb.y.toFixed(0)} w=${gb.width.toFixed(0)}`);

    // ─── Hover green (topmost / last rendered) ───
    const greenCx = gb.x + gb.width / 2;
    const greenCy = gb.y + gb.height / 2;
    await journal.log(`\nHover → green center (${greenCx.toFixed(0)}, ${greenCy.toFixed(0)})`);
    svgCtx.dispatchHover(greenCx, greenCy);
    await ctx.wait(pause);

    expect(hoverState.green).toBe(true);
    expect(hoverState.red).toBe(false);
    expect(hoverState.blue).toBe(false);
    await journal.log(`  ✓ green=${hoverState.green} (brightened)`);

    // ─── Move outside all circles ───
    const outsideX = Math.min(rb.x, bb.x, gb.x) - 100;
    const outsideY = Math.min(rb.y, bb.y, gb.y) - 100;
    await journal.log(`\nHover → outside (${outsideX.toFixed(0)}, ${outsideY.toFixed(0)})`);
    svgCtx.dispatchHover(outsideX, outsideY);
    await ctx.wait(pause);

    expect(hoverState.green).toBe(false);
    await journal.log(`  ✓ green=${hoverState.green} (restored)`);

    // ─── Check journal events ───
    const hoverInEvents = events.filter(e => e.type === 'hover-in');
    const hoverOutEvents = events.filter(e => e.type === 'hover-out');
    expect(hoverInEvents.length).toBeGreaterThanOrEqual(1);
    expect(hoverOutEvents.length).toBeGreaterThanOrEqual(1);
    await journal.log(`\nEvents: ${hoverInEvents.length} hover-in, ${hoverOutEvents.length} hover-out`);

    // ─── Hover green → then move to red's top-left corner ───
    await journal.log(`\nHover → green again`);
    svgCtx.dispatchHover(greenCx, greenCy);
    await ctx.wait(pause);
    expect(hoverState.green).toBe(true);

    const testX = rb.x + 5;
    const testY = rb.y + 5;
    await journal.log(`Hover → red edge (${testX.toFixed(0)}, ${testY.toFixed(0)})`);
    svgCtx.dispatchHover(testX, testY);
    await ctx.wait(pause);

    // Green should have lost hover
    expect(hoverState.green).toBe(false);
    const someoneHovered = hoverState.red || hoverState.green || hoverState.blue;
    expect(someoneHovered).toBe(true);
    await journal.log(`  ✓ red=${hoverState.red}, green=${hoverState.green}, blue=${hoverState.blue}`);

    // ─── Move outside to restore all ───
    await journal.log(`\nHover → outside (clear all)`);
    svgCtx.dispatchHover(outsideX, outsideY);
    await ctx.wait(pause);
    await journal.log(`  ✓ all restored`);

    await journal.log('\n── All circle hover tests passed ──');
    await ctx.captureScreenshot('svg-hover-circles.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onHover and onClick work together via options', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let hovered = false;
    let clicked = false;
    let rectEl: CvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Hover+Click Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              rectEl = s.rect({
                x: '50', y: '50', width: '200', height: '200',
                fill: 'cornflowerblue',
                onClick: () => {
                  clicked = true;
                  rectEl.fill('#ff8800'); // flash orange on click
                },
                onHover: (h) => {
                  hovered = h;
                  rectEl.fill(h ? '#88bbff' : 'cornflowerblue'); // lighten on hover
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

    await journal.log('Hover → into rect (150, 150)');
    svgCtx.dispatchHover(150, 150);
    await ctx.wait(pause);
    expect(hovered).toBe(true);
    expect(clicked).toBe(false);
    await journal.log(`  ✓ hovered=${hovered} (lightened), clicked=${clicked}`);

    await journal.log('\nClick rect');
    svgCtx.dispatchTap(150, 150);
    await ctx.wait(pause);
    expect(clicked).toBe(true);
    expect(hovered).toBe(true);
    await journal.log(`  ✓ hovered=${hovered}, clicked=${clicked} (flashed orange)`);

    await journal.log('\nHover → outside (10, 10)');
    svgCtx.dispatchHover(10, 10);
    await ctx.wait(pause);
    expect(hovered).toBe(false);
    await journal.log(`  ✓ hovered=${hovered} (restored to cornflowerblue)`);

    await journal.log('\n── All hover+click tests passed ──');
    await ctx.captureScreenshot('svg-hover-click.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
