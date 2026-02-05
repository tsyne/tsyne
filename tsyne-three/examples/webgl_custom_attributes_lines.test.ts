/**
 * Visual Test for webgl_custom_attributes_lines
 *
 * Port of three.js example: three/examples/webgl_custom_attributes_lines.html
 * Tests custom per-vertex attributes on line geometry with shaders.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLCustomAttributesLines, WebGLCustomAttributesLinesDemo } from './webgl_custom_attributes_lines';

describe('three.js webgl - custom line attributes', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLCustomAttributesLinesDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders lines with custom vertex attributes', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - custom line attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLCustomAttributesLines(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_custom_attributes_lines-t0.png'));
    console.log('Screenshot: webgl_custom_attributes_lines-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_custom_attributes_lines-t500.png'));
    console.log('Screenshot: webgl_custom_attributes_lines-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_custom_attributes_lines-t1000.png'));
    console.log('Screenshot: webgl_custom_attributes_lines-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
