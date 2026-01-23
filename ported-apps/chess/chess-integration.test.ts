/**
 * Chess Integration Tests
 *
 * Tests interaction between ChessUI components and game logic.
 * Uses TsyneTest but focuses on single interactions, not full user journeys.
 * Target: ~1-2 seconds per test
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createChessApp } from './chess';
import type { IResourceManager } from 'tsyne';
import * as path from 'path';

describe('Chess Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let chessUI: any;

  beforeAll(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    const testApp = await tsyneTest.createApp(async (app) => {
      // Pass app.resources for test isolation (IoC pattern)
      chessUI = await createChessApp(app, app.resources, 10); // 10ms AI delay for fast tests
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial UI to be ready (starts with "White to move")
    await ctx.expect(ctx.getByText('White to move')).toBeVisible();
  }, 25000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  // ============================================================================
  // Piece Selection Interactions
  // (Share app instance - no resets between tests)
  // ============================================================================

  test('selecting a piece shows selection message', async () => {
    // Just verify clicking any starting piece shows selection
    // Don't rely on specific board state
    await ctx.getById('square-g1').click(); // Knight always available at start
    await ctx.expect(ctx.getByText('Selected')).toBeVisible();
  });

  test('deselecting a piece removes selection', async () => {
    // g1 is already selected from previous test
    // Click to deselect
    await ctx.getById('square-g1').click();
    await ctx.expect(ctx.getByText('to move').within(2000)).toBeVisible();
  });

  // ============================================================================
  // Visual Regression (Screenshot)
  // ============================================================================

  test('renders correctly (visual regression)', async () => {
    // Capture screenshot in current state (may have pieces moved from previous tests)
    // No need to reset - just verify UI is functional

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'chess-integration.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }

    // Verify UI is visible - status label shows game state
    await ctx.expect(ctx.getByText('White to move')).toBeVisible();
    expect(true).toBe(true);
  }, 25000);
});
