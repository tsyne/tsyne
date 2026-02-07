/**
 * Visual Test for webgl_shaders_ocean
 *
 * Port of three.js example: three/examples/webgl_shaders_ocean.html
 * Runs the demo and captures screenshots at intervals.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLShadersOcean, WebGLShadersOceanDemo } from './webgl_shaders_ocean';

describe('three.js webgl - shaders - ocean', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLShadersOceanDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders ocean with water reflections, sky, and floating box', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - shaders - ocean', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLShadersOcean(app, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization + texture loading + environment map generation + some frames
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_shaders_ocean-t0.png'));
    console.log('Screenshot: webgl_shaders_ocean-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_shaders_ocean-t500.png'));
    console.log('Screenshot: webgl_shaders_ocean-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_shaders_ocean-t1000.png'));
    console.log('Screenshot: webgl_shaders_ocean-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
