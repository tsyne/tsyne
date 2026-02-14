/**
 * Tests for SVG-semantic coordinate translation (updateSvgProps).
 *
 * Verifies that SVG-level properties (cx, cy, r for circles; x, y, width, height for rects;
 * x1, y1, x2, y2 for lines) are correctly translated to canvas pixel coordinates via the
 * stored viewBox mapping. Also tests that bindPos, transition, and animate work with SVG props.
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-semantic-update.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext, CvgElement, AnimationHandle } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG semantic updates', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('circle bindPos updates cx/cy/r with correct coordinate translation', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;

    // Reactive state in SVG viewBox units (0-100)
    let cx = 25, cy = 50, r = 10;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Circle SVG Update', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            // ViewBox 0-100 maps to 400px canvas → 4x scale
            svgCtx = cvg(a, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 100, height: 100, fill: '#f0f0f0' }).name('bg');

              circleEl = s.circle({ cx, cy, r, fill: '#cc4444' })
                .name('dot')
                .bindPos(() => ({ cx, cy, r }));

              // Move button
              s.rect({
                x: 70, y: 5, width: 25, height: 10, fill: '#4488cc',
                onClick: () => { cx = 75; cy = 25; r = 15; svgCtx.refresh(); },
              }).name('move-btn');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initial: cx=25, cy=50, r=10 in viewBox (0-100) with 400px canvas
    // Canvas coords: cx=100, cy=200, r=40 → bounds at (60, 160, 80, 80)
    await journal.log(`Initial: cx=${cx}, cy=${cy}, r=${r}`);
    const initialBounds = circleEl.getBounds()!;
    expect(initialBounds.x).toBeCloseTo(60, 0);
    expect(initialBounds.y).toBeCloseTo(160, 0);
    expect(initialBounds.width).toBeCloseTo(80, 0);
    expect(initialBounds.height).toBeCloseTo(80, 0);
    await journal.log(`  bounds: (${initialBounds.x.toFixed(0)}, ${initialBounds.y.toFixed(0)}, ${initialBounds.width.toFixed(0)}x${initialBounds.height.toFixed(0)})`);

    // Hit-test at center of initial position (canvas 100, 200) → should hit
    expect(circleEl.hitTest(100, 200)).toBe(true);
    // Hit-test at (300, 100) → should miss
    expect(circleEl.hitTest(300, 100)).toBe(false);
    await journal.log('  hit-test initial position: pass');

    // Click move button → updates to cx=75, cy=25, r=15
    await journal.log('\nClick move-btn → cx=75, cy=25, r=15');
    svgCtx.dispatchTap(330, 40);
    await ctx.wait(pause);

    // After update: cx=75→300px, cy=25→100px, r=15→60px → bounds (240, 40, 120, 120)
    const updatedBounds = circleEl.getBounds()!;
    expect(updatedBounds.x).toBeCloseTo(240, 0);
    expect(updatedBounds.y).toBeCloseTo(40, 0);
    expect(updatedBounds.width).toBeCloseTo(120, 0);
    expect(updatedBounds.height).toBeCloseTo(120, 0);
    await journal.log(`  bounds: (${updatedBounds.x.toFixed(0)}, ${updatedBounds.y.toFixed(0)}, ${updatedBounds.width.toFixed(0)}x${updatedBounds.height.toFixed(0)})`);

    // Hit-test at new center (canvas 300, 100) → should hit now
    expect(circleEl.hitTest(300, 100)).toBe(true);
    // Hit-test at old center (canvas 100, 200) → should miss now
    expect(circleEl.hitTest(100, 200)).toBe(false);
    await journal.log('  hit-test updated position: pass');

    // Verify SVG attrs are stored correctly
    expect(circleEl.getSvgAttr('cx')).toBe(75);
    expect(circleEl.getSvgAttr('cy')).toBe(25);
    expect(circleEl.getSvgAttr('r')).toBe(15);
    await journal.log('  SVG attrs stored correctly');

    await journal.log('\n── circle bindPos test passed ──');
    await ctx.captureScreenshot('svg-circle-semantic.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('rect bindPos updates x/y/width/height with correct coordinate translation', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let rectEl: CvgElement = null as any;

    // ViewBox 0-200, canvas 400px → 2x scale
    let rx = 10, ry = 10, rw = 40, rh = 30;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Rect SVG Update', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 200 200', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 200, height: 200, fill: '#eee' }).name('bg');

              rectEl = s.rect({ x: rx, y: ry, width: rw, height: rh, fill: '#44cc88' })
                .name('box')
                .bindPos(() => ({ x: rx, y: ry, width: rw, height: rh }));

              // Resize button
              s.rect({
                x: 150, y: 5, width: 40, height: 20, fill: '#4488cc',
                onClick: () => { rx = 80; ry = 60; rw = 100; rh = 80; svgCtx.refresh(); },
              }).name('resize-btn');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initial: x=10→20px, y=10→20px, w=40→80px, h=30→60px
    await journal.log(`Initial: x=${rx}, y=${ry}, w=${rw}, h=${rh}`);
    const initialBounds = rectEl.getBounds()!;
    expect(initialBounds.x).toBeCloseTo(20, 0);
    expect(initialBounds.y).toBeCloseTo(20, 0);
    expect(initialBounds.width).toBeCloseTo(80, 0);
    expect(initialBounds.height).toBeCloseTo(60, 0);
    await journal.log('  bounds correct at 2x scale');

    // Hit test at canvas (50, 40) — inside initial rect
    expect(rectEl.hitTest(50, 40)).toBe(true);

    // Click resize → x=80, y=60, w=100, h=80
    await journal.log('\nClick resize-btn');
    svgCtx.dispatchTap(340, 30);
    await ctx.wait(pause);

    // After: x=80→160px, y=60→120px, w=100→200px, h=80→160px
    const updatedBounds = rectEl.getBounds()!;
    expect(updatedBounds.x).toBeCloseTo(160, 0);
    expect(updatedBounds.y).toBeCloseTo(120, 0);
    expect(updatedBounds.width).toBeCloseTo(200, 0);
    expect(updatedBounds.height).toBeCloseTo(160, 0);
    await journal.log(`  bounds: (${updatedBounds.x.toFixed(0)}, ${updatedBounds.y.toFixed(0)}, ${updatedBounds.width.toFixed(0)}x${updatedBounds.height.toFixed(0)})`);

    // Old center (50, 40) should miss; new center (260, 200) should hit
    expect(rectEl.hitTest(50, 40)).toBe(false);
    expect(rectEl.hitTest(260, 200)).toBe(true);
    await journal.log('  hit-test updated: pass');

    await journal.log('\n── rect bindPos test passed ──');
    await ctx.captureScreenshot('svg-rect-semantic.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('line updateSvgProps updates x1/y1/x2/y2 with correct coordinate translation', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let lineEl: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Line SVG Update', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            // viewBox 0-100, canvas 400px → 4x scale
            svgCtx = cvg(a, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 100, height: 100, fill: '#f8f8f8' }).name('bg');

              lineEl = s.line({
                x1: 10, y1: 10, x2: 90, y2: 90,
                stroke: '#cc4444', 'stroke-width': 3,
              }).name('diag');
            });
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initial bounds: x1=10→40, y1=10→40, x2=90→360, y2=90→360
    await journal.log('Initial line: (10,10)→(90,90) in viewBox');
    const initialBounds = lineEl.getBounds()!;
    expect(initialBounds.x).toBeCloseTo(40, 0);
    expect(initialBounds.y).toBeCloseTo(40, 0);
    expect(initialBounds.width).toBeCloseTo(320, 0);
    expect(initialBounds.height).toBeCloseTo(320, 0);
    await journal.log('  bounds correct');

    // Update line endpoints via updateSvgProps
    lineEl.updateSvgProps({ x1: 50, y1: 10, x2: 50, y2: 90 });
    await ctx.wait(pause);

    // Vertical line at x=50 → canvas x=200
    const updatedBounds = lineEl.getBounds()!;
    expect(updatedBounds.x).toBeCloseTo(200, 0);
    expect(updatedBounds.y).toBeCloseTo(40, 0);
    expect(updatedBounds.width).toBeCloseTo(0, 0);
    expect(updatedBounds.height).toBeCloseTo(320, 0);
    await journal.log(`  updated to vertical line at x=50`);

    // Verify stored SVG attrs
    expect(lineEl.getSvgAttr('x1')).toBe(50);
    expect(lineEl.getSvgAttr('y1')).toBe(10);
    expect(lineEl.getSvgAttr('x2')).toBe(50);
    expect(lineEl.getSvgAttr('y2')).toBe(90);
    await journal.log('  SVG attrs stored correctly');

    await journal.log('\n── line updateSvgProps test passed ──');
    await ctx.captureScreenshot('svg-line-semantic.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('transition with SVG-level props on circle (cx/cy/r)', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Circle Transition', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 100, height: 100, fill: '#1a1a2e' }).name('bg');
              circleEl = s.circle({ cx: 20, cy: 50, r: 8, fill: '#e94560' }).name('dot');
            });
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Verify initial SVG attrs
    expect(circleEl.getSvgAttr('cx')).toBe(20);
    expect(circleEl.getSvgAttr('cy')).toBe(50);
    expect(circleEl.getSvgAttr('r')).toBe(8);
    await journal.log('Initial: cx=20, cy=50, r=8');

    // Transition cx from 20→80, r from 8→20 over 300ms
    const handle = circleEl.transition(
      { cx: 80, r: 20 },
      { duration: 300, easing: 'linear' }
    );
    expect(handle).toBeInstanceOf(AnimationHandle);
    await journal.log('Started transition: cx→80, r→20 over 300ms');

    // Wait for animation to complete
    await handle.then();
    await ctx.wait(50);

    // After transition, SVG attrs should be at target values
    expect(circleEl.getSvgAttr('cx')).toBeCloseTo(80, 0);
    expect(circleEl.getSvgAttr('r')).toBeCloseTo(20, 0);
    expect(circleEl.getSvgAttr('cy')).toBe(50); // unchanged
    await journal.log(`After: cx=${circleEl.getSvgAttr('cx')?.toFixed(1)}, r=${circleEl.getSvgAttr('r')?.toFixed(1)}`);

    // Verify bounds updated: cx=80→320px, r=20→80px → bounds (240, 120, 160, 160)
    const bounds = circleEl.getBounds()!;
    expect(bounds.x).toBeCloseTo(240, 0);
    expect(bounds.width).toBeCloseTo(160, 0);
    await journal.log(`  bounds: (${bounds.x.toFixed(0)}, ${bounds.y.toFixed(0)}, ${bounds.width.toFixed(0)}x${bounds.height.toFixed(0)})`);

    // Hit-test at new position
    expect(circleEl.hitTest(320, 200)).toBe(true);
    expect(circleEl.hitTest(80, 200)).toBe(false);
    await journal.log('  hit-test at new position: pass');

    await journal.log('\n── circle transition test passed ──');
    await ctx.captureScreenshot('svg-circle-transition.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('animate with SVG-level props routes through updateSvgProps', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Circle Animate', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 100, height: 100, fill: '#2d3436' }).name('bg');
              circleEl = s.circle({ cx: 50, cy: 50, r: 10, fill: '#00b894' }).name('pulsing');
            });
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log('Initial: cx=50, cy=50, r=10');

    // Animate r from 10 to 30 using callback
    let completeFired = false;
    const handle = circleEl.animate(
      (t) => ({ r: 10 + 20 * t }),
      { duration: 200, easing: 'linear', onComplete: () => { completeFired = true; } }
    );

    await handle.then();
    await ctx.wait(50);

    // After animation: r should be ~30 (in SVG units)
    expect(circleEl.getSvgAttr('r')).toBeCloseTo(30, 0);
    expect(completeFired).toBe(true);
    await journal.log(`After: r=${circleEl.getSvgAttr('r')?.toFixed(1)}`);

    // Bounds: cx=50→200px, r=30→120px → bounds (80, 80, 240, 240)
    const bounds = circleEl.getBounds()!;
    expect(bounds.x).toBeCloseTo(80, 0);
    expect(bounds.y).toBeCloseTo(80, 0);
    expect(bounds.width).toBeCloseTo(240, 0);
    await journal.log(`  bounds: (${bounds.x.toFixed(0)}, ${bounds.y.toFixed(0)}, ${bounds.width.toFixed(0)}x${bounds.height.toFixed(0)})`);

    await journal.log('\n── animate SVG props test passed ──');
    await ctx.captureScreenshot('svg-circle-animate.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('visual: draggable circle with SVG-semantic coordinates', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let dotEl: CvgElement = null as any;

    // Positions in SVG viewBox (0-200)
    let dotCx = 100, dotCy = 100;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Draggable Circle', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            // viewBox 0-200, canvas 400 → 2x scale
            svgCtx = cvg(a, { viewBox: '0 0 200 200', width: 400, height: 400 }, (s) => {
              s.rect({ x: 0, y: 0, width: 200, height: 200, fill: '#f5f5f5' }).name('bg');

              // Grid lines for reference
              for (let i = 0; i <= 200; i += 50) {
                s.line({ x1: i, y1: 0, x2: i, y2: 200, stroke: '#ddd', 'stroke-width': 0.5 });
                s.line({ x1: 0, y1: i, x2: 200, y2: i, stroke: '#ddd', 'stroke-width': 0.5 });
              }

              dotEl = s.circle({ cx: dotCx, cy: dotCy, r: 15, fill: '#e17055' })
                .name('draggable')
                .cursor('pointer')
                .bindPos(() => ({ cx: dotCx, cy: dotCy }))
                .onDrag((e) => {
                  // Convert canvas-pixel delta back to viewBox units (2x scale → divide by 2)
                  dotCx += e.deltaX / 2;
                  dotCy += e.deltaY / 2;
                  // Clamp to viewBox
                  dotCx = Math.max(15, Math.min(185, dotCx));
                  dotCy = Math.max(15, Math.min(185, dotCy));
                  svgCtx.refresh();
                });
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log('Draggable circle at center (100, 100)');

    // Simulate drag: move right 50px in canvas space = 25 in viewBox
    svgCtx.dispatchDrag(200, 200, 50, 0);
    await ctx.wait(pause);
    expect(dotCx).toBeCloseTo(125, 0);
    await journal.log(`After drag right: cx=${dotCx.toFixed(0)}, cy=${dotCy.toFixed(0)}`);

    // Drag down 100px in canvas = 50 in viewBox
    svgCtx.dispatchDrag(250, 200, 0, 100);
    await ctx.wait(pause);
    expect(dotCy).toBeCloseTo(150, 0);
    await journal.log(`After drag down: cx=${dotCx.toFixed(0)}, cy=${dotCy.toFixed(0)}`);

    svgCtx.dispatchDragEnd();

    // Verify bounds are at new position: cx=125→250px, cy=150→300px, r=15→30px
    const bounds = dotEl.getBounds()!;
    expect(bounds.x).toBeCloseTo(220, 0);
    expect(bounds.y).toBeCloseTo(270, 0);
    await journal.log(`  bounds: (${bounds.x.toFixed(0)}, ${bounds.y.toFixed(0)})`);

    await journal.log('\n── draggable circle test passed ──');
    await ctx.captureScreenshot('svg-draggable-circle.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
