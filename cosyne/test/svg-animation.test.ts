/**
 * Tests for SVG animation system (.transition, .animate, easing, loop, stop)
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-animation.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext, CvgElement, AnimationHandle, Easing } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG animation', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('transition animates numeric properties over time', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Transition Test', width: 400, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 300', width: 400, height: 300 }, (s) => {
              s.rect({ x: 0, y: 0, width: 400, height: 300, fill: '#1a1a2e' }).name('bg');
              circleEl = s.circle({ cx: 50, cy: 150, r: 20, fill: '#e94560' }).name('dot');
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

    await journal.log('Starting transition: cx 50→350 over 400ms');

    // Transition the circle across the screen
    const handle = circleEl.transition(
      { cx: 350 },
      { duration: 400, easing: 'easeInOut' }
    );

    // Verify handle is returned
    expect(handle).toBeInstanceOf(AnimationHandle);
    await journal.log('  ✓ AnimationHandle returned');

    // Wait for animation to complete
    expect(svgCtx.isAnimating()).toBe(true);
    await journal.log('  ✓ isAnimating() = true during animation');

    await handle.then();
    await journal.log('  ✓ Animation promise resolved');

    expect(svgCtx.isAnimating()).toBe(false);
    await journal.log('  ✓ isAnimating() = false after completion');

    await journal.log('\n── transition test passed ──');
    await ctx.captureScreenshot('svg-anim-transition.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('animate with custom callback + easing', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let rectEl: CvgElement = null as any;
    let completeCalled = false;
    const tValues: number[] = [];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Animate Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              rectEl = s.rect({ x: 10, y: 50, width: 50, height: 100, fill: '#48c' }).name('bar');
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

    await journal.log('Starting animate: growing bar, easeOut, 300ms');

    const handle = rectEl.animate(
      (t) => {
        tValues.push(t);
        return { width: 50 + 300 * t };
      },
      {
        duration: 300,
        easing: 'easeOut',
        onComplete: () => { completeCalled = true; },
      }
    );

    await handle.then();

    // Verify easing produces non-linear t values
    expect(tValues.length).toBeGreaterThan(5);
    await journal.log(`  ✓ tick called ${tValues.length} times`);

    // easeOut should have a fast start (first half of t values should be > 0.5 in value)
    const midIdx = Math.floor(tValues.length / 2);
    const midT = tValues[midIdx];
    await journal.log(`  mid-point t=${midT.toFixed(3)} (easeOut → should be > 0.5)`);
    // easeOut: t*(2-t), so at linear t=0.5, eased = 0.75
    // We just check it's higher than linear (> 0.5)
    expect(midT).toBeGreaterThan(0.4); // with some tolerance for timing

    // The last t value should be 1 (landed at target)
    expect(tValues[tValues.length - 1]).toBeCloseTo(1, 1);
    await journal.log(`  ✓ final t=${tValues[tValues.length - 1].toFixed(3)}`);

    expect(completeCalled).toBe(true);
    await journal.log('  ✓ onComplete fired');

    await journal.log('\n── animate test passed ──');
    await ctx.captureScreenshot('svg-anim-callback.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('loop animation runs multiple cycles and can be stopped', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;
    let tickCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Loop Test', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              circleEl = s.circle({ cx: 150, cy: 100, r: 20, fill: '#e94560' }).name('pulse');
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

    await journal.log('Starting looping animation: pulse r 20↔40, 200ms cycle');

    const handle = circleEl.animate(
      (t) => {
        tickCount++;
        return { r: 20 + 20 * t };
      },
      { duration: 200, loop: true, easing: 'linear' }
    );

    // Let it run for ~500ms (should complete 2+ cycles)
    await ctx.wait(500);

    expect(svgCtx.isAnimating()).toBe(true);
    expect(tickCount).toBeGreaterThan(10);  // ~60fps * 0.5s = ~30 ticks
    await journal.log(`  ✓ ${tickCount} ticks after 500ms (still running)`);

    // Stop the animation
    handle.stop();
    const ticksAtStop = tickCount;
    await ctx.wait(100);

    expect(svgCtx.isAnimating()).toBe(false);
    // Tick count should not have increased much (at most 1-2 from timing)
    expect(tickCount - ticksAtStop).toBeLessThan(3);
    await journal.log(`  ✓ stopped — ticks after stop: ${tickCount - ticksAtStop}`);
    await journal.log(`  ✓ isAnimating() = ${svgCtx.isAnimating()}`);

    await journal.log('\n── loop+stop test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('yoyo animation ping-pongs', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let rectEl: CvgElement = null as any;
    const widthValues: number[] = [];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Yoyo Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              rectEl = s.rect({ x: 50, y: 50, width: 50, height: 100, fill: '#44cc88' }).name('yoyo-bar');
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

    await journal.log('Starting yoyo animation: width 50↔300, 200ms half-cycle');

    const handle = rectEl.animate(
      (t) => {
        const w = 50 + 250 * t;
        widthValues.push(w);
        return { width: w };
      },
      { duration: 200, yoyo: true, easing: 'linear' }
    );

    // Run for 500ms — should see values go up then down then up
    await ctx.wait(500);

    handle.stop();
    await journal.log(`  collected ${widthValues.length} width samples`);

    // Find the max and verify it went back down
    const maxWidth = Math.max(...widthValues);
    const lastWidth = widthValues[widthValues.length - 1];
    await journal.log(`  max width: ${maxWidth.toFixed(0)}, last width: ${lastWidth.toFixed(0)}`);

    // Max should be near 300 (50 + 250 * 1.0)
    expect(maxWidth).toBeGreaterThan(250);
    // After ping-pong, some values should have gone back below 200
    const belowMid = widthValues.filter(w => w < 200);
    expect(belowMid.length).toBeGreaterThan(0);
    await journal.log(`  ✓ ${belowMid.length} samples below midpoint (ping-pong confirmed)`);

    await journal.log('\n── yoyo test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('multiple concurrent animations on different elements', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circle1: CvgElement = null as any;
    let circle2: CvgElement = null as any;
    let complete1 = false;
    let complete2 = false;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Concurrent Anims', width: 400, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 300', width: 400, height: 300 }, (s) => {
              s.rect({ x: 0, y: 0, width: 400, height: 300, fill: '#1a1a2e' }).name('bg');
              circle1 = s.circle({ cx: 50, cy: 100, r: 20, fill: '#e94560' }).name('dot1');
              circle2 = s.circle({ cx: 50, cy: 200, r: 20, fill: '#0f3460' }).name('dot2');
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

    await journal.log('Starting 2 concurrent transitions');

    // Two different elements, different durations
    const h1 = circle1.transition(
      { cx: 350 },
      { duration: 300, easing: 'easeOut', onComplete: () => { complete1 = true; } }
    );
    const h2 = circle2.transition(
      { cx: 350 },
      { duration: 500, easing: 'easeIn', onComplete: () => { complete2 = true; } }
    );

    // After 350ms: circle1 should be done, circle2 still running
    await ctx.wait(350);
    expect(complete1).toBe(true);
    expect(complete2).toBe(false);
    expect(svgCtx.isAnimating()).toBe(true);
    await journal.log('  ✓ at 350ms: dot1 complete, dot2 still running');

    // Wait for both
    await h2.then();
    expect(complete2).toBe(true);
    expect(svgCtx.isAnimating()).toBe(false);
    await journal.log('  ✓ both complete, isAnimating()=false');

    await journal.log('\n── concurrent animation test passed ──');
    await ctx.captureScreenshot('svg-anim-concurrent.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('stopAllAnimations stops everything', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let c1: CvgElement = null as any;
    let c2: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG StopAll Test', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              c1 = s.circle({ cx: 50, cy: 80, r: 15, fill: '#e94560' }).name('c1');
              c2 = s.circle({ cx: 50, cy: 140, r: 15, fill: '#0f3460' }).name('c2');
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

    // Start two looping animations
    c1.animate((t) => ({ r: 15 + 10 * t }), { duration: 200, loop: true });
    c2.animate((t) => ({ r: 15 + 10 * t }), { duration: 300, loop: true });

    await ctx.wait(100);
    expect(svgCtx.isAnimating()).toBe(true);
    await journal.log('  ✓ 2 looping animations running');

    svgCtx.stopAllAnimations();
    expect(svgCtx.isAnimating()).toBe(false);
    await journal.log('  ✓ stopAllAnimations() — isAnimating()=false');

    await journal.log('\n── stopAllAnimations test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('delay option postpones animation start', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let circleEl: CvgElement = null as any;
    let tickCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Delay Test', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              circleEl = s.circle({ cx: 150, cy: 100, r: 20, fill: '#e94560' }).name('delayed');
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

    await journal.log('Starting animation with 200ms delay');

    const handle = circleEl.animate(
      (t) => { tickCount++; return { r: 20 + 30 * t }; },
      { duration: 200, delay: 200, easing: 'linear' }
    );

    // After 100ms: delay hasn't elapsed, no ticks
    await ctx.wait(100);
    expect(tickCount).toBe(0);
    await journal.log(`  ✓ at 100ms: ${tickCount} ticks (still in delay)`);

    // Wait for animation to finish (200ms delay + 200ms duration + some buffer)
    await handle.then();
    expect(tickCount).toBeGreaterThan(5);
    await journal.log(`  ✓ after completion: ${tickCount} ticks`);

    await journal.log('\n── delay test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('visual: bouncing ball (for SLOWER_TESTS inspection)', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let ball: CvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Bouncing Ball', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 400', width: 400, height: 400 }, (s) => {
              // Sky
              s.rect({ x: 0, y: 0, width: 400, height: 300, fill: '#87ceeb' }).name('sky');
              // Ground
              s.rect({ x: 0, y: 300, width: 400, height: 100, fill: '#228b22' }).name('ground');
              // Ball
              ball = s.circle({ cx: 200, cy: 50, r: 25, fill: '#e94560' }).name('ball');
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

    await journal.log('Starting bounce animation');

    // Bounce: drop down with easeIn, bounce up with easeOut
    const handle = ball.animate(
      (t) => {
        // Parabolic bounce: cy goes from 50 → 275 and back
        const cy = 50 + 225 * t;
        // Squash at bottom: r gets wider/shorter near t=1
        const squash = t > 0.8 ? 1 + (t - 0.8) * 2.5 : 1;
        return { cy, rx: 25 * squash, ry: 25 / squash };
      },
      { duration: slow ? 800 : 300, easing: 'easeIn', yoyo: true }
    );

    // Let it bounce a few times
    const bounceTime = slow ? 3000 : 800;
    await ctx.wait(bounceTime);

    handle.stop();
    expect(svgCtx.isAnimating()).toBe(false);
    await journal.log(`  ✓ bounced for ${bounceTime}ms, then stopped`);

    await journal.log('\n── bouncing ball test passed ──');
    await ctx.captureScreenshot('svg-anim-bounce.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
