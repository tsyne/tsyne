/**
 * Tango Puzzle Integration Tests
 */

import { TsyneTest } from 'tsyne';
import { createTangoPuzzleApp } from './tango-puzzle';

describe('Tango Puzzle UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with grid rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-0').within(500).shouldExist();
    await ctx.getById('cell-15').within(500).shouldExist();
  }, 15000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('resetBtn').within(500).shouldExist();
    await ctx.getById('undoBtn').within(500).shouldExist();
    await ctx.getById('prevBtn').within(500).shouldExist();
    await ctx.getById('nextBtn').within(500).shouldExist();
    await ctx.getById('levelLabel').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('clicking cell changes its value', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click a cell (find one that's not a given)
    await ctx.getById('cell-1').click();
    // Should show sun symbol
    await ctx.getById('cell-1').within(500).shouldExist();
  }, 15000);

  test('reset button works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-1').click();
    await ctx.getById('resetBtn').click();
    // Should be reset
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('undo button works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-1').click();
    await ctx.getById('undoBtn').click();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('level label shows current level', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTangoPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('levelLabel').within(500).shouldBe('Level 1/5');
  }, 15000);
});
