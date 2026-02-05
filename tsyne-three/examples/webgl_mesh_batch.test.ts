/**
 * Visual Test for webgl_mesh_batch
 *
 * Port of three.js example: three/examples/webgl_mesh_batch.html
 * Tests batched mesh rendering with many instances.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMeshBatch, WebGLMeshBatchDemo } from './webgl_mesh_batch';

describe('three.js webgl - mesh batch', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMeshBatchDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders many batched mesh instances', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - mesh batch', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMeshBatch(app, win, {
              width: WIDTH,
              height: HEIGHT,
              instanceCount: 500, // Fewer for faster test
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_mesh_batch-t0.png'));
    console.log('Screenshot: webgl_mesh_batch-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_mesh_batch-t500.png'));
    console.log('Screenshot: webgl_mesh_batch-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_mesh_batch-t1000.png'));
    console.log('Screenshot: webgl_mesh_batch-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
