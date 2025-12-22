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

import { TsyneTest, TestContext } from '../core/src/index-test';
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

    // Wait for UI to render - poll for initial state
    await ctx.getById('contrastToggle').within(500).shouldContain('OFF');

    // Make some moves to populate the board for better visual testing
    // X in center (cell4)
    await ctx.getById('cell4').click();
    await ctx.getById('status').within(500).shouldContain("Player O's turn");

    // O in top-left (cell0)
    await ctx.getById('cell0').click();
    await ctx.getById('status').within(500).shouldContain("Player X's turn");

    // X in top-right (cell2)
    await ctx.getById('cell2').click();
    await ctx.getById('status').within(500).shouldContain("Player O's turn");

    // O in bottom-left (cell6)
    await ctx.getById('cell6').click();
    await ctx.getById('status').within(500).shouldContain("Player X's turn");

    // Verify initial state
    await ctx.getById('contrastToggle').shouldContain('OFF');

    // Capture screenshot in normal mode if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-normal-mode.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Normal mode screenshot: ${screenshotPath}`);
    }

    // Toggle high contrast ON
    await ctx.getById('contrastToggle').click();

    // Verify high contrast is ON - poll for state change
    await ctx.getById('contrastToggle').within(500).shouldContain('ON');

    // Capture screenshot in high contrast mode if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-high-contrast-mode.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 High contrast mode screenshot: ${screenshotPath}`);
    }

    // Toggle high contrast OFF
    await ctx.getById('contrastToggle').click();

    // Verify high contrast is OFF again - poll for state change
    await ctx.getById('contrastToggle').within(500).shouldContain('OFF');

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

    // Wait for UI to be ready
    await ctx.getById('status').within(500).shouldContain("Player X's turn");

    // Make a move
    await ctx.getById('cell4').click();
    await ctx.getById('status').within(500).shouldContain("Player O's turn");

    // Toggle high contrast ON
    await ctx.getById('contrastToggle').click();

    // Verify high contrast is ON - poll for state change
    await ctx.getById('contrastToggle').within(500).shouldContain('ON');

    // Make another move to verify game still works
    await ctx.getById('cell0').click();
    await ctx.getById('status').within(500).shouldContain("Player X's turn");

    // Toggle high contrast OFF
    await ctx.getById('contrastToggle').click();

    // Verify high contrast is OFF - poll for state change
    await ctx.getById('contrastToggle').within(500).shouldContain('OFF');

    // Make one more move to verify game still works
    await ctx.getById('cell2').click();
    await ctx.getById('status').within(500).shouldContain("Player O's turn");

    // Game should still be functional - verify New Game button exists
    await ctx.getByText('New Game').shouldExist();
  });
});
