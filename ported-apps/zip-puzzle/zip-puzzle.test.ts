/**
 * Zip Puzzle Integration Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createZipPuzzleApp } from './zip-puzzle';

describe('Zip Puzzle UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with grid rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-0').within(500).shouldExist();
    await ctx.getById('cell-24').within(500).shouldExist();
  }, 15000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('resetBtn').within(500).shouldExist();
    await ctx.getById('prevBtn').within(500).shouldExist();
    await ctx.getById('nextBtn').within(500).shouldExist();
    await ctx.getById('levelLabel').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('initial status shows cell count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(500).shouldBe('1/25 cells');
  }, 15000);

  test('clicking cell extends path', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-1').click();
    await ctx.getById('statusLabel').within(500).shouldBe('2/25 cells');
  }, 15000);

  test('reset button works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-1').click();
    await ctx.getById('statusLabel').within(500).shouldBe('2/25 cells');
    await ctx.getById('resetBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('1/25 cells');
  }, 15000);

  test('level label shows current level', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createZipPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('levelLabel').within(500).shouldBe('Level 1/5');
  }, 15000);
});
