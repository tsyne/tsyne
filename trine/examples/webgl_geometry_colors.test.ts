/**
 * Visual Test for webgl_geometry_colors
 *
 * Port of three.js example: three/examples/webgl_geometry_colors.html
 * Tests vertex colors with MeshPhongMaterial, wireframes, and DirectionalLight.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLGeometryColors, WebGLGeometryColorsDemo } from './webgl_geometry_colors';

describe('three.js webgl - geometry colors', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLGeometryColorsDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders vertex-colored icosahedrons with wireframes', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - vertex colors', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLGeometryColors(app, win, {
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

    // Capture at different camera positions as it orbits
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_colors-t0.png'));
    console.log('Screenshot: webgl_geometry_colors-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_colors-t500.png'));
    console.log('Screenshot: webgl_geometry_colors-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_colors-t1000.png'));
    console.log('Screenshot: webgl_geometry_colors-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
