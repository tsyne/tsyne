/**
 * Visual Test for webgl_raycaster_texture
 *
 * Port of three.js example: three/examples/webgl_raycaster_texture.html
 * Tests raycasting to find UV coordinates on mesh surfaces, DataTexture with
 * procedural UV grid and crosshair overlay, and animated texture parameters.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLRaycasterTexture, WebGLRaycasterTextureDemo } from './webgl_raycaster_texture';

describe('three.js webgl - raycaster texture', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLRaycasterTextureDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders textured meshes with raycasting and animated texture params', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - raycaster texture', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLRaycasterTexture(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_raycaster_texture-t0.png'));
    console.log('Screenshot: webgl_raycaster_texture-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_raycaster_texture-t500.png'));
    console.log('Screenshot: webgl_raycaster_texture-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_raycaster_texture-t1000.png'));
    console.log('Screenshot: webgl_raycaster_texture-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
