/**
 * Tests for Tricorn Fractal Explorer
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createTricornApp } from './tricorn';
import { tricorn } from '../fractal-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Tricorn Explorer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display tricorn window with controls', async () => {
    const testApp = await tsyneTest.createApp(createTricornApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getByID('zoom-in').shouldExist();
    await ctx.getByID('zoom-out').shouldExist();
    await ctx.getByID('reset').shouldExist();
    await ctx.getByID('next-palette').shouldExist();

    const status = await ctx.getByID('status');
    const text = await status.getText();
    expect(text).toContain('Tricorn');
  }, 30000);

  test('should cycle palettes', async () => {
    const testApp = await tsyneTest.createApp(createTricornApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Initial palette is ice
    let status = await ctx.getByID('status');
    let text = await status.getText();
    expect(text).toContain('ice');

    await ctx.getByID('next-palette').click();
    await ctx.wait(1000);

    status = await ctx.getByID('status');
    text = await status.getText();
    expect(text).toContain('rainbow');
  }, 30000);

  test('should render and screenshot zoomed view', async () => {
    const testApp = await tsyneTest.createApp(createTricornApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getByID('zoom-in').click();
    await ctx.wait(1000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'tricorn-zoomed.png'));
  }, 30000);
});

describe('Tricorn Algorithm', () => {
  test('origin should be in the set', () => {
    const result = tricorn(0, 0, 100);
    expect(result).toBe(100);
  });

  test('point far from origin escapes quickly', () => {
    const result = tricorn(10, 10, 100);
    expect(result).toBeLessThan(5);
  });

  test('tricorn has different boundary than mandelbrot', () => {
    // Point that's in Mandelbrot but escapes in Tricorn
    const result = tricorn(-0.1, 0.9, 100);
    expect(result).toBeLessThan(100);
  });
});
