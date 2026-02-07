/**
 * Visual Test for webgl_buffergeometry_merge
 *
 * Tests merged geometries for batched rendering.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLBufferGeometryMerge, WebGLBufferGeometryMergeDemo } from './webgl_buffergeometry_merge';

describe('three.js webgl - buffergeometry - merge', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLBufferGeometryMergeDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders merged geometries', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - buffergeometry - merge', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLBufferGeometryMerge(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_merge-t0.png'));
    console.log('Screenshot: webgl_buffergeometry_merge-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_merge-t500.png'));
    console.log('Screenshot: webgl_buffergeometry_merge-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_merge-t1000.png'));
    console.log('Screenshot: webgl_buffergeometry_merge-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
