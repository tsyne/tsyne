/**
 * Visual Test for webgl_random_uv
 *
 * Simplified port of three.js example: three/examples/webgl_random_uv.html
 * Runs the demo and captures screenshots at intervals.
 *
 * This test demonstrates the random UV tiling technique:
 * - Left plane: Regular tiled texture (shows repetition)
 * - Right plane: Random UV tiling (breaks repetition)
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLRandomUV, WebGLRandomUVDemo } from './webgl_random_uv';

describe('three.js webgl - random UV', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLRandomUVDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders side-by-side comparison of regular vs random UV tiling', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - random UV', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLRandomUV(app, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization + texture loading
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_random_uv-t0.png'));
    console.log('Screenshot: webgl_random_uv-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_random_uv-t500.png'));
    console.log('Screenshot: webgl_random_uv-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_random_uv-t1000.png'));
    console.log('Screenshot: webgl_random_uv-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
