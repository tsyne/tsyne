/**
 * Visual Test for webgl_animation_groups
 *
 * Port of three.js example: three/examples/webgl_animation_groups.html
 * Tests AnimationObjectGroup for synchronized animations.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLAnimationGroups, WebGLAnimationGroupsDemo } from './webgl_animation_groups';

describe('three.js webgl - animation groups', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLAnimationGroupsDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders synchronized animated objects', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - animation groups', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLAnimationGroups(app, win, {
              width: WIDTH,
              height: HEIGHT,
              objectCount: 12,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_groups-t0.png'));
    console.log('Screenshot: webgl_animation_groups-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_groups-t500.png'));
    console.log('Screenshot: webgl_animation_groups-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_animation_groups-t1000.png'));
    console.log('Screenshot: webgl_animation_groups-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
