/**
 * Debug test to see what's actually rendering
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createGameOfLifeApp } from './game-of-life';
import * as path from 'path';

describe('Game of Life Debug', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('debug - see what renders', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait a bit for app to initialize
    await ctx.wait(2000);

    // Take screenshot to see what's there
    const screenshotPath = path.join('/tmp', 'game-of-life-debug.png');
    await tsyneTest.screenshot(screenshotPath);

    // Verify expected text elements are present
    const hasStart = await ctx.hasText('Start');
    expect(hasStart).toBe(true);

    const hasGeneration = await ctx.hasText('Generation');
    expect(hasGeneration).toBe(true);

    const hasStatus = await ctx.hasText('Status');
    expect(hasStatus).toBe(true);
  }, 30000);
});
