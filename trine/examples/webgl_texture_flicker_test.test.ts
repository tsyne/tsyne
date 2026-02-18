/**
 * Visual test for flicker elimination
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { PNG } from 'pngjs';
import { buildFlickerTest, FlickerTestDemo } from './webgl_texture_flicker_test';

const screenshotDir = path.join(__dirname, 'screenshots');

/**
 * Check if a screenshot is "mostly black" (indicating flicker).
 * Returns the percentage of non-black pixels in the central region.
 */
function getNonBlackPercent(filePath: string): number {
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const w = png.width;
  const h = png.height;
  // Check central 50% region
  const x0 = Math.floor(w * 0.25);
  const x1 = Math.floor(w * 0.75);
  const y0 = Math.floor(h * 0.25);
  const y1 = Math.floor(h * 0.75);
  let total = 0;
  let nonBlack = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      total++;
      // Consider pixel non-black if any channel > 10
      if (r > 10 || g > 10 || b > 10) {
        nonBlack++;
      }
    }
  }
  return (nonBlack / total) * 100;
}

describe('flicker elimination tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: FlickerTestDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  // TC1: textured + animated, TC5: solid color + animated
  // TC6 (textured, single render, no animation) is excluded — without an animation loop
  // there's no ongoing rendering to repopulate the back buffer after SwapBuffers,
  // making screenshot capture inherently unreliable for that case.
  for (const tc of [1, 5]) {
    test(`TC${tc} rapid screenshots for flicker detection`, async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window(
          { title: `Flicker Test ${tc}`, width: 800, height: 600 },
          (win) => {
            win.setContent(() => { app.label('Initializing...'); });
            win.show();
            setTimeout(async () => {
              demo = await buildFlickerTest(app, win, { testCase: tc });
            }, 100);
          }
        );
      });

      ctx = tsyneTest.getContext();
      await testApp.run();
      // Wait for scene to be fully set up
      await ctx.wait(2000);

      // Take 10 rapid screenshots at ~100ms intervals
      const results: { file: string; percent: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const file = path.join(screenshotDir, `flicker-tc${tc}-rapid-${i}.png`);
        await tsyneTest.screenshot(file);
        const percent = getNonBlackPercent(file);
        results.push({ file: path.basename(file), percent });
        await ctx.wait(100);
      }

      // Log results
      console.log(`\n=== Flicker Detection TC${tc} ===`);
      let flickerCount = 0;
      for (const r of results) {
        const status = r.percent > 5 ? 'VISIBLE' : 'BLACK';
        if (status === 'BLACK') flickerCount++;
        console.log(`  ${r.file}: ${r.percent.toFixed(1)}% non-black → ${status}`);
      }
      console.log(`  Flicker: ${flickerCount}/10 frames were black`);
      console.log('================================\n');

      // All frames should be visible (non-black)
      for (const r of results) {
        expect(r.percent).toBeGreaterThan(5);
      }
    }, 30000);
  }
});
