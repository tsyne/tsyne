/**
 * Regression test for Draw button layout shift bug
 *
 * Bug: Pressing [draw] intermittently moves the view within the window up 1cm
 * and the Draw button becomes unclickable.
 *
 * This test reproduces the bug by:
 * 1. Starting a new game
 * 2. Pressing Draw repeatedly (20 times)
 * 3. Verifying each press succeeds (button remains clickable)
 * 4. Checking that status messages update correctly (UI remains functional)
 *
 * If the layout shifts, the button will become unclickable and the test will fail.
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createSolitaireApp } from './solitaire';
import { App } from 'tsyne';

describe('Draw Button Layout Regression Test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should keep Draw button clickable after repeated presses (no layout shift)', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to load
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();
    await new Promise(resolve => setTimeout(resolve, 500));

    let initialY: number | undefined;

    // Press Draw 20 times - if layout shifts, button becomes unclickable
    for (let i = 0; i < 20; i++) {
      const drawButton = ctx.getByText('Draw');

      // Click Draw - this will fail if button shifted out of position
      await drawButton.click();

      // Small delay to let UI stabilize after async rebuild
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get position after click
      const infoAfter = await drawButton.getInfo();
      const currentY = infoAfter.absoluteY;

      // Verify the click worked by checking status message
      await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();

      if (i === 0) {
        initialY = currentY;
      } else {
        // Fail test if significant shift detected
        if (currentY !== undefined && initialY !== undefined) {
          const totalShift = Math.abs(currentY - initialY);
          if (totalShift > 2) {
            throw new Error(`Layout shift detected! Y moved ${totalShift}px from initial position`);
          }
        }
      }
    }
  }, 60000); // 60 second timeout for 20 draws

  test('should handle New Game button press followed by Draw', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByText('Draw')).toBeVisible();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Press New Game
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();

    // Press Draw immediately after - this is a common scenario where layout shift occurs
    await ctx.getByText('Draw').click();
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();

    // Press Draw again
    await ctx.getByText('Draw').click();
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();
  }, 15000);
});
