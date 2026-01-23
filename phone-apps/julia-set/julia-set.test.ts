/**
 * Tests for Julia Set Explorer
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createJuliaSetApp } from './julia-set';
import { julia } from '../fractal-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Julia Set Explorer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display julia set window with controls', async () => {
    const testApp = await tsyneTest.createApp(createJuliaSetApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('zoom-in').shouldExist();
    await ctx.getById('zoom-out').shouldExist();
    await ctx.getById('reset').shouldExist();
    await ctx.getById('next-preset').shouldExist();
    await ctx.getById('next-palette').shouldExist();
  }, 30000);

  test('should cycle through presets', async () => {
    const testApp = await tsyneTest.createApp(createJuliaSetApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // Initial preset is Classic
    let status = await ctx.getById('status');
    let text = await status.getText();
    expect(text).toContain('Classic');

    // Click next preset
    await ctx.getById('next-preset').click();
    await ctx.wait(1000);

    status = await ctx.getById('status');
    text = await status.getText();
    expect(text).toContain('Dendrite');
  }, 30000);

  test('should zoom in when clicking zoom button', async () => {
    const testApp = await tsyneTest.createApp(createJuliaSetApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);

    // Take screenshot for visual verification
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'julia-zoomed.png'));
  }, 30000);
});

describe('Julia Algorithm', () => {
  test('point in julia set should return max iterations for classic c', () => {
    // Origin with c=(-0.4, 0.6) escapes
    const result = julia(0, 0, 100, -0.4, 0.6);
    expect(result).toBeLessThan(100);
  });

  test('point far from origin escapes quickly', () => {
    const result = julia(10, 10, 100, -0.4, 0.6);
    expect(result).toBeLessThan(5);
  });

  test('dendrite julia at origin', () => {
    // c=(0, 1) is the dendrite - origin is a fixed point
    const result = julia(0, 0, 100, 0, 1);
    expect(result).toBe(100);
  });
});
