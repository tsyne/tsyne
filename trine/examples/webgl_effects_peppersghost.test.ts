/**
 * Visual Test for webgl_effects_peppersghost
 *
 * Port of three.js example: three/examples/webgl_effects_peppersghost.html
 * Tests pepper's ghost illusion with 4-way reflection.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLEffectsPeppersGhost, WebGLEffectsPeppersGhostDemo } from './webgl_effects_peppersghost';

describe("three.js webgl - effects - pepper's ghost", () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLEffectsPeppersGhostDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test("renders pepper's ghost 4-way holographic display", async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: "three.js webgl - effects - pepper's ghost", width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLEffectsPeppersGhost(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_peppersghost-t0.png'));
    console.log('Screenshot: webgl_effects_peppersghost-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_peppersghost-t500.png'));
    console.log('Screenshot: webgl_effects_peppersghost-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_effects_peppersghost-t1000.png'));
    console.log('Screenshot: webgl_effects_peppersghost-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
