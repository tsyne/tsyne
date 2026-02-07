/**
 * Visual Test for webgl_clipping_stencil
 *
 * Port of three.js example: three/examples/webgl_clipping_stencil.html
 * Tests stencil buffer operations with clipping planes.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLClippingStencil, WebGLClippingStencilDemo } from './webgl_clipping_stencil';

describe('three.js webgl - stencil clipping', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLClippingStencilDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders clipped geometry with stencil caps', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - stencil clipping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLClippingStencil(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipping_stencil-t0.png'));
    console.log('Screenshot: webgl_clipping_stencil-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipping_stencil-t500.png'));
    console.log('Screenshot: webgl_clipping_stencil-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipping_stencil-t1000.png'));
    console.log('Screenshot: webgl_clipping_stencil-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
