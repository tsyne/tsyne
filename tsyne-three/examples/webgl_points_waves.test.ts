/**
 * Visual Test for webgl_points_waves
 *
 * Port of three.js example: three/examples/webgl_points_waves.html
 * Tests dynamic vertex position updates with wave animation.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPointsWaves, WebGLPointsWavesDemo } from './webgl_points_waves';

describe('three.js webgl - particles waves', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPointsWavesDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders animated wave of particles', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - particles waves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPointsWaves(app, win, {
              width: WIDTH,
              height: HEIGHT,
              amountX: 30, // Smaller grid for faster test
              amountY: 30,
            });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization + some frames
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_waves-t0.png'));
    console.log('Screenshot: webgl_points_waves-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_waves-t500.png'));
    console.log('Screenshot: webgl_points_waves-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_waves-t1000.png'));
    console.log('Screenshot: webgl_points_waves-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
