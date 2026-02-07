/**
 * Visual Test for webgl_read_float_buffer
 *
 * Port of three.js example: three/examples/webgl_read_float_buffer.html
 * Tests render-to-texture with float render target, multi-scene rendering,
 * ShaderMaterial, MeshPhongMaterial on torus geometry, and float pixel readback.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildWebGLReadFloatBuffer,
  WebGLReadFloatBufferDemo,
} from './webgl_read_float_buffer';

describe('three.js webgl - read float buffer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLReadFloatBufferDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders float buffer scene with torus meshes and shader background', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - read float buffer', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLReadFloatBuffer(app, win, {
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
      path.join(screenshotDir, 'webgl_read_float_buffer-t0.png')
    );
    console.log('Screenshot: webgl_read_float_buffer-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_read_float_buffer-t500.png')
    );
    console.log('Screenshot: webgl_read_float_buffer-t500.png');

    if (demo) {
      const values = demo.getReadValues();
      console.log('Float buffer read values:', values);
    }

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_read_float_buffer-t1000.png')
    );
    console.log('Screenshot: webgl_read_float_buffer-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
