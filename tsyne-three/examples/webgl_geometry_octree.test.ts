/**
 * Visual Test for webgl_geometry_octree
 *
 * Tests octree visualization with wireframe boxes.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLGeometryOctree, WebGLGeometryOctreeDemo } from './webgl_geometry_octree';

describe('three.js webgl - geometry octree', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLGeometryOctreeDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders octree spatial subdivision', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - geometry octree', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLGeometryOctree(app, win, {
              width: WIDTH,
              height: HEIGHT,
              maxDepth: 3,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_octree-t0.png'));
    console.log('Screenshot: webgl_geometry_octree-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_octree-t500.png'));
    console.log('Screenshot: webgl_geometry_octree-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_geometry_octree-t1000.png'));
    console.log('Screenshot: webgl_geometry_octree-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
