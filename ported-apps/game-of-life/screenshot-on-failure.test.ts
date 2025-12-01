/**
 * Screenshot test to debug what's happening at point of failure
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createGameOfLifeApp } from './game-of-life';
import * as path from 'path';

describe('Game of Life Screenshot Debug', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('screenshot at exact point where test fails', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot IMMEDIATELY after run (no wait)
    await tsyneTest.screenshot('/tmp/game-of-life-immediately-after-run.png');
    console.error('Screenshot 1: Immediately after run');

    // Get all text immediately
    const textImmediate = await ctx.getAllTextAsString();
    console.error('=== TEXT IMMEDIATELY AFTER RUN ===');
    console.error(textImmediate);
    console.error('=== END ===');

    // Now try to find generation number using ID (correct approach)
    console.error('Attempting to find generation number by ID...');
    try {
      // Give time for async window setup
      await ctx.getByText('Start').within(500).shouldExist();
      await ctx.getByID('generationNum').within(500).shouldBe('0');
      console.error('SUCCESS: Found generation number = 0');
    } catch (error) {
      console.error('FAILED to find generation number');
      console.error('Error:', (error as Error).message);

      // Take screenshot at point of failure
      await tsyneTest.screenshot('/tmp/game-of-life-after-failure.png');
      console.error('Screenshot 2: After failure');

      // Get text again
      const textAfterFail = await ctx.getAllTextAsString();
      console.error('=== TEXT AFTER FAILURE ===');
      console.error(textAfterFail);
      console.error('=== END ===');

      throw error;
    }
  }, 15000);
});
