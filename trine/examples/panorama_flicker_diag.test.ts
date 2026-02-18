import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { PNG } from 'pngjs';
import { buildWebGLPanoramaCube } from './webgl_panorama_cube';

function analyzeScreenshot(filePath: string): { nonBlackPercent: number; avgR: number; avgG: number; avgB: number } {
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const w = png.width;
  const h = png.height;
  const x0 = Math.floor(w * 0.25);
  const x1 = Math.floor(w * 0.75);
  const y0 = Math.floor(h * 0.25);
  const y1 = Math.floor(h * 0.75);
  let total = 0;
  let nonBlack = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      total++;
      sumR += r; sumG += g; sumB += b;
      if (r > 10 || g > 10 || b > 10) nonBlack++;
    }
  }
  return {
    nonBlackPercent: (nonBlack / total) * 100,
    avgR: sumR / total,
    avgG: sumG / total,
    avgB: sumB / total,
  };
}

describe('panorama cube flicker diagnostic', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: any = null;

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('rapid screenshots', async () => {
    tsyneTest = new TsyneTest({ headed: true });
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'Panorama Cube Flicker Diag', width: 800, height: 600 },
        (win) => {
          win.setContent(() => { app.label('Initializing...'); });
          win.show();
          setTimeout(async () => {
            demo = await buildWebGLPanoramaCube(app, win, { width: 800, height: 600 });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(3000);

    console.log('\n=== Panorama Cube Rapid Screenshot Analysis ===');
    for (let i = 0; i < 20; i++) {
      const file = path.join(screenshotDir, `panorama-diag-${i}.png`);
      await tsyneTest.screenshot(file);
      const stats = analyzeScreenshot(file);
      const status = stats.nonBlackPercent > 5 ? 'OK' : 'BLACK';
      console.log(`  ${i}: ${stats.nonBlackPercent.toFixed(1)}% non-black, avgRGB=(${stats.avgR.toFixed(0)},${stats.avgG.toFixed(0)},${stats.avgB.toFixed(0)}) ${status}`);
      await ctx.wait(50);
    }
    console.log('==============================================\n');
  }, 60000);
});
