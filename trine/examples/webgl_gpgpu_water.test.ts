/**
 * Visual Test for webgl_gpgpu_water
 *
 * Port of three.js example: three/examples/webgl_gpgpu_water.html
 * Tests water surface wave simulation.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLGPGPUWater, WebGLGPGPUWaterDemo } from './webgl_gpgpu_water';

describe('three.js webgl - gpgpu - water', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLGPGPUWaterDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders water wave simulation', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - gpgpu - water', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLGPGPUWater(app, win, {
              width: WIDTH,
              height: HEIGHT,
              resolution: 48,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_water-t0.png'));
    console.log('Screenshot: webgl_gpgpu_water-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_water-t500.png'));
    console.log('Screenshot: webgl_gpgpu_water-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_water-t1000.png'));
    console.log('Screenshot: webgl_gpgpu_water-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
