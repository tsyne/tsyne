/**
 * Visual Test for webgl_math_orientation_transform
 *
 * Port of three.js example: three/examples/webgl_math_orientation_transform.html
 * Tests ConeGeometry, SphereGeometry, MeshNormalMaterial, and quaternion rotation.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMathOrientationTransform, WebGLMathOrientationTransformDemo } from './webgl_math_orientation_transform';

describe('three.js webgl - math orientation transform', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMathOrientationTransformDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders cone tracking target with quaternion rotation', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - math orientation transform', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMathOrientationTransform(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_orientation_transform-t0.png'));
    console.log('Screenshot: webgl_math_orientation_transform-t0.png');

    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_orientation_transform-t1000.png'));
    console.log('Screenshot: webgl_math_orientation_transform-t1000.png');

    await ctx.wait(1500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_math_orientation_transform-t2500.png'));
    console.log('Screenshot: webgl_math_orientation_transform-t2500.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
