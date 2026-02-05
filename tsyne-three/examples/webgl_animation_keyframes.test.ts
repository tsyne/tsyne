/**
 * Visual Test for webgl_animation_keyframes
 *
 * Tests AnimationMixer with keyframe tracks.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLAnimationKeyframes, WebGLAnimationKeyframesDemo } from './webgl_animation_keyframes';

describe('three.js webgl - animation - keyframes', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLAnimationKeyframesDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders keyframe animations', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - animation - keyframes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLAnimationKeyframes(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_keyframes-t0.png'));
    console.log('Screenshot: webgl_animation_keyframes-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_keyframes-t500.png'));
    console.log('Screenshot: webgl_animation_keyframes-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_keyframes-t1000.png'));
    console.log('Screenshot: webgl_animation_keyframes-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
