/**
 * Visual Test for webgl_clipculldistance
 *
 * Port of three.js example: three/examples/webgl_clipculldistance.html
 * Tests ShaderMaterial with WEBGL_clip_cull_distance extension for vertex
 * shader clipping via gl_ClipDistance. Captures screenshots at intervals
 * to verify the oscillating clip plane effect.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLClipCullDistance, WebGLClipCullDistanceDemo } from './webgl_clipculldistance';

describe('three.js webgl - clip cull distance', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLClipCullDistanceDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders triangles with oscillating clip distance', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - clip cull distance', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLClipCullDistance(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipculldistance-t0.png'));
    console.log('Screenshot: webgl_clipculldistance-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipculldistance-t500.png'));
    console.log('Screenshot: webgl_clipculldistance-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_clipculldistance-t1000.png'));
    console.log('Screenshot: webgl_clipculldistance-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
