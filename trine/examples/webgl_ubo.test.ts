/**
 * Visual Test for webgl_ubo
 *
 * Port of three.js example: three/examples/webgl_ubo.html
 * Tests Uniform Buffer Objects (UBO) with shared camera and lighting data
 * across 200 meshes using RawShaderMaterial with GLSL3 Phong shading.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLUBO, WebGLUBODemo } from './webgl_ubo';

describe('three.js WebGL 2 - Uniform Buffer Objects', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLUBODemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders UBO scene with tetrahedra and textured boxes', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js WebGL 2 - Uniform Buffer Objects', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLUBO(app, win, {
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
      path.join(screenshotDir, 'webgl_ubo-t500.png')
    );
    console.log('Screenshot: webgl_ubo-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_ubo-t1000.png')
    );
    console.log('Screenshot: webgl_ubo-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
