/**
 * Tests for Newton Fractal Explorer
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createNewtonFractalApp } from './newton-fractal';
import { newton } from '../fractal-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Newton Fractal Explorer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display newton fractal window with controls', async () => {
    const testApp = await tsyneTest.createApp(createNewtonFractalApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getByID('zoom-in').shouldExist();
    await ctx.getByID('zoom-out').shouldExist();
    await ctx.getByID('reset').shouldExist();
    await ctx.getByID('next-palette').shouldExist();

    const status = await ctx.getByID('status');
    const text = await status.getText();
    expect(text).toContain('z³-1=0');
  }, 30000);

  test('should render and screenshot initial view', async () => {
    const testApp = await tsyneTest.createApp(createNewtonFractalApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1500);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'newton-initial.png'));
  }, 30000);
});

describe('Newton Algorithm', () => {
  test('root 1 (1,0) converges immediately', () => {
    const result = newton(1, 0, 64);
    expect(result).toBeLessThan(5);
  });

  test('root 2 (-0.5, 0.866) converges quickly', () => {
    const result = newton(-0.5, 0.866, 64);
    expect(result).toBeLessThan(10);
  });

  test('root 3 (-0.5, -0.866) converges quickly', () => {
    const result = newton(-0.5, -0.866, 64);
    expect(result).toBeLessThan(10);
  });

  test('boundary region takes longer to converge', () => {
    // Point between attraction basins
    const result = newton(0.5, 0.5, 64);
    expect(result).toBeGreaterThan(3);
  });
});
