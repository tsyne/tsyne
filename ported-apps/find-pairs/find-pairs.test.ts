/**
 * Find Pairs Integration Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createFindPairsApp } from './find-pairs';

describe('Find Pairs UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with all tiles rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    for (let i = 0; i < 50; i++) {
      await ctx.getById(`tile-${i}`).within(500).shouldExist();
    }
  }, 20000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('newGameBtn').within(500).shouldExist();
    await ctx.getById('peekBtn').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('initial score is 0', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(500).shouldBe('Score: 0');
  }, 15000);

  test('new game button resets score', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('newGameBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Score: 0');
  }, 15000);

  test('clicking tile works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tile-0').click();
    // Tile should now be revealed (no error = success)
    await ctx.getById('tile-0').shouldExist();
  }, 15000);

  test('peek reveals all tiles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createFindPairsApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('peekBtn').click();
    // After peek, status should show WINNER
    await ctx.getById('statusLabel').within(500).shouldBe('WINNER! Score: 0');
  }, 15000);
});
