/**
 * Visual Test for webgl_materials_normalmap
 *
 * Port of three.js example: three/examples/webgl_materials_normalmap.html
 * Tests normal mapping with procedurally generated normal map textures.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMaterialsNormalmap, WebGLMaterialsNormalmapDemo } from './webgl_materials_normalmap';

describe('three.js webgl - normal mapping', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMaterialsNormalmapDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders surfaces with normal mapping', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - normal mapping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMaterialsNormalmap(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_normalmap-t0.png'));
    console.log('Screenshot: webgl_materials_normalmap-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_normalmap-t500.png'));
    console.log('Screenshot: webgl_materials_normalmap-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_normalmap-t1000.png'));
    console.log('Screenshot: webgl_materials_normalmap-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
