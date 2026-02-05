/**
 * Visual Test for webgl_math_obb
 *
 * Tests bounding box visualization.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMathObb, WebGLMathObbDemo } from './webgl_math_obb';

describe('three.js webgl - math - OBB', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMathObbDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders bounding boxes', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - math - OBB', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMathObb(app, win, {
              width: WIDTH,
              height: HEIGHT,
            });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_obb-t0.png'));
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_obb-t500.png'));
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_obb-t1000.png'));

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
