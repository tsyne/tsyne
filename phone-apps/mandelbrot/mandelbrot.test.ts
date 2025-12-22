/**
 * Tests for Mandelbrot Explorer
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createMandelbrotApp } from './mandelbrot';

describe('Mandelbrot Explorer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display mandelbrot window with controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Control buttons should exist
    await ctx.getById('zoom-in').shouldExist();
    await ctx.getById('zoom-out').shouldExist();
    await ctx.getById('reset').shouldExist();
    await ctx.getById('next-palette').shouldExist();

    // Pan buttons should exist
    await ctx.getById('pan-left').shouldExist();
    await ctx.getById('pan-up').shouldExist();
    await ctx.getById('pan-down').shouldExist();
    await ctx.getById('pan-right').shouldExist();
  }, 30000);

  test('should zoom in when clicking Zoom In button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);  // Wait for initial render

    // Click zoom in
    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);

    // Status should show zoom level 2x
    const status = await ctx.getById('status');
    const text = await status.getText();
    expect(text).toContain('Zoom: 2.0x');
  }, 30000);  // 30 second timeout

  test('should zoom out when clicking Zoom Out button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Zoom in first, then out
    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);
    await ctx.getById('zoom-out').click();
    await ctx.wait(1000);

    // Should be back to 1x
    const status = await ctx.getById('status');
    const text = await status.getText();
    expect(text).toContain('Zoom: 1.0x');
  }, 30000);

  test('should cycle palettes when clicking Next Palette', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Initial palette is 'classic'
    let status = await ctx.getById('status');
    let text = await status.getText();
    expect(text).toContain('Palette: classic');

    // Click next palette
    await ctx.getById('next-palette').click();
    await ctx.wait(1000);

    // Should now show 'fire'
    status = await ctx.getById('status');
    text = await status.getText();
    expect(text).toContain('Palette: fire');
  }, 30000);

  test('should reset view when clicking Reset', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Zoom in a few times
    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);
    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);

    // Verify zoomed
    let status = await ctx.getById('status');
    let text = await status.getText();
    expect(text).toContain('Zoom: 4.0x');

    // Reset
    await ctx.getById('reset').click();
    await ctx.wait(1000);

    // Should be back to 1x
    status = await ctx.getById('status');
    text = await status.getText();
    expect(text).toContain('Zoom: 1.0x');
  }, 60000);

  test('should pan left when clicking Left button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMandelbrotApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Initial center is -0.5
    let status = await ctx.getById('status');
    let text = await status.getText();
    expect(text).toContain('Center: (-0.5000');

    // Pan left
    await ctx.getById('pan-left').click();
    await ctx.wait(1000);

    // Center X should decrease (more negative than -0.5)
    // The exact amount depends on canvas size (dynamic with window resize)
    status = await ctx.getById('status');
    text = await status.getText();
    // Extract center X coordinate - should be more negative than -0.5
    const match = text.match(/Center: \(([-\d.]+),/);
    expect(match).toBeTruthy();
    const centerX = parseFloat(match![1]);
    expect(centerX).toBeLessThan(-0.5);
  }, 30000);
});

describe('Mandelbrot Algorithm', () => {
  // Unit tests for the mandelbrot calculation
  // These don't need the GUI

  test('point in set should return max iterations', () => {
    // The origin (0,0) is in the Mandelbrot set
    const result = mandelbrotCalc(0, 0, 100);
    expect(result).toBe(100);
  });

  test('point far outside set should escape quickly', () => {
    // Point far from origin escapes immediately
    const result = mandelbrotCalc(10, 10, 100);
    expect(result).toBeLessThan(5);
  });

  test('point on edge should have intermediate iterations', () => {
    // A point near the edge of the set
    const result = mandelbrotCalc(-0.75, 0.1, 100);
    expect(result).toBeGreaterThan(1);
    expect(result).toBeLessThan(100);
  });
});

// Helper: inline mandelbrot calculation for unit tests
function mandelbrotCalc(cx: number, cy: number, maxIter: number): number {
  let x = 0;
  let y = 0;
  let iter = 0;

  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xTemp;
    iter++;
  }

  return iter;
}
