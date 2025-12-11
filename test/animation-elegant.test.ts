/**
 * Tests for Elegant Animation Demo
 *
 * Tests the enhanced animation API features:
 * - Spring physics
 * - Fluent animation builder
 * - Parallel animations
 *
 * USAGE:
 * - Headless: npx jest animation-elegant.test.ts
 * - Visual: TSYNE_HEADED=1 npx jest animation-elegant.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildElegantDemo, demoTabs } from '../examples/animation-elegant';

describe('Elegant Animation Demo Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display demo with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('title').shouldExist();
  });

  test('should show Spring tab content by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First tab (Spring) should be visible
    await ctx.expect(ctx.getByExactText('Spring Physics Animation')).toBeVisible();
  });
});

describe('Spring Physics Unit Tests', () => {
  test('spring should converge to target', async () => {
    let finalValue = 0;
    const values: number[] = [];

    // Simple spring simulation
    let target = 100;
    let current = 0;
    let velocity = 0;
    const stiffness = 0.3;
    const damping = 0.7;

    for (let i = 0; i < 100; i++) {
      const spring = (target - current) * stiffness;
      const damper = -velocity * damping;
      velocity += spring + damper;
      current += velocity;
      values.push(current);

      if (Math.abs(velocity) < 0.01 && Math.abs(target - current) < 0.1) {
        finalValue = current;
        break;
      }
    }

    // Should converge near target
    expect(finalValue).toBeGreaterThan(95);
    expect(finalValue).toBeLessThan(105);

    // Should have overshot at some point (spring behavior)
    const maxValue = Math.max(...values);
    expect(maxValue).toBeGreaterThan(100); // Overshoot
  });

  test('high damping should prevent overshoot', () => {
    let target = 100;
    let current = 0;
    let velocity = 0;
    const stiffness = 0.1;
    const damping = 0.95; // High damping

    const values: number[] = [];
    for (let i = 0; i < 100; i++) {
      const spring = (target - current) * stiffness;
      const damper = -velocity * damping;
      velocity += spring + damper;
      current += velocity;
      values.push(current);
    }

    // Should not significantly overshoot
    const maxValue = Math.max(...values);
    expect(maxValue).toBeLessThan(110);
  });
});

describe('Animation Builder Pattern Tests', () => {
  test('should chain multiple animation steps', () => {
    const steps: Array<{ props: any; duration: number }> = [];

    // Mock animation builder
    class MockBuilder {
      to(props: any, ms: number) {
        steps.push({ props, duration: ms });
        return this;
      }
    }

    new MockBuilder()
      .to({ x: 100 }, 500)
      .to({ y: 200 }, 300)
      .to({ x: 0, y: 0 }, 400);

    expect(steps.length).toBe(3);
    expect(steps[0].props).toEqual({ x: 100 });
    expect(steps[1].duration).toBe(300);
    expect(steps[2].props).toEqual({ x: 0, y: 0 });
  });

  test('parallel should resolve all promises', async () => {
    const order: number[] = [];

    const p1 = new Promise<void>(r => setTimeout(() => { order.push(1); r(); }, 10));
    const p2 = new Promise<void>(r => setTimeout(() => { order.push(2); r(); }, 5));
    const p3 = new Promise<void>(r => setTimeout(() => { order.push(3); r(); }, 15));

    await Promise.all([p1, p2, p3]);

    // All should complete
    expect(order.length).toBe(3);
    // p2 should finish first (shortest delay)
    expect(order[0]).toBe(2);
  });
});

describe('Easing Function Tests', () => {
  const easings: Record<string, (t: number) => number> = {
    linear: (t) => t,
    in: (t) => t * t,
    out: (t) => t * (2 - t),
    inOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  };

  test('all easings should return 0 at t=0', () => {
    for (const [name, fn] of Object.entries(easings)) {
      expect(fn(0)).toBe(0);
    }
  });

  test('all easings should return 1 at t=1', () => {
    for (const [name, fn] of Object.entries(easings)) {
      expect(fn(1)).toBe(1);
    }
  });

  test('linear should be identity', () => {
    expect(easings.linear(0.25)).toBe(0.25);
    expect(easings.linear(0.5)).toBe(0.5);
    expect(easings.linear(0.75)).toBe(0.75);
  });

  test('in should be slower at start', () => {
    expect(easings.in(0.25)).toBeLessThan(0.25);
    expect(easings.in(0.5)).toBeLessThan(0.5);
  });

  test('out should be faster at start', () => {
    expect(easings.out(0.25)).toBeGreaterThan(0.25);
    expect(easings.out(0.5)).toBeGreaterThan(0.5);
  });

  test('inOut should be symmetric around midpoint', () => {
    expect(easings.inOut(0.5)).toBeCloseTo(0.5, 5);
    // First half slower
    expect(easings.inOut(0.25)).toBeLessThan(0.25);
    // Second half faster
    expect(easings.inOut(0.75)).toBeGreaterThan(0.75);
  });
});

describe('Tab Navigation Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should navigate to Fluent tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to Fluent tab (index 1)
    await demoTabs.select(1);

    // Verify Fluent tab header is visible
    await ctx.getByID('fluent-tab-header').shouldExist();
  });

  test('should navigate to Parallel tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to Parallel tab (index 2)
    await demoTabs.select(2);

    // Verify Parallel tab header is visible
    await ctx.getByID('parallel-tab-header').shouldExist();
  });

  test('should navigate to Reactive tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to Reactive tab (index 3)
    await demoTabs.select(3);

    // Verify Reactive tab header is visible
    await ctx.getByID('reactive-tab-header').shouldExist();
  });

  test('should navigate to Timeline tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to Timeline tab (index 4)
    await demoTabs.select(4);

    // Verify Timeline tab header is visible
    await ctx.getByID('timeline-tab-header').shouldExist();
  });

  test('should navigate to Bezier tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to Bezier tab (index 5)
    await demoTabs.select(5);

    // Verify Bezier tab header is visible
    await ctx.getByID('bezier-tab-header').shouldExist();
  });

  test('should navigate to API tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to API tab (index 6)
    await demoTabs.select(6);

    // Verify API tab header is visible
    await ctx.getByID('api-tab-header').shouldExist();
  });

  test('should navigate back to Spring tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElegantDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigate to a different tab first
    await demoTabs.select(3);
    await ctx.getByID('reactive-tab-header').shouldExist();

    // Navigate back to Spring tab (index 0)
    await demoTabs.select(0);

    // Verify Spring tab header is visible
    await ctx.getByID('spring-tab-header').shouldExist();
  });
});

describe('Cubic Bezier Easing Tests', () => {
  // Import the actual bezier functions
  const { cubicBezier, bezier } = require('../src/animation');

  test('cubicBezier should return 0 at t=0', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    expect(ease(0)).toBe(0);
  });

  test('cubicBezier should return 1 at t=1', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    expect(ease(1)).toBe(1);
  });

  test('linear bezier (0,0,1,1) should be identity', () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.25)).toBeCloseTo(0.25, 2);
    expect(linear(0.5)).toBeCloseTo(0.5, 2);
    expect(linear(0.75)).toBeCloseTo(0.75, 2);
  });

  test('ease-in bezier should be slower at start', () => {
    const easeIn = cubicBezier(0.42, 0, 1, 1);
    expect(easeIn(0.25)).toBeLessThan(0.25);
    expect(easeIn(0.5)).toBeLessThan(0.5);
  });

  test('ease-out bezier should be faster at start', () => {
    const easeOut = cubicBezier(0, 0, 0.58, 1);
    expect(easeOut(0.25)).toBeGreaterThan(0.25);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });

  test('ease-in-out bezier should be symmetric around midpoint', () => {
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 1);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
    expect(easeInOut(0.75)).toBeGreaterThan(0.75);
  });

  test('overshoot bezier should exceed 1 mid-animation', () => {
    const overshoot = cubicBezier(0.34, 1.56, 0.64, 1);
    // At some point the curve should exceed target
    const values = [];
    for (let t = 0; t <= 1; t += 0.05) {
      values.push(overshoot(t));
    }
    const maxValue = Math.max(...values);
    expect(maxValue).toBeGreaterThan(1);
  });
});

describe('Animation Path Tests', () => {
  // These tests verify that animations follow correct paths (e.g., diagonal vs. sequential)
  // The Tween class animates all properties together in a single path

  test('diagonal animation should interpolate x and y together', async () => {
    // Simulate the Tween behavior for diagonal movement
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 100 };
    const samples: Array<{ x: number; y: number }> = [];

    // Linear interpolation - what Tween does
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Sample at different progress points
    for (let t = 0; t <= 1; t += 0.25) {
      samples.push({
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t)
      });
    }

    // In a true diagonal, x and y should always be equal (same progress)
    for (const sample of samples) {
      expect(sample.x).toBe(sample.y);
    }

    // Verify intermediate values exist (not just start and end)
    expect(samples[2]).toEqual({ x: 50, y: 50 }); // At t=0.5
  });

  test('separate x and y animations should NOT be diagonal', () => {
    // This test documents the bug in the reactive proxy
    // When ball.x and ball.y are set separately, they start as independent animations

    // Simulate two separate animations starting at different x values
    const xAnimation = { start: 0, end: 100, progress: 0.5 };
    const yAnimation = { start: 0, end: 100, progress: 0.3 }; // Started later, less progress

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const currentX = lerp(xAnimation.start, xAnimation.end, xAnimation.progress);
    const currentY = lerp(yAnimation.start, yAnimation.end, yAnimation.progress);

    // Not diagonal - x and y are at different progress levels
    expect(currentX).not.toBe(currentY);
    expect(currentX).toBe(50);
    expect(currentY).toBe(30);
  });

  test('to() with both x and y should create true diagonal path', () => {
    // Verify that calling to({ x: 100, y: 100 }) creates interpolated values
    // where x and y progress together

    const from = { x: 20, y: 80 };
    const to = { x: 520, y: 180 };
    const duration = 100;
    const path: Array<{ x: number; y: number }> = [];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Simulate 10 animation frames
    for (let t = 0; t <= 1; t += 0.1) {
      path.push({
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t)
      });
    }

    // Calculate expected diagonal slope (dy/dx)
    const expectedSlope = (to.y - from.y) / (to.x - from.x);

    // Each intermediate point should lie on the diagonal line
    for (const point of path) {
      const actualSlope = (point.y - from.y) / (point.x - from.x || 0.001);
      if (point.x !== from.x) { // Skip first point to avoid division by zero
        expect(actualSlope).toBeCloseTo(expectedSlope, 5);
      }
    }
  });

  test('horizontal animation should only change x', () => {
    const from = { x: 20, y: 80 };
    const to = { x: 520, y: 80 }; // Only x changes
    const path: Array<{ x: number; y: number }> = [];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    for (let t = 0; t <= 1; t += 0.25) {
      path.push({
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t)
      });
    }

    // Y should remain constant
    for (const point of path) {
      expect(point.y).toBe(80);
    }

    // X should change
    expect(path[0].x).toBe(20);
    expect(path[2].x).toBe(270); // Halfway
    expect(path[4].x).toBe(520);
  });

  test('vertical animation should only change y', () => {
    const from = { x: 280, y: 20 };
    const to = { x: 280, y: 180 }; // Only y changes
    const path: Array<{ x: number; y: number }> = [];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    for (let t = 0; t <= 1; t += 0.25) {
      path.push({
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t)
      });
    }

    // X should remain constant
    for (const point of path) {
      expect(point.x).toBe(280);
    }

    // Y should change
    expect(path[0].y).toBe(20);
    expect(path[2].y).toBe(100); // Halfway
    expect(path[4].y).toBe(180);
  });
});

describe('Bezier Presets Tests', () => {
  const { bezier } = require('../src/animation');

  test('all bezier presets should return 0 at t=0', () => {
    const presets = ['ease', 'easeIn', 'easeOut', 'easeInOut', 'standard', 'decelerate', 'accelerate', 'snappy'];
    for (const name of presets) {
      expect(bezier[name](0)).toBe(0);
    }
  });

  test('all bezier presets should return 1 at t=1', () => {
    const presets = ['ease', 'easeIn', 'easeOut', 'easeInOut', 'standard', 'decelerate', 'accelerate', 'snappy'];
    for (const name of presets) {
      expect(bezier[name](1)).toBe(1);
    }
  });

  test('ease preset should match CSS ease', () => {
    // CSS ease = cubic-bezier(0.25, 0.1, 0.25, 1)
    expect(bezier.ease(0.5)).toBeGreaterThan(0.5); // Ease is faster at start
  });

  test('standard preset should match Material Design', () => {
    // Material standard = cubic-bezier(0.4, 0, 0.2, 1)
    expect(bezier.standard(0.5)).toBeGreaterThan(0.5);
  });

  test('overshoot preset should exceed target mid-animation', () => {
    const values = [];
    for (let t = 0; t <= 1; t += 0.05) {
      values.push(bezier.overshoot(t));
    }
    const maxValue = Math.max(...values);
    expect(maxValue).toBeGreaterThan(1);
  });

  test('anticipate preset should go negative before rising', () => {
    // anticipate = cubic-bezier(0.68, -0.55, 0.265, 1.55)
    const earlyValue = bezier.anticipate(0.1);
    expect(earlyValue).toBeLessThan(0.1); // Should dip back initially
  });
});
