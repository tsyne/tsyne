/**
 * Visual Test for webgl_physics_ammo_break
 *
 * Port of three.js example: three/examples/webgl_physics_ammo_break.html
 * Tests simulated breaking/fracturing effect.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLPhysicsAmmoBreak, WebGLPhysicsAmmoBreakDemo } from './webgl_physics_ammo_break';

describe('three.js webgl - physics ammo break', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLPhysicsAmmoBreakDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders breaking objects with fragments', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - physics ammo break', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLPhysicsAmmoBreak(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_break-t0.png'));
    console.log('Screenshot: webgl_physics_ammo_break-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_break-t500.png'));
    console.log('Screenshot: webgl_physics_ammo_break-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_physics_ammo_break-t1000.png'));
    console.log('Screenshot: webgl_physics_ammo_break-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
