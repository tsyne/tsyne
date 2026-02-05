/**
 * Visual Test for webgl_wireframes_complex
 *
 * Tests complex wireframe structures with animation.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLWireframesComplex, WebGLWireframesComplexDemo } from './webgl_wireframes_complex';

describe('three.js webgl - wireframes complex', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLWireframesComplexDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders complex wireframe structures', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - wireframes complex', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLWireframesComplex(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_wireframes_complex-t0.png'));
    console.log('Screenshot: webgl_wireframes_complex-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_wireframes_complex-t500.png'));
    console.log('Screenshot: webgl_wireframes_complex-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_wireframes_complex-t1000.png'));
    console.log('Screenshot: webgl_wireframes_complex-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
