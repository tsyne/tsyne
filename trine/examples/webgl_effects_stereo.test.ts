/**
 * Visual Test for webgl_effects_stereo
 *
 * Port of three.js example: three/examples/webgl_effects_stereo.html
 * Tests side-by-side stereo rendering for VR.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLEffectsStereo, WebGLEffectsStereoDemo } from './webgl_effects_stereo';

describe('three.js webgl - effects - stereo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLEffectsStereoDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders side-by-side stereo view', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - effects - stereo', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLEffectsStereo(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_stereo-t0.png'));
    console.log('Screenshot: webgl_effects_stereo-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_stereo-t500.png'));
    console.log('Screenshot: webgl_effects_stereo-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_stereo-t1000.png'));
    console.log('Screenshot: webgl_effects_stereo-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
