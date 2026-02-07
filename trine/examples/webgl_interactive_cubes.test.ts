/**
 * Visual Test for webgl_interactive_cubes
 *
 * Port of three.js example: three/examples/webgl_interactive_cubes.html
 * Tests BoxGeometry, MeshLambertMaterial, DirectionalLight, and many mesh instances.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLInteractiveCubes, WebGLInteractiveCubesDemo } from './webgl_interactive_cubes';

describe('three.js webgl - interactive cubes', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLInteractiveCubesDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders many colored cubes with lighting', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - interactive cubes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLInteractiveCubes(app, win, {
              width: WIDTH,
              height: HEIGHT,
              cubeCount: 100, // Fewer cubes for faster test
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_interactive_cubes-t0.png'));
    console.log('Screenshot: webgl_interactive_cubes-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_interactive_cubes-t500.png'));
    console.log('Screenshot: webgl_interactive_cubes-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_interactive_cubes-t1000.png'));
    console.log('Screenshot: webgl_interactive_cubes-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
