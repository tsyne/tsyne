/**
 * Visual Test for webgl_animation_multiple
 *
 * Port of three.js example: three/examples/webgl_animation_multiple.html
 * Tests multiple animated objects with independent animations.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLAnimationMultiple, WebGLAnimationMultipleDemo } from './webgl_animation_multiple';

describe('three.js webgl - animation multiple', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLAnimationMultipleDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders multiple animated figures', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - animation multiple', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLAnimationMultiple(app, win, {
              width: WIDTH,
              height: HEIGHT,
              objectCount: 8,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_multiple-t0.png'));
    console.log('Screenshot: webgl_animation_multiple-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_multiple-t500.png'));
    console.log('Screenshot: webgl_animation_multiple-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_multiple-t1000.png'));
    console.log('Screenshot: webgl_animation_multiple-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
