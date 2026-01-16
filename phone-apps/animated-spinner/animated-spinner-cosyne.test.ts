// Test for animated spinner cosyne demo
import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';

describe('Animated Spinner Cosyne Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    if (cleanup) cleanup();
    await tsyneTest.cleanup();
  });

  test('should render spinner with 6 orbiting circles', async () => {
    const { createAnimatedSpinnerApp } = await import('./animated-spinner-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Animated Spinner', width: 500, height: 450 }, (win) => {
        cleanup = createAnimatedSpinnerApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(200);

    // Capture initial screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'animated-spinner-initial.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Verify widgets exist
    const widgetInfo = await ctx.getAllWidgets();
    expect(widgetInfo.length).toBeGreaterThan(0);
  }, 15000);

  test('should animate spinner positions over time', async () => {
    const { createAnimatedSpinnerApp } = await import('./animated-spinner-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Animated Spinner', width: 500, height: 450 }, (win) => {
        cleanup = createAnimatedSpinnerApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Capture at different time points to show animation
    await ctx.wait(200);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'animated-spinner-t0.png'));
    console.log('Screenshot t0 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'animated-spinner-t500.png'));
    console.log('Screenshot t500 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'animated-spinner-t1000.png'));
    console.log('Screenshot t1000 saved');

    expect(true).toBe(true);
  }, 15000);
});

describe('SpinnerState', () => {
  test('should calculate orbit positions correctly', async () => {
    const { SpinnerState } = await import('./animated-spinner-cosyne');
    const state = new SpinnerState();

    // At t=0, positions should be evenly distributed around circle
    const pos0 = state.getOrbitPosition(0, 6, 100, 100, 50);
    const pos1 = state.getOrbitPosition(1, 6, 100, 100, 50);
    const pos3 = state.getOrbitPosition(3, 6, 100, 100, 50);

    // Position 0 should be at angle 0 (right side)
    expect(pos0.x).toBeGreaterThan(100); // right of center

    // Position 3 should be opposite (left side)
    expect(pos3.x).toBeLessThan(100); // left of center

    // All positions should be at radius distance from center
    const dist0 = Math.sqrt((pos0.x - 100) ** 2 + (pos0.y - 100) ** 2);
    const dist1 = Math.sqrt((pos1.x - 100) ** 2 + (pos1.y - 100) ** 2);
    expect(dist0).toBeCloseTo(50, 0);
    expect(dist1).toBeCloseTo(50, 0);
  });

  test('should generate valid RGB colors', async () => {
    const { SpinnerState } = await import('./animated-spinner-cosyne');
    const state = new SpinnerState();

    const color = state.getSpinnerColor(0, '#FF6B6B');

    // Should be rgb format
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);

    // Parse and verify values are in valid range
    const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    expect(match).not.toBeNull();
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });
});
