/**
 * Visual Test for webgl_refraction
 *
 * Port of three.js example: three/examples/webgl_refraction.html
 * Tests refraction effect with WaterRefractionShader, dudv distortion map,
 * colored walls, and animated sphere.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLRefraction, WebGLRefractionDemo } from './webgl_refraction';

describe('three.js webgl - refraction', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLRefractionDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders refraction scene with animated sphere', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - refraction', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLRefraction(app, win, {
              width: WIDTH,
              height: HEIGHT,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_refraction-t0.png'));
    console.log('Screenshot: webgl_refraction-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_refraction-t500.png'));
    console.log('Screenshot: webgl_refraction-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_refraction-t1000.png'));
    console.log('Screenshot: webgl_refraction-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
