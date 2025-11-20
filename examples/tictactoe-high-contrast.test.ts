/**
 * Tictactoe High Contrast Mode Test
 *
 * Tests dynamic theme switching with the refreshStyles() infrastructure
 * Demonstrates:
 * - Making game moves
 * - Toggling high contrast mode on/off
 * - Verifying visual changes through screenshots
 * - Testing style/class-based dynamic theming
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildTicTacToe } from './tictactoe-accessible';
import * as path from 'path';

describe('Tictactoe High Contrast Mode', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should toggle high contrast mode with visible changes', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to render
    await ctx.wait(500);

    // Make some moves to populate the board for better visual testing
    // X in center (cell4)
    await ctx.getByID('cell4').click();
    await ctx.wait(200);

    // O in top-left (cell0)
    await ctx.getByID('cell0').click();
    await ctx.wait(200);

    // X in top-right (cell2)
    await ctx.getByID('cell2').click();
    await ctx.wait(200);

    // O in bottom-left (cell6)
    await ctx.getByID('cell6').click();
    await ctx.wait(200);

    // Verify initial state
    await ctx.expect(ctx.getByText('High Contrast: OFF')).toBeVisible();

    // Capture screenshot in normal mode if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-normal-mode.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Normal mode screenshot: ${screenshotPath}`);
    }

    // Toggle high contrast ON
    const contrastButton = ctx.getByText('High Contrast: OFF');
    await contrastButton.click();
    await ctx.wait(500);

    // Verify high contrast is ON
    await ctx.expect(ctx.getByText('High Contrast: ON')).toBeVisible();

    // Capture screenshot in high contrast mode if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-high-contrast-mode.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 High contrast mode screenshot: ${screenshotPath}`);
    }

    // Toggle high contrast OFF
    const contrastButtonOn = ctx.getByText('High Contrast: ON');
    await contrastButtonOn.click();
    await ctx.wait(500);

    // Verify high contrast is OFF again
    await ctx.expect(ctx.getByText('High Contrast: OFF')).toBeVisible();

    // Keep window visible for a moment in headed mode
    if (process.env.TSYNE_HEADED === '1') {
      await ctx.wait(1000);
    }
  });

  test('should maintain game state when toggling high contrast', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    // Make a move
    await ctx.getByID('cell4').click();
    await ctx.wait(500);

    // Toggle high contrast ON
    await ctx.getByText('High Contrast: OFF').click();
    await ctx.wait(500);

    // Verify high contrast is ON
    await ctx.expect(ctx.getByText('High Contrast: ON')).toBeVisible();

    // Make another move to verify game still works
    await ctx.getByID('cell0').click();
    await ctx.wait(500);

    // Toggle high contrast OFF
    await ctx.getByText('High Contrast: ON').click();
    await ctx.wait(500);

    // Verify high contrast is OFF
    await ctx.expect(ctx.getByText('High Contrast: OFF')).toBeVisible();

    // Make one more move to verify game still works
    await ctx.getByID('cell2').click();
    await ctx.wait(500);

    // Game should still be functional - verify New Game button exists
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
  });
});
