/**
 * Visual Test for webgl_animation_oscillators
 *
 * Tests oscillating objects with phase-shifted animations.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLAnimationOscillators, WebGLAnimationOscillatorsDemo } from './webgl_animation_oscillators';

describe('three.js webgl - animation oscillators', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLAnimationOscillatorsDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders oscillating objects grid', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - animation oscillators', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLAnimationOscillators(app, win, {
              width: WIDTH,
              height: HEIGHT,
              objectCount: 64,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_oscillators-t0.png'));
    console.log('Screenshot: webgl_animation_oscillators-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_oscillators-t500.png'));
    console.log('Screenshot: webgl_animation_oscillators-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_oscillators-t1000.png'));
    console.log('Screenshot: webgl_animation_oscillators-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
