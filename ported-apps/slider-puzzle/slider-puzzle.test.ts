/**
 * Slider Puzzle Integration Tests
 */

import { TsyneTest } from 'tsyne';
import { createSliderPuzzleApp } from './slider-puzzle';

describe('Slider Puzzle UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with all tiles rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // All 25 tiles should exist
    for (let i = 0; i < 25; i++) {
      await ctx.getById(`tile-${i}`).within(500).shouldExist();
    }
  }, 15000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('scrambleBtn').within(500).shouldExist();
    await ctx.getById('solveBtn').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('scramble button can be clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('scrambleBtn').click();
    // Status should change from SOLVED! to blank
    await ctx.getById('statusLabel').within(500).shouldBe(' ');
  }, 15000);

  test('solve button restores solved state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Scramble first
    await ctx.getById('scrambleBtn').click();
    // Then solve
    await ctx.getById('solveBtn').click();

    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);

  test('tile clicks are registered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click tile 23 (adjacent to blank)
    await ctx.getById('tile-23').click();
    // Status should change from SOLVED! to blank
    await ctx.getById('statusLabel').within(500).shouldBe(' ');
  }, 15000);

  test('move and undo restores solved state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Initially solved
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');

    // Move tile 23 (X) into blank at 24 - blank moves to 23
    await ctx.getById('tile-23').click();
    await ctx.getById('statusLabel').within(500).shouldBe(' ');

    // Move tile at 24 (now X) back - blank returns to 24
    await ctx.getById('tile-24').click();
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);

  test('status shows SOLVED! initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSliderPuzzleApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);
});
