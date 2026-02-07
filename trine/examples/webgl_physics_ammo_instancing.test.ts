/**
 * Visual Test for webgl_physics_ammo_instancing
 *
 * Port of three.js example: three/examples/webgl_physics_ammo_instancing.html
 * Tests instanced mesh with physics simulation.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPhysicsAmmoInstancing, WebGLPhysicsAmmoInstancingDemo } from './webgl_physics_ammo_instancing';

describe('three.js webgl - physics ammo instancing', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPhysicsAmmoInstancingDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders many falling spheres with physics', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - physics ammo instancing', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPhysicsAmmoInstancing(app, win, {
              width: WIDTH,
              height: HEIGHT,
              instanceCount: 200, // Fewer for test
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_instancing-t0.png'));
    console.log('Screenshot: webgl_physics_ammo_instancing-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_instancing-t500.png'));
    console.log('Screenshot: webgl_physics_ammo_instancing-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_instancing-t1000.png'));
    console.log('Screenshot: webgl_physics_ammo_instancing-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
