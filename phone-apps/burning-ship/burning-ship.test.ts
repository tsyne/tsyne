/**
 * Tests for Burning Ship Fractal Explorer
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createBurningShipApp } from './burning-ship';
import { burningShip } from '../fractal-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Burning Ship Explorer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display burning ship window with controls', async () => {
    const testApp = await tsyneTest.createApp(createBurningShipApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('zoom-in').shouldExist();
    await ctx.getById('zoom-out').shouldExist();
    await ctx.getById('reset').shouldExist();
    await ctx.getById('next-palette').shouldExist();
  }, 30000);

  test('should zoom and take screenshot', async () => {
    const testApp = await tsyneTest.createApp(createBurningShipApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('zoom-in').click();
    await ctx.wait(1000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'burning-ship-zoomed.png'));
  }, 30000);

  test('should reset view', async () => {
    const testApp = await tsyneTest.createApp(createBurningShipApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('zoom-in').click();
    await ctx.wait(500);
    await ctx.getById('zoom-in').click();
    await ctx.wait(500);
    await ctx.getById('reset').click();
    await ctx.wait(1000);

    const status = await ctx.getById('status');
    const text = await status.getText();
    expect(text).toContain('Zoom: 0.8x');
  }, 30000);
});

describe('Burning Ship Algorithm', () => {
  test('origin should be in the set', () => {
    const result = burningShip(0, 0, 100);
    expect(result).toBe(100);
  });

  test('point far from origin escapes quickly', () => {
    const result = burningShip(10, 10, 100);
    expect(result).toBeLessThan(5);
  });

  test('ship region has intermediate iterations', () => {
    // Point near the edge of the ship hull
    const result = burningShip(-1.2, -0.4, 100);
    expect(result).toBeGreaterThan(1);
    expect(result).toBeLessThan(100);
  });
});
