/**
 * Visual test for heterogeneous calculator — captures screenshots
 * to diagnose flickering and verify rendering.
 */

import { TsyneTest, TestContext } from 'tsyne';
import type { App } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildHeterogeneousCalculator } from '../../examples/heterogeneous-calculator';

// Ensure three.js is set up before this test imports trine/integration


describe('Heterogeneous Calculator', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('renders mixed CVG + Three.js + Fyne UI', async () => {
    tsyneTest = new TsyneTest({ headed: true });

    const testApp = await tsyneTest.createApp((a: App) => {
      buildHeterogeneousCalculator(a);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for all 11 GL canvases to initialize and render a few frames
    await ctx.wait(3000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'hetcalc-t3000.png'));
    console.log('Screenshot: hetcalc-t3000.png');

    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'hetcalc-t4000.png'));
    console.log('Screenshot: hetcalc-t4000.png');

    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'hetcalc-t5000.png'));
    console.log('Screenshot: hetcalc-t5000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 60000);
});
