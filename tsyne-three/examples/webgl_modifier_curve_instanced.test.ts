/**
 * Visual Test for webgl_modifier_curve_instanced
 *
 * Port of three.js example: three/examples/webgl_modifier_curve_instanced.html
 * Tests InstancedMesh following multiple curve paths.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLModifierCurveInstanced, WebGLModifierCurveInstancedDemo } from './webgl_modifier_curve_instanced';

describe('three.js webgl - instanced curves', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLModifierCurveInstancedDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders many instances following curves', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - instanced curves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLModifierCurveInstanced(app, win, {
              width: WIDTH,
              height: HEIGHT,
              instanceCount: 300,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_modifier_curve_instanced-t0.png'));
    console.log('Screenshot: webgl_modifier_curve_instanced-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_modifier_curve_instanced-t500.png'));
    console.log('Screenshot: webgl_modifier_curve_instanced-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_modifier_curve_instanced-t1000.png'));
    console.log('Screenshot: webgl_modifier_curve_instanced-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
