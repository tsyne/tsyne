/**
 * Visual Test for webgl_portal
 *
 * Port of three.js example: three/examples/webgl_portal.html
 * Tests portal rendering with CameraUtils.frameCorners, WebGLRenderTarget,
 * animated icospheres, Cornell box walls, and multiple colored PointLights.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPortal, WebGLPortalDemo } from './webgl_portal';

describe('three.js webgl - portal', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPortalDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders portal scene with bouncing icospheres and colored walls', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - portal', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPortal(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_portal-t0.png'));
    console.log('Screenshot: webgl_portal-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_portal-t500.png'));
    console.log('Screenshot: webgl_portal-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_portal-t1000.png'));
    console.log('Screenshot: webgl_portal-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
