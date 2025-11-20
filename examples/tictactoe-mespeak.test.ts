/**
 * meSpeak TTS Integration Tests
 *
 * Verifies that meSpeak TTS works correctly in the accessible tictactoe
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildTicTacToe } from './tictactoe-accessible';

describe('meSpeak TTS Integration', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should enable TTS and announce moves without errors', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Enable TTS mode
    await ctx.getByText('TTS: OFF').click();
    await ctx.wait(500);

    // Make some moves - TTS should announce them
    await ctx.getByID('cell0').click();  // X in top left
    await ctx.wait(300);

    await ctx.getByID('cell1').click();  // O in top center
    await ctx.wait(300);

    await ctx.getByID('cell3').click();  // X in middle left
    await ctx.wait(300);

    // If we got here without errors, meSpeak is working
    // The app is still running and responsive
    await ctx.expect(ctx.getByText("Player O's turn")).toBeVisible();
  }, 30000);

  test('should announce multiple moves without errors', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTicTacToe(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Enable TTS
    await ctx.getByText('TTS: OFF').click();
    await ctx.wait(500);

    // Make multiple moves - each should be announced
    await ctx.getByID('cell4').click();  // X in center
    await ctx.wait(300);

    await ctx.getByID('cell0').click();  // O in top left
    await ctx.wait(300);

    await ctx.getByID('cell8').click();  // X in bottom right
    await ctx.wait(300);

    await ctx.getByID('cell2').click();  // O in top right
    await ctx.wait(300);

    // Verify game is still working after multiple TTS announcements
    await ctx.expect(ctx.getByText("Player X's turn")).toBeVisible();
  }, 30000);
});
