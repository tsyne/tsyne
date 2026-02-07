/**
 * Visual Test for webgl_gpgpu_birds_gltf
 *
 * Port of three.js example: three/examples/webgl_gpgpu_birds_gltf.html
 * Tests flocking simulation with detailed procedural birds.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLGPGPUBirdsGLTF, WebGLGPGPUBirdsGLTFDemo } from './webgl_gpgpu_birds_gltf';

describe('three.js webgl - gpgpu birds (procedural)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLGPGPUBirdsGLTFDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders flocking birds with detailed meshes', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - gpgpu birds (procedural)', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLGPGPUBirdsGLTF(app, win, {
              width: WIDTH,
              height: HEIGHT,
              birdCount: 30,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_birds_gltf-t0.png'));
    console.log('Screenshot: webgl_gpgpu_birds_gltf-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_birds_gltf-t500.png'));
    console.log('Screenshot: webgl_gpgpu_birds_gltf-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_gpgpu_birds_gltf-t1000.png'));
    console.log('Screenshot: webgl_gpgpu_birds_gltf-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
