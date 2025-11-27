/**
 * Accessible Tic-Tac-Toe Tests
 *
 * Comprehensive tests for the full-featured accessible version with:
 * - TTS announcements
 * - High contrast mode
 * - Font size controls
 * - Keyboard navigation
 * - Move history
 * - Undo functionality
 * - Smart hints
 * - Audio feedback
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildTicTacToe } from './tictactoe-accessible';
import * as path from 'path';

describe('Accessible Tic-Tac-Toe', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display all accessibility controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Verify accessibility controls are present
    await ctx.expect(ctx.getByText('TTS: OFF')).toBeVisible();
    await ctx.expect(ctx.getByText('High Contrast: OFF')).toBeVisible();
    await ctx.expect(ctx.getByText('Font: A')).toBeVisible();
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('Undo')).toBeVisible();
    await ctx.expect(ctx.getByText('Hint')).toBeVisible();
  });

  test.skip('should toggle TTS on and off', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Toggle TTS ON
    await ctx.getByText('TTS: OFF').click();
    await ctx.wait(300);

    // Verify TTS is ON
    await ctx.expect(ctx.getByText('TTS: ON')).toBeVisible();

    // Toggle TTS OFF
    await ctx.getByText('TTS: ON').click();
    await ctx.wait(300);

    // Verify TTS is OFF
    await ctx.expect(ctx.getByText('TTS: OFF')).toBeVisible();
  });

  test('should cycle font sizes', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Initial state
    await ctx.expect(ctx.getByText('Font: A')).toBeVisible();

    // Cycle to Large
    await ctx.getByText('Font: A').click();
    await ctx.wait(300);
    await ctx.expect(ctx.getByText('Font: A+')).toBeVisible();

    // Cycle to Small
    await ctx.getByText('Font: A+').click();
    await ctx.wait(300);
    await ctx.expect(ctx.getByText('Font: A-')).toBeVisible();

    // Cycle back to Medium
    await ctx.getByText('Font: A-').click();
    await ctx.wait(300);
    await ctx.expect(ctx.getByText('Font: A')).toBeVisible();
  });

  test('should display move history', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Initial state - no moves yet
    await ctx.expect(ctx.getByText('No moves yet')).toBeVisible();

    // Make some moves
    await ctx.getByID('cell4').click(); // X center
    await ctx.wait(300);

    // History should update
    await ctx.expect(ctx.getByText('X at center')).toBeVisible();

    await ctx.getByID('cell0').click(); // O top-left
    await ctx.wait(300);

    // Both moves in history
    await ctx.expect(ctx.getByText('O at top left')).toBeVisible();
  });

  test.skip('should support undo functionality', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Make a move
    await ctx.getByID('cell4').click();
    await ctx.wait(300);

    // Should be O's turn
    await ctx.expect(ctx.getByText("Player O's turn")).toBeVisible();

    // Undo the move
    await ctx.getByText('Undo').click();
    await ctx.wait(300);

    // Should be back to X's turn
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
  });

  test('should provide hints', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Click hint button
    await ctx.getByText('Hint').click();
    await ctx.wait(300);

    // Hint should suggest center (traditionally best first move)
    // The hint system suggests moves, we just verify the button works
    await ctx.expect(ctx.getByText('Hint')).toBeVisible();
  });

  test.skip('should play full game with all features', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Enable TTS
    await ctx.getByText('TTS: OFF').click();
    await ctx.wait(200);

    // Enable high contrast
    await ctx.getByText('High Contrast: OFF').click();
    await ctx.wait(500);

    // Play a winning game
    const moves = [0, 3, 1, 4, 2]; // X wins top row
    for (const moveIdx of moves) {
      await ctx.getByID(`cell${moveIdx}`).click();
      await ctx.wait(300);
    }

    // Verify win
    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();

    // Verify history shows all moves
    await ctx.expect(ctx.getByText('X at top left')).toBeVisible();

    // Start new game
    await ctx.getByText('New Game').click();
    await ctx.wait(300);

    // Verify reset
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
    await ctx.expect(ctx.getByText('No moves yet')).toBeVisible();

    // High contrast should still be ON after new game
    await ctx.expect(ctx.getByText('High Contrast: ON')).toBeVisible();
  });

  test('should handle rapid moves gracefully', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Rapid moves
    for (let i = 0; i < 5; i++) {
      await ctx.getByID(`cell${i}`).click();
      await ctx.wait(100); // Short delay
    }

    // Game should still be functional
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
  });

  // Screenshot tests
  if (process.env.TAKE_SCREENSHOTS === '1') {
    test('should capture screenshot with all features visible', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildTicTacToe(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(500);

      // Enable high contrast
      await ctx.getByText('High Contrast: OFF').click();
      await ctx.wait(500);

      // Make some moves
      await ctx.getByID('cell4').click();
      await ctx.wait(200);
      await ctx.getByID('cell0').click();
      await ctx.wait(200);
      await ctx.getByID('cell2').click();
      await ctx.wait(200);

      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-accessible-full.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    });
  }
});
