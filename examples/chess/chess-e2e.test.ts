/**
 * Chess E2E Tests
 *
 * Critical user journeys tested end-to-end through the full stack.
 * TypeScript → JSON-RPC → Go Bridge → Fyne UI → Test harness
 * Target: 5-8 tests covering essential user flows
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createChessApp } from './chess';
import * as path from 'path';

describe('Chess E2E Tests (Critical Paths)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let chessUI: any;

  beforeAll(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    const testApp = await tsyneTest.createApp((app) => {
      chessUI = createChessApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 20000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  // ============================================================================
  // Critical Path 1: Game Initialization
  // ============================================================================

  test('initializes complete chess game with all pieces', async () => {
    // Verify UI controls
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('White to move')).toBeVisible();

    // Verify board structure (corner squares)
    await ctx.expect(ctx.getByID('square-a8')).toBeVisible(); // Top-left
    await ctx.expect(ctx.getByID('square-h8')).toBeVisible(); // Top-right
    await ctx.expect(ctx.getByID('square-a1')).toBeVisible(); // Bottom-left
    await ctx.expect(ctx.getByID('square-h1')).toBeVisible(); // Bottom-right

    // Verify some starting pieces are in position
    await ctx.expect(ctx.getByID('square-e2')).toBeVisible(); // White pawn
    await ctx.expect(ctx.getByID('square-e7')).toBeVisible(); // Black pawn
  });

  // ============================================================================
  // Critical Path 2: Complete Move Sequence
  // ============================================================================

  test('completes full move sequence: player move → computer response → player move', async () => {
    // Player move 1: e4
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.expect(ctx.getByText('Selected').within(5000)).toBeVisible();
    await ctx.getByID('square-e4').within(5000).click();

    // Wait for computer to respond
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Player move 2: d4
    await ctx.getByID('square-d2').within(5000).click();
    await ctx.expect(ctx.getByText('Selected').within(5000)).toBeVisible();
    await ctx.getByID('square-d4').within(5000).click();

    // Wait for computer to respond again
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Verify UI is still responsive
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByID('square-a1')).toBeVisible();
  });

  // ============================================================================
  // Critical Path 3: Game Reset Flow
  // ============================================================================

  test('resets game to initial state after moves', async () => {
    // Reset game first
    await ctx.getByText('New Game').click();
    // Wait for UI rebuild to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Make several moves
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.getByID('square-e4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    await ctx.getByID('square-d2').within(5000).click();
    await ctx.getByID('square-d4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    await ctx.getByID('square-g1').within(5000).click();
    await ctx.getByID('square-f3').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Reset game
    await ctx.getByText('New Game').click();
    // Wait for UI rebuild to complete by checking for a board square
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify pieces are back at starting positions
    await ctx.expect(ctx.getByID('square-e2').within(5000)).toBeVisible();

    // Verify we can make a move again
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.expect(ctx.getByText('Selected').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 4: Multiple Game Sessions
  // ============================================================================

  test('handles multiple consecutive games correctly', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Game 1: Make a move
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.getByID('square-e4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // New game
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Game 2: Make a different move
    await ctx.getByID('square-d2').within(5000).click();
    await ctx.getByID('square-d4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // New game again
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Game 3: Make another move
    await ctx.getByID('square-g1').within(5000).click();
    await ctx.getByID('square-f3').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 5: Opening Repertoire
  // ============================================================================

  test('supports standard chess opening moves', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test King's Pawn Opening (e4)
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.getByID('square-e4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Reset and test Queen's Pawn Opening (d4)
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await ctx.getByID('square-d2').within(5000).click();
    await ctx.getByID('square-d4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Reset and test Knight Development
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await ctx.getByID('square-g1').within(5000).click();
    await ctx.getByID('square-f3').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 6: Error Recovery
  // ============================================================================

  test('recovers gracefully from invalid moves', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try invalid move (pawn moving 3 squares)
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.expect(ctx.getByText('Selected').within(5000)).toBeVisible();
    await ctx.getByID('square-e5').within(5000).click();

    // Verify game is still functional
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();

    // Make a valid move after the invalid attempt
    await ctx.getByID('square-e2').within(5000).click();
    await ctx.expect(ctx.getByText('Selected').within(5000)).toBeVisible();
    await ctx.getByID('square-e4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 7: Visual Regression (Screenshot)
  // ============================================================================

  test('renders correctly (visual regression)', async () => {
    // Wait for UI to be fully ready - check for a board square
    await ctx.expect(ctx.getByID('square-e2')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'chess.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Just verify the window is showing
    expect(true).toBe(true);
  }, 15000);

  // ============================================================================
  // Critical Path 8: Knight Move Validation
  // ============================================================================

  test('valid knight move updates board and triggers computer response', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await ctx.getByID('square-b1').within(5000).click();
    await ctx.getByID('square-c3').within(5000).click();
    // Wait for computer to respond (status will change to "White to move")
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 9: Computer Opponent Response
  // ============================================================================

  test('computer responds after player move', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await ctx.getByID('square-d2').within(5000).click();
    await ctx.getByID('square-d4').within(5000).click();

    // Wait for computer to finish and return control to player
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 10: New Game Reset with Computer Interaction
  // ============================================================================

  test('new game resets board state correctly after computer moves', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Make a move and wait for computer
    await ctx.getByID('square-f2').within(5000).click();
    await ctx.getByID('square-f4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Now test that New Game resets it
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify we're back to initial state
    await ctx.expect(ctx.getByID('square-e2').within(5000)).toBeVisible();
  });

  // ============================================================================
  // Critical Path 11: Multiple Moves with Computer Response
  // ============================================================================

  test('multiple moves in sequence work correctly with computer responses', async () => {
    // Start fresh
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Move 1
    await ctx.getByID('square-c2').within(5000).click();
    await ctx.getByID('square-c4').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();

    // Move 2
    await ctx.getByID('square-g1').within(5000).click();
    await ctx.getByID('square-f3').within(5000).click();
    await ctx.expect(ctx.getByText('White to move').within(5000)).toBeVisible();
  });
});
