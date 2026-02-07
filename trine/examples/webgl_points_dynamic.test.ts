/**
 * Visual Test for webgl_points_dynamic
 *
 * Tests dynamic particle system with physics.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPointsDynamic, WebGLPointsDynamicDemo } from './webgl_points_dynamic';

describe('three.js webgl - points - dynamic', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPointsDynamicDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders dynamic particles', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - points - dynamic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPointsDynamic(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_dynamic-t0.png'));
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_dynamic-t500.png'));
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_points_dynamic-t1000.png'));

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
