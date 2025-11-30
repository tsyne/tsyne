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
    console.log('Screenshot 1: Immediately after run');

    // Get all text immediately
    const textImmediate = await ctx.getAllTextAsString();
    console.log('=== TEXT IMMEDIATELY AFTER RUN ===');
    console.log(textImmediate);
    console.log('=== END ===');

    // Now try to find Generation: 0 like the failing tests do
    console.log('Attempting to find "Generation: 0"...');
    try {
      await ctx.getByText('Generation: 0').within(500).shouldExist();
      console.log('SUCCESS: Found "Generation: 0"');
    } catch (error) {
      console.log('FAILED to find "Generation: 0"');
      console.log('Error:', (error as Error).message);

      // Take screenshot at point of failure
      await tsyneTest.screenshot('/tmp/game-of-life-after-failure.png');
      console.log('Screenshot 2: After failure to find Generation: 0');

      // Get text again
      const textAfterFail = await ctx.getAllTextAsString();
      console.log('=== TEXT AFTER FAILURE ===');
      console.log(textAfterFail);
      console.log('=== END ===');

      throw error;
    }
  }, 15000);
});
