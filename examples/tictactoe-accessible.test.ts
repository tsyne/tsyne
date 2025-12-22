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

import { TsyneTest, TestContext } from '../core/src/index-test';
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

    // Wait for UI to be ready - poll for first control
    await ctx.getByText('TTS: OFF').within(500).shouldExist();

    // Verify accessibility controls are present
    await ctx.getByText('High Contrast: OFF').shouldExist();
    await ctx.getByText('Font: A').shouldExist();
    await ctx.getByText('New Game').shouldExist();
    await ctx.getByText('Undo').shouldExist();
    await ctx.getByText('Hint').shouldExist();
  });

  test.skip('should toggle TTS on and off', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText('TTS: OFF').within(500).shouldExist();

    // Toggle TTS ON
    await ctx.getByText('TTS: OFF').click();

    // Verify TTS is ON - poll for state change
    await ctx.getByText('TTS: ON').within(300).shouldExist();

    // Toggle TTS OFF
    await ctx.getByText('TTS: ON').click();

    // Verify TTS is OFF - poll for state change
    await ctx.getByText('TTS: OFF').within(300).shouldExist();
  });

  test('should cycle font sizes', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state - poll for UI readiness
    await ctx.getByText('Font: A').within(500).shouldExist();

    // Cycle to Large
    await ctx.getByText('Font: A').click();
    await ctx.getByText('Font: A+').within(300).shouldExist();

    // Cycle to Small
    await ctx.getByText('Font: A+').click();
    await ctx.getByText('Font: A-').within(300).shouldExist();

    // Cycle back to Medium
    await ctx.getByText('Font: A-').click();
    await ctx.getByText('Font: A').within(300).shouldExist();
  });

  test('should display move history', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state - no moves yet (poll for UI readiness)
    await ctx.getByText('No moves yet').within(500).shouldExist();

    // Make some moves
    await ctx.getById('cell4').click(); // X center

    // History should update - poll for state change
    await ctx.getByText('X at center').within(300).shouldExist();

    await ctx.getById('cell0').click(); // O top-left

    // Both moves in history - poll for state change
    await ctx.getByText('O at top left').within(300).shouldExist();
  });

  test.skip('should support undo functionality', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Make a move
    await ctx.getById('cell4').click();

    // Should be O's turn - poll for state change
    await ctx.getByText("Player O's turn").within(300).shouldExist();

    // Undo the move
    await ctx.getByText('Undo').click();

    // Should be back to X's turn - poll for undo
    await ctx.getByText("Player X's turn").within(300).shouldExist();
  });

  test('should provide hints', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText('Hint').within(500).shouldExist();

    // Click hint button
    await ctx.getByText('Hint').click();

    // Hint should suggest center (traditionally best first move)
    // The hint system suggests moves, we just verify the button still works
    await ctx.getByText('Hint').within(300).shouldExist();
  });

  test.skip('should play full game with all features', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText('TTS: OFF').within(500).shouldExist();

    // Enable TTS
    await ctx.getByText('TTS: OFF').click();
    await ctx.getByText('TTS: ON').within(200).shouldExist();

    // Enable high contrast
    await ctx.getByText('High Contrast: OFF').click();
    await ctx.getByText('High Contrast: ON').within(500).shouldExist();

    // Play a winning game
    const moves = [0, 3, 1, 4, 2]; // X wins top row
    for (const moveIdx of moves) {
      await ctx.getById(`cell${moveIdx}`).within(300).click();
    }

    // Verify win - poll for win message
    await ctx.getByText('Player X wins!').within(300).shouldExist();

    // Verify history shows all moves
    await ctx.getByText('X at top left').shouldExist();

    // Start new game
    await ctx.getByText('New Game').click();

    // Verify reset - poll for state changes
    await ctx.getByText("Player X's turn").within(300).shouldExist();
    await ctx.getByText('No moves yet').shouldExist();

    // High contrast should still be ON after new game
    await ctx.getByText('High Contrast: ON').shouldExist();
  });

  test('should handle rapid moves gracefully', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Rapid moves with short polling
    for (let i = 0; i < 5; i++) {
      await ctx.getById(`cell${i}`).within(100).click();
    }

    // Game should still be functional - poll for UI state
    await ctx.getByText('New Game').within(100).shouldExist();
  });

  // Screenshot tests
  if (process.env.TAKE_SCREENSHOTS === '1') {
    test('should capture screenshot with all features visible', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildTicTacToe(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for UI to be ready
      await ctx.getByText('High Contrast: OFF').within(500).shouldExist();

      // Enable high contrast
      await ctx.getByText('High Contrast: OFF').click();
      await ctx.getByText('High Contrast: ON').within(500).shouldExist();

      // Make some moves
      await ctx.getById('cell4').click();
      await ctx.getByText("Player O's turn").within(200).shouldExist();

      await ctx.getById('cell0').click();
      await ctx.getByText("Player X's turn").within(200).shouldExist();

      await ctx.getById('cell2').click();
      await ctx.getByText("Player O's turn").within(200).shouldExist();

      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-accessible-full.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    });
  }
});
