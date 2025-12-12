/**
 * Sudoku TsyneTest Integration Tests
 *
 * Tests the Sudoku game UI using the Tsyne testing framework.
 *
 * Usage:
 *   npm test ported-apps/sudoku/sudoku.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/sudoku/sudoku.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/sudoku/sudoku.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createSudokuApp, SudokuUI } from './sudoku';
import * as path from 'path';
import * as fs from 'fs';

describe('Sudoku Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI with all elements', async () => {
    let ui: SudokuUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createSudokuApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getByID('newGameBtn').within(500).shouldExist();
    await ctx.getByID('hintBtn').within(500).shouldExist();

    // Verify status elements
    await ctx.getByID('statusLabel').within(500).shouldExist();
    await ctx.getByID('timerLabel').within(500).shouldExist();
  });

  test('should display number buttons', async () => {
    let ui: SudokuUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createSudokuApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check number buttons
    await ctx.getByID('numBtn1').within(500).shouldExist();
    await ctx.getByID('numBtn5').within(500).shouldExist();
    await ctx.getByID('numBtn9').within(500).shouldExist();
    await ctx.getByID('clearBtn').within(500).shouldExist();
  });

  test('should have working New Game button', async () => {
    let ui: SudokuUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createSudokuApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click New Game
    await ctx.getByID('newGameBtn').click();

    // Status should still show difficulty
    const status = await ctx.getByID('statusLabel').getText();
    expect(status).toBeDefined();
  });

  test('should have working Hint button', async () => {
    let ui: SudokuUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createSudokuApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click Hint button - should not crash
    await ctx.getByID('hintBtn').click();

    // Timer should still be running
    await ctx.getByID('timerLabel').within(100).shouldExist();
  });

  test('should capture screenshot for documentation', async () => {
    let ui: SudokuUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createSudokuApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Wait for board to render
    await ctx.wait(500);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, 'sudoku-initial.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});
