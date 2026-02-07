/**
 * Visual Test for webgl_lines_sphere
 *
 * Port of three.js example: three/examples/webgl_lines_sphere.html
 * Tests line geometry forming a sphere.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLLinesSphere, WebGLLinesSphereDemo } from './webgl_lines_sphere';

describe('three.js webgl - lines sphere', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLLinesSphereDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders lines forming a sphere', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - lines sphere', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLLinesSphere(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lines_sphere-t0.png'));
    console.log('Screenshot: webgl_lines_sphere-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lines_sphere-t500.png'));
    console.log('Screenshot: webgl_lines_sphere-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lines_sphere-t1000.png'));
    console.log('Screenshot: webgl_lines_sphere-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
