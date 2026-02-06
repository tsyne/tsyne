/**
 * Visual Test for webgl_reversed_depth_buffer
 *
 * Port of three.js example: three/examples/webgl_reversed_depth_buffer.html
 * Tests reversed depth buffer rendering with pairs of nearly-coplanar
 * colored planes at exponentially increasing distances. Captures screenshots
 * at t500 and t1000 to verify correct depth precision behavior.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildWebGLReversedDepthBuffer,
  WebGLReversedDepthBufferDemo,
} from './webgl_reversed_depth_buffer';

describe('three.js webgl - reverse depth buffer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLReversedDepthBufferDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders coplanar planes with reversed depth buffer', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - reverse depth buffer', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLReversedDepthBuffer(app, win, {
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
      path.join(screenshotDir, 'webgl_reversed_depth_buffer-t0.png')
    );
    console.log('Screenshot: webgl_reversed_depth_buffer-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_reversed_depth_buffer-t500.png')
    );
    console.log('Screenshot: webgl_reversed_depth_buffer-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_reversed_depth_buffer-t1000.png')
    );
    console.log('Screenshot: webgl_reversed_depth_buffer-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
