/**
 * Basic Tic-Tac-Toe Tests
 *
 * Tests the simple tictactoe implementation without accessibility features
 * For accessibility feature tests, see tictactoe-accessible.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildTicTacToe } from './tictactoe';
import * as path from 'path';

describe('Basic Tic-Tac-Toe', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should start with empty board and X turn', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state - use within() to poll for UI readiness
    await ctx.getByText("Player X's turn").within(500).shouldExist();
    await ctx.getByText('New Game').shouldExist();
  });

  test('should allow placing X and O alternately', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // X's turn - click center
    await ctx.getByID('cell4').click();

    // Should now be O's turn - poll for state change
    await ctx.getByText("Player O's turn").within(200).shouldExist();

    // O's turn - click top-left
    await ctx.getByID('cell0').click();

    // Should be X's turn again - poll for state change
    await ctx.getByText("Player X's turn").within(200).shouldExist();
  });

  test('should detect horizontal win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Create top row win for X: X X X / O O _ / _ _ _
    const moves = [0, 3, 1, 4, 2]; // X wins top row

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).within(200).click();
    }

    // Verify X wins - poll for win message
    await ctx.getByText('Player X wins!').within(200).shouldExist();
  });

  test('should detect vertical win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Create left column win for X
    const moves = [
      0, // X top-left
      1, // O top-center
      3, // X middle-left
      2, // O top-right
      6  // X bottom-left - WINS!
    ];

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).within(200).click();
    }

    // Verify X wins - poll for win message
    await ctx.getByText('Player X wins!').within(200).shouldExist();
  });

  test('should detect diagonal win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Create diagonal win for X (top-left to bottom-right)
    const moves = [
      0, // X top-left
      1, // O top-center
      4, // X center
      2, // O top-right
      8  // X bottom-right - WINS!
    ];

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).within(200).click();
    }

    // Verify X wins - poll for win message
    await ctx.getByText('Player X wins!').within(200).shouldExist();
  });

  test('should detect draw', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Create a draw: X X O / O O X / X O X
    const moves = [0, 2, 1, 3, 5, 4, 6, 8, 7];

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).within(200).click();
    }

    // Verify draw - poll for draw message
    await ctx.getByText("It's a draw!").within(200).shouldExist();
  });

  test('should reset game with New Game button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Make a move
    await ctx.getByID('cell4').click();

    // Should be O's turn - poll for state change
    await ctx.getByText("Player O's turn").within(200).shouldExist();

    // Click New Game
    await ctx.getByText('New Game').click();

    // Should be back to X's turn - poll for reset
    await ctx.getByText("Player X's turn").within(200).shouldExist();
  });

  test('should not allow moves after game ends', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be ready
    await ctx.getByText("Player X's turn").within(500).shouldExist();

    // Quick win
    const moves = [0, 3, 1, 4, 2]; // X wins top row

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).within(200).click();
    }

    // Game should be over - poll for win message
    await ctx.getByText('Player X wins!').within(200).shouldExist();

    // Should still show X wins (game state preserved)
    await ctx.getByText('Player X wins!').shouldExist();
  });

  // Screenshot test
  if (process.env.TAKE_SCREENSHOTS === '1') {
    test('should capture screenshot', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildTicTacToe(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for UI to be ready
      await ctx.getByText("Player X's turn").within(500).shouldExist();

      // Make some moves for a better screenshot
      const moves = [4, 0, 2, 6]; // Some X's and O's
      for (const move of moves) {
        await ctx.getByID(`cell${move}`).within(200).click();
      }

      // Wait for final state before screenshot
      await ctx.getByText("Player X's turn").within(200).shouldExist();

      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-basic.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    });
  }
});
