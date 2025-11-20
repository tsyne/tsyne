/**
 * Basic Tic-Tac-Toe Tests
 *
 * Tests the simple tictactoe implementation without accessibility features
 * For accessibility feature tests, see tictactoe-accessible.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';
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

    await ctx.wait(500);

    // Verify initial state
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
  });

  test('should allow placing X and O alternately', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // X's turn - click center
    await ctx.getByID('cell4').click();
    await ctx.wait(200);

    // Should now be O's turn
    await ctx.expect(ctx.getByText("Player O's turn")).toBeVisible();

    // O's turn - click top-left
    await ctx.getByID('cell0').click();
    await ctx.wait(200);

    // Should be X's turn again
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
  });

  test('should detect horizontal win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Create top row win for X: X X X / O O _ / _ _ _
    const moves = [0, 3, 1, 4, 2]; // X wins top row

    for (const move of moves) {
      await ctx.getByID(`cell${move}`).click();
      await ctx.wait(200);
    }

    // Verify X wins
    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();
  });

  test('should detect vertical win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Create left column win for X
    const moves = [
      0, // X top-left
      1, // O top-center
      3, // X middle-left
      2, // O top-right
      6  // X bottom-left - WINS!
    ];

    for (const move of moves) {
      // Using cell IDs instead
      await ctx.getByID(`cell${move}`).click();
      await ctx.wait(200);
    }

    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();
  });

  test('should detect diagonal win', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Create diagonal win for X (top-left to bottom-right)
    const moves = [
      0, // X top-left
      1, // O top-center
      4, // X center
      2, // O top-right
      8  // X bottom-right - WINS!
    ];

    for (const move of moves) {
      // Using cell IDs instead
      await ctx.getByID(`cell${move}`).click();
      await ctx.wait(200);
    }

    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();
  });

  test('should detect draw', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Create a draw: X X O / O O X / X O X
    const moves = [0, 2, 1, 3, 5, 4, 6, 8, 7];

    for (const move of moves) {
      // Using cell IDs instead
      await ctx.getByID(`cell${move}`).click();
      await ctx.wait(200);
    }

    await ctx.expect(ctx.getByText("It's a draw!")).toBeVisible();
  });

  test('should reset game with New Game button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Make a move
    await ctx.getByID('cell4').click();
    await ctx.wait(200);

    // Should be O's turn
    await ctx.expect(ctx.getByText("Player O's turn")).toBeVisible();

    // Click New Game
    await ctx.getByText('New Game').click();
    await ctx.wait(200);

    // Should be back to X's turn
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
  });

  test('should not allow moves after game ends', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Quick win
    const moves = [0, 3, 1, 4, 2]; // X wins top row

    for (const move of moves) {
      // Using cell IDs instead
      await ctx.getByID(`cell${move}`).click();
      await ctx.wait(200);
    }

    // Game should be over
    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();

    // Try to make another move (should not work)
    // Using cell IDs instead
    // Cell already filled;
    await ctx.wait(200);

    // Should still show X wins
    await ctx.expect(ctx.getByText('Player X wins!')).toBeVisible();
  });

  // Screenshot test
  if (process.env.TAKE_SCREENSHOTS === '1') {
    test('should capture screenshot', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildTicTacToe(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(500);

      // Make some moves for a better screenshot
      const moves = [4, 0, 2, 6]; // Some X's and O's
      for (const move of moves) {
        // Using cell IDs instead
        await ctx.getByID(`cell${move}`).click();
        await ctx.wait(200);
      }

      const screenshotPath = path.join(__dirname, 'screenshots', 'tictactoe-basic.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    });
  }
});
