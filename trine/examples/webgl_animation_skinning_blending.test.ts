/**
 * Visual Test for webgl_animation_skinning_blending
 *
 * Port of three.js example: three/examples/webgl_animation_skinning_blending.html
 * Tests procedural skinned mesh with animation blending.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLAnimationSkinningBlending, WebGLAnimationSkinningBlendingDemo } from './webgl_animation_skinning_blending';

describe('three.js webgl - animation skinning blending', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLAnimationSkinningBlendingDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders skinned mesh with blended animations', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - animation skinning blending', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLAnimationSkinningBlending(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_skinning_blending-t0.png'));
    console.log('Screenshot: webgl_animation_skinning_blending-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_skinning_blending-t500.png'));
    console.log('Screenshot: webgl_animation_skinning_blending-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_skinning_blending-t1000.png'));
    console.log('Screenshot: webgl_animation_skinning_blending-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
