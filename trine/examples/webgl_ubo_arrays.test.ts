/**
 * Visual Test for webgl_ubo_arrays
 *
 * Port of three.js example: three/examples/webgl_ubo_arrays.html
 * Tests Uniform Buffer Objects (UBO) with array uniforms for multiple
 * animated point lights across a grid of 100 spheres and a ground plane.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLUBOArrays, WebGLUBOArraysDemo } from './webgl_ubo_arrays';

describe('three.js WebGL 2 - Uniform Buffer Objects Arrays', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLUBOArraysDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders UBO arrays scene with spheres and animated point lights', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js WebGL 2 - Uniform Buffer Objects Arrays', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLUBOArrays(app, win, {
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

    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_ubo_arrays-t500.png')
    );
    console.log('Screenshot: webgl_ubo_arrays-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_ubo_arrays-t1000.png')
    );
    console.log('Screenshot: webgl_ubo_arrays-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
