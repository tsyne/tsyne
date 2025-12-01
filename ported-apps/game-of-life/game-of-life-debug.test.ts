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
    tsyneTest = new TsyneTest({ headed: false });
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
    console.error(`Screenshot saved: ${screenshotPath}`);

    // Get all text to see what's available
    const allText = await ctx.getAllTextAsString();
    console.error('=== ALL TEXT ON SCREEN ===');
    console.error(allText);
    console.error('=== END TEXT ===');

    // Try to find the Start button
    const hasStart = await ctx.hasText('Start');
    console.error(`Has 'Start' text: ${hasStart}`);

    const hasGeneration = await ctx.hasText('Generation');
    console.error(`Has 'Generation' text: ${hasGeneration}`);

    const hasStatus = await ctx.hasText('Status');
    console.error(`Has 'Status' text: ${hasStatus}`);
  }, 30000);
});
