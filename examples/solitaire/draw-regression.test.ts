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

import { TsyneTest, TestContext, Locator } from '../../src/index-test';
import { createSolitaireApp } from './solitaire';
import { App } from '../../src/app';

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

    console.log('\n=== Starting Draw button regression test ===');
    console.log('Bug: Layout shifts after pressing Draw, making button unclickable');
    console.log('Test: Press Draw 20 times and log Y position after each press\n');

    let initialY: number | undefined;
    let previousY: number | undefined;

    // Press Draw 20 times - if layout shifts, button becomes unclickable
    for (let i = 0; i < 20; i++) {
      console.log(`Draw press ${i + 1}/20...`);

      try {
        const drawButton = ctx.getByText('Draw');

        // Get position before click
        const infoBefore = await drawButton.getInfo();

        // Click Draw - this will fail if button shifted out of position
        await drawButton.click();
        
        // Get position immediately after click
        const infoAfter = await drawButton.getInfo();
        const currentY = infoAfter.absoluteY;

        console.log(`  Before click Y: ${infoBefore.absoluteY}, After click Y: ${infoAfter.absoluteY}`);

        // Verify the click worked by checking status message
        await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();

        if (i === 0) {
          initialY = currentY;
          console.log(`  ✓ Click successful, initial absolute Y position: ${currentY}`);
        } else {
          const shiftFromInitial = currentY !== undefined && initialY !== undefined
            ? (currentY - initialY).toFixed(1)
            : 'unknown';
          const shiftFromPrevious = currentY !== undefined && previousY !== undefined
            ? (currentY - previousY).toFixed(1)
            : 'unknown';

          console.log(`  ✓ Click successful, absolute Y: ${currentY}, shift from initial: ${shiftFromInitial}px, from previous: ${shiftFromPrevious}px`);

          // Fail test if significant shift detected
          if (currentY !== undefined && initialY !== undefined) {
            const totalShift = Math.abs(currentY - initialY);
            if (totalShift > 2) {
              throw new Error(`Layout shift detected! Y moved ${totalShift}px from initial position`);
            }
          }
        }

        previousY = currentY;

        // Traverse up the parent hierarchy and log their positions
        let parentLocator: Locator | null = drawButton;
        for (let level = 0; level < 5; level++) { // Check up to 5 levels
            try {
                if (level > 0 && parentLocator) {
                    parentLocator = await parentLocator.getParent();
                }
                if (!parentLocator) break;

                const parentInfo = await parentLocator.getInfo();
                console.log(`  [Parent L${level}] type: ${parentInfo.type}, id: ${parentInfo.id}, absY: ${parentInfo.absoluteY}`);

            } catch (e) {
                // This will happen if a widget has no parent, which is expected for the root
                break;
            }
        }

      } catch (error) {
        console.error(`\n❌ REGRESSION DETECTED at press ${i + 1}!`);
        console.error(`   Error: ${error}`);

        // Try to get all visible text for debugging
        try {
          const allText = await ctx.getAllTextAsString();
          console.error(`\n   Visible UI state:\n${allText}`);
        } catch (e) {
          console.error(`   Could not retrieve UI state: ${e}`);
        }

        throw error;
      }
    }

    console.log('\n✅ SUCCESS: Draw button remained clickable through 20 presses');
    console.log('   No layout shift detected\n');
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
    await new Promise(resolve => setTimeout(resolve, 200));
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();

    // Press Draw again
    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();
  }, 15000);
});
