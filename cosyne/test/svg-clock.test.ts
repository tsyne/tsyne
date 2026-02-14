/**
 * Tests for the declarative cosyne-svg analog clock.
 *
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-clock.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, TestJournal, CvgContext, CvgElement } from '../src';
import { createClock, handLine, RADIUS, CENTER, SIZE } from '../demos/svg-clock';

const slow = process.env.SLOWER_TESTS === '1';

describe('SVG clock', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) await cosyneTest.cleanup();
  });

  it('declarative analog clock with poll()', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let now = () => new Date();

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Clock', width: 250, height: 250, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = createClock(a, () => now(), { width: 250, height: 250 });
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 330, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    const hourEl = (svgCtx as any).trackedElements.find((el: CvgElement) => el.getName() === 'hour')!;
    const minEl = (svgCtx as any).trackedElements.find((el: CvgElement) => el.getName() === 'minute')!;
    const secEl = (svgCtx as any).trackedElements.find((el: CvgElement) => el.getName() === 'second')!;

    // ── Inject 12:00:00 — all hands point straight up ──
    now = () => new Date(2026, 0, 1, 12, 0, 0);
    await svgCtx.refresh();
    await ctx.wait(100);

    const noonHour = handLine(0, RADIUS * 0.5);
    expect(hourEl.getSvgAttr('x2')).toBeCloseTo(noonHour.x2, 0);
    expect(hourEl.getSvgAttr('y2')).toBeCloseTo(noonHour.y2, 0);
    expect(minEl.getSvgAttr('x2')).toBeCloseTo(CENTER, 0);
    expect(secEl.getSvgAttr('x2')).toBeCloseTo(CENTER, 0);
    await journal.log('12:00:00 — all hands at 12');

    // ── Inject 3:30:45 ──
    now = () => new Date(2026, 0, 1, 3, 30, 45);
    await svgCtx.refresh();
    await ctx.wait(100);

    const h330 = handLine((3 + 30 / 60) / 12, RADIUS * 0.5);
    expect(hourEl.getSvgAttr('x2')).toBeCloseTo(h330.x2, 0);

    const m330 = handLine((30 + 45 / 60) / 60, RADIUS * 0.75);
    expect(minEl.getSvgAttr('x2')).toBeCloseTo(m330.x2, 0);

    const s330 = handLine(45 / 60, RADIUS * 0.85);
    expect(secEl.getSvgAttr('x2')).toBeCloseTo(s330.x2, 0);
    await journal.log('3:30:45 — hands at correct positions');

    svgCtx.stopPolling();
    await journal.log('\n── clock test passed ──');
    await ctx.captureScreenshot('svg-clock.png');
    await ctx.wait(slow ? 3000 : 100);
  }, slow ? 30000 : 10000);

  it('resize remaps all elements to new canvas dimensions', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    // Fixed at 12:00:00 for deterministic bounds
    const noon = () => new Date(2026, 0, 1, 12, 0, 0);

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Clock Resize', width: 250, height: 250, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = createClock(a, noon, { width: 200, height: 200 });
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 330, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Find the face circle and hour hand
    const faceEl = (svgCtx as any).trackedElements.find((el: CvgElement) => {
      // Face circle: r=90 (the big one)
      return el.getSvgAttr('r') === RADIUS;
    })!;
    const hourEl = (svgCtx as any).trackedElements.find((el: CvgElement) => el.getName() === 'hour')!;

    // ── At 200x200 canvas, viewBox 200x200 → scale=1, offset=0 ──
    const m1 = svgCtx.getMapping();
    expect(m1.scale).toBeCloseTo(1, 2);
    expect(m1.offsetX).toBeCloseTo(0, 2);
    await journal.log(`Initial: scale=${m1.scale.toFixed(2)}, offset=(${m1.offsetX.toFixed(0)}, ${m1.offsetY.toFixed(0)})`);

    // Face bounds at scale=1: cx=100, cy=100, r=90 → bounds (10, 10, 180, 180)
    const fb1 = faceEl.getBounds()!;
    expect(fb1.x).toBeCloseTo(10, 0);
    expect(fb1.width).toBeCloseTo(180, 0);
    await journal.log(`Face bounds: (${fb1.x.toFixed(0)}, ${fb1.y.toFixed(0)}, ${fb1.width.toFixed(0)}x${fb1.height.toFixed(0)})`);

    // ── Resize to 400x400 → scale=2 ──
    svgCtx.resize(400, 400);
    await ctx.wait(100);

    const m2 = svgCtx.getMapping();
    expect(m2.scale).toBeCloseTo(2, 2);
    expect(m2.offsetX).toBeCloseTo(0, 2);
    await journal.log(`\nAfter resize(400,400): scale=${m2.scale.toFixed(2)}`);

    // Face bounds at scale=2: cx=200, cy=200, r=180 → bounds (20, 20, 360, 360)
    const fb2 = faceEl.getBounds()!;
    expect(fb2.x).toBeCloseTo(20, 0);
    expect(fb2.width).toBeCloseTo(360, 0);
    await journal.log(`Face bounds: (${fb2.x.toFixed(0)}, ${fb2.y.toFixed(0)}, ${fb2.width.toFixed(0)}x${fb2.height.toFixed(0)})`);

    // Hour hand SVG attrs unchanged (still in viewBox units)
    expect(hourEl.getSvgAttr('x1')).toBeCloseTo(CENTER, 0);
    // But canvas bounds doubled
    const hb2 = hourEl.getBounds()!;
    await journal.log(`Hour hand bounds: y=${hb2.y.toFixed(0)} (was ${(hb2.y / 2).toFixed(0)} at scale=1)`);

    // ── Resize to 600x300 (rectangular) → scale by shorter axis, centered ──
    svgCtx.resize(600, 300);
    await ctx.wait(100);

    const m3 = svgCtx.getMapping();
    // scale = min(600/200, 300/200) = 1.5
    expect(m3.scale).toBeCloseTo(1.5, 2);
    // Horizontal offset: (600 - 200*1.5) / 2 = 150
    expect(m3.offsetX).toBeCloseTo(150, 0);
    expect(m3.offsetY).toBeCloseTo(0, 0);
    await journal.log(`\nAfter resize(600,300): scale=${m3.scale.toFixed(2)}, offsetX=${m3.offsetX.toFixed(0)}`);

    // Face: cx=100*1.5+150=300, cy=100*1.5=150, r=90*1.5=135
    const fb3 = faceEl.getBounds()!;
    expect(fb3.x).toBeCloseTo(300 - 135, 0);  // 165
    expect(fb3.y).toBeCloseTo(150 - 135, 0);   // 15
    expect(fb3.width).toBeCloseTo(270, 0);
    await journal.log(`Face bounds: (${fb3.x.toFixed(0)}, ${fb3.y.toFixed(0)}, ${fb3.width.toFixed(0)}x${fb3.height.toFixed(0)})`);

    svgCtx.stopPolling();
    await journal.log('\n── resize test passed ──');
    await ctx.captureScreenshot('svg-clock-resize.png');
    await ctx.wait(slow ? 3000 : 100);
  }, slow ? 30000 : 10000);
});
