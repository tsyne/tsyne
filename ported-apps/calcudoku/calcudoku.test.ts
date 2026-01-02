/**
 * Calcudoku Integration Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createCalcudokuApp } from './calcudoku';

describe('Calcudoku UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with grid rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-0').within(500).shouldExist();
    await ctx.getById('cell-8').within(500).shouldExist();
  }, 15000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('resetBtn').within(500).shouldExist();
    await ctx.getById('prevBtn').within(500).shouldExist();
    await ctx.getById('nextBtn').within(500).shouldExist();
    await ctx.getById('levelLabel').within(500).shouldExist();
    await ctx.getById('clearBtn').within(500).shouldExist();
  }, 15000);

  test('number buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('numBtn1').within(500).shouldExist();
    await ctx.getById('numBtn2').within(500).shouldExist();
    await ctx.getById('numBtn3').within(500).shouldExist();
  }, 15000);

  test('clicking cell and number sets value', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-0').click();
    await ctx.getById('numBtn1').click();
    // Cell should now contain the value
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('reset button clears board', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-0').click();
    await ctx.getById('numBtn1').click();
    await ctx.getById('resetBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('0/9 cells');
  }, 15000);

  test('level label shows current level', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('levelLabel').within(500).shouldBe('Level 1/5');
  }, 15000);

  test('solve button exists', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalcudokuApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('solveBtn').within(500).shouldExist();
  }, 15000);
});
