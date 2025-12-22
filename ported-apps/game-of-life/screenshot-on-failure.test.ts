/**
 * Screenshot test to debug what's happening at point of failure
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createGameOfLifeApp } from './game-of-life';
import * as path from 'path';

describe('Game of Life Screenshot Debug', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
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

    // Verify generation number using ID (correct approach)
    // Give time for async window setup
    await ctx.getByText('Start').within(500).shouldExist();
    await ctx.getById('generationNum').within(500).shouldBe('0');
  }, 15000);
});
