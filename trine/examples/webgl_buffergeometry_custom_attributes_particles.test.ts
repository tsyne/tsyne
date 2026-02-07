/**
 * Visual Test for webgl_buffergeometry_custom_attributes_particles
 *
 * Port of three.js example: three/examples/webgl_buffergeometry_custom_attributes_particles.html
 * Tests BufferGeometry with custom per-particle attributes and ShaderMaterial.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLBufferGeometryCustomAttributesParticles, WebGLBufferGeometryCustomAttributesParticlesDemo } from './webgl_buffergeometry_custom_attributes_particles';

describe('three.js webgl - custom particle attributes', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLBufferGeometryCustomAttributesParticlesDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders particles with custom attributes', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - custom particle attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLBufferGeometryCustomAttributesParticles(app, win, {
              width: WIDTH,
              height: HEIGHT,
              particleCount: 5000,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_custom_attributes_particles-t0.png'));
    console.log('Screenshot: webgl_buffergeometry_custom_attributes_particles-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_custom_attributes_particles-t500.png'));
    console.log('Screenshot: webgl_buffergeometry_custom_attributes_particles-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_custom_attributes_particles-t1000.png'));
    console.log('Screenshot: webgl_buffergeometry_custom_attributes_particles-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
