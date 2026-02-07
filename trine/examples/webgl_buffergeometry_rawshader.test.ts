/**
 * Visual Test for webgl_buffergeometry_rawshader
 *
 * Port of three.js example: three/examples/webgl_buffergeometry_rawshader.html
 * Tests RawShaderMaterial with custom GLSL shaders.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildWebGLBufferGeometryRawShader,
  WebGLBufferGeometryRawShaderDemo,
} from './webgl_buffergeometry_rawshader';

describe('three.js webgl - raw shader', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLBufferGeometryRawShaderDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders rotating triangles with raw shader', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - raw shader', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLBufferGeometryRawShader(app, win, {
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
      path.join(screenshotDir, 'webgl_buffergeometry_rawshader-t0.png')
    );
    console.log('Screenshot: webgl_buffergeometry_rawshader-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_buffergeometry_rawshader-t500.png')
    );
    console.log('Screenshot: webgl_buffergeometry_rawshader-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_buffergeometry_rawshader-t1000.png')
    );
    console.log('Screenshot: webgl_buffergeometry_rawshader-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
