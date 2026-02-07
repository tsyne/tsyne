/**
 * Visual Test for webgl_test_memory2
 *
 * Port of three.js example: three/examples/webgl_test_memory2.html
 * Runs the memory test II demo (100 spheres with ShaderMaterial replaced
 * every frame) and captures screenshots at intervals.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLTestMemory2, WebGLTestMemory2Demo } from './webgl_test_memory2';

describe('three.js webgl - memory test II', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLTestMemory2Demo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders spheres with dynamic ShaderMaterials', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - memory test II', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLTestMemory2(app, win, { width: WIDTH, height: HEIGHT });
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_test_memory2-t500.png'));
    console.log('Screenshot: webgl_test_memory2-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_test_memory2-t1000.png'));
    console.log('Screenshot: webgl_test_memory2-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
