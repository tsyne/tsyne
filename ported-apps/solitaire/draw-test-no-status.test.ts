/**
 * Test for layout shift WITHOUT relying on status label
 * This proves whether the status label is masking the issue or actually fixing it
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createSolitaireApp } from './solitaire';
import { App } from 'tsyne';

describe('Draw Button Layout Test (No Status Label Dependency)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should keep Draw button Y position stable WITHOUT status label', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to load — use stable widget ID with retry
    await ctx.getById('draw-btn').within(2000).shouldExist();

    let initialY: number | undefined;
    const yPositions: number[] = [];

    // Press Draw 20 times and track Y position
    for (let i = 0; i < 20; i++) {
      // Use getById with within() to handle async UI rebuilds
      await ctx.getById('draw-btn').within(2000).click();

      // Wait for rebuild to fully complete (withId registrations are async)
      await ctx.getById('draw-btn').within(2000).shouldExist();
      // Extra wait for setContent to finish processing old widget removal
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get position after rebuild
      const infoAfter = await ctx.getById('draw-btn').within(1000).getInfo();
      const currentY = infoAfter.absoluteY;

      if (currentY === undefined) {
        throw new Error(`Button Y position is undefined at click ${i + 1}`);
      }

      yPositions.push(currentY);

      if (i === 0) {
        initialY = currentY;
      } else {
        const shift = currentY - initialY!;

        // Fail if we detect shift
        if (Math.abs(shift) > 2) {
          console.error(`\n❌ LAYOUT SHIFT DETECTED!`);
          console.error(`   Y positions over time: ${yPositions.join(', ')}`);
          throw new Error(`Layout shifted ${shift}px after ${i + 1} clicks`);
        }
      }
    }
  }, 60000);
});
