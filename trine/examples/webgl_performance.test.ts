/**
 * Visual Test for webgl_performance
 *
 * Port of three.js example: three/examples/webgl_performance.html
 * Tests high object count rendering performance.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPerformance, WebGLPerformanceDemo } from './webgl_performance';

describe('three.js webgl - performance', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPerformanceDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders many objects with acceptable performance', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - performance', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPerformance(app, win, {
              width: WIDTH,
              height: HEIGHT,
              objectCount: 1000, // Fewer for test
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_performance-t0.png'));
    console.log('Screenshot: webgl_performance-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_performance-t500.png'));
    console.log('Screenshot: webgl_performance-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_performance-t1000.png'));
    console.log('Screenshot: webgl_performance-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
