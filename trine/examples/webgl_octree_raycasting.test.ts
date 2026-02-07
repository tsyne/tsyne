/**
 * Visual Test for webgl_octree_raycasting
 *
 * Port of three.js example: three/examples/webgl_octree_raycasting.html
 * Tests octree-accelerated raycasting with many objects.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLOctreeRaycasting, WebGLOctreeRaycastingDemo } from './webgl_octree_raycasting';

describe('three.js webgl - octree raycasting', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLOctreeRaycastingDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders raycasting with intersection highlighting', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - octree raycasting', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLOctreeRaycasting(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_octree_raycasting-t0.png'));
    console.log('Screenshot: webgl_octree_raycasting-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_octree_raycasting-t500.png'));
    console.log('Screenshot: webgl_octree_raycasting-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_octree_raycasting-t1000.png'));
    console.log('Screenshot: webgl_octree_raycasting-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
