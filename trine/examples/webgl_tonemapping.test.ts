/**
 * Visual Test for webgl_tonemapping
 *
 * Port of three.js example: three/examples/webgl_tonemapping.html
 * Runs the demo and captures screenshots at intervals.
 *
 * Tests tone mapping by cycling through different modes:
 * - Neutral (default, matching original example)
 * - ACESFilmic
 * - Reinhard
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLTonemapping, WebGLTonemappingDemo } from './webgl_tonemapping';

describe('three.js webgl - tone mapping', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLTonemappingDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders scene with tone mapping', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - tone mapping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLTonemapping(app, win, { width: WIDTH, height: HEIGHT });
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

    // Screenshot at t0 (Neutral tone mapping, default)
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_tonemapping-t0.png'));
    console.log('Screenshot: webgl_tonemapping-t0.png');

    await ctx.wait(500);

    // Screenshot at t500
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_tonemapping-t500.png'));
    console.log('Screenshot: webgl_tonemapping-t500.png');

    await ctx.wait(500);

    // Screenshot at t1000
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_tonemapping-t1000.png'));
    console.log('Screenshot: webgl_tonemapping-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
