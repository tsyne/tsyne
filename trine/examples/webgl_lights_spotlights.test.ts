/**
 * Visual Test for webgl_lights_spotlights
 *
 * Port of three.js example: three/examples/webgl_lights_spotlights.html
 * Runs the demo and captures screenshots at intervals.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLLightsSpotlights, WebGLLightsSpotlightsDemo } from './webgl_lights_spotlights';

describe('three.js webgl - lights - spotlights', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLLightsSpotlightsDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders scene with three spotlights on floor and box', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - lights - spotlights', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLLightsSpotlights(app, win, { width: WIDTH, height: HEIGHT });
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lights_spotlights-t0.png'));
    console.log('Screenshot: webgl_lights_spotlights-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lights_spotlights-t500.png'));
    console.log('Screenshot: webgl_lights_spotlights-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_lights_spotlights-t1000.png'));
    console.log('Screenshot: webgl_lights_spotlights-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
