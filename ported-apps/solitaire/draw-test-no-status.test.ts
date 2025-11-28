/**
 * Test for layout shift WITHOUT relying on status label
 * This proves whether the status label is masking the issue or actually fixing it
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createSolitaireApp } from './solitaire';
import { App } from '../../src/app';

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

    // Wait for UI to load
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n=== Testing layout stability WITHOUT status label dependency ===');

    let initialY: number | undefined;
    const yPositions: number[] = [];

    // Press Draw 20 times and track Y position
    for (let i = 0; i < 20; i++) {
      const drawButton = ctx.getByText('Draw');

      const infoBefore = await drawButton.getInfo();
      await drawButton.click();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update

      const infoAfter = await drawButton.getInfo();
      const currentY = infoAfter.absoluteY;

      if (currentY === undefined) {
        throw new Error(`Button Y position is undefined at click ${i + 1}`);
      }

      yPositions.push(currentY);

      if (i === 0) {
        initialY = currentY;
        console.log(`Initial Y: ${currentY}`);
      } else {
        const shift = currentY - initialY!;
        console.log(`Press ${i + 1}: Y=${currentY}, shift=${shift}px`);

        // Fail if we detect shift
        if (Math.abs(shift) > 2) {
          console.error(`\n❌ LAYOUT SHIFT DETECTED!`);
          console.error(`   Y positions over time: ${yPositions.join(', ')}`);
          throw new Error(`Layout shifted ${shift}px after ${i + 1} clicks`);
        }
      }
    }

    console.log(`\n✅ SUCCESS: Y position stable across 20 clicks`);
    console.log(`   All Y positions: ${yPositions.join(', ')}`);
  }, 60000);
});
