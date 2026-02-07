/**
 * Visual Test for webgl_materials_texture_partialupdate
 *
 * Port of three.js example: three/examples/webgl_materials_texture_partialupdate.html
 * Tests dynamic painting on textures with partial updates.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMaterialsTexturePartialupdate, WebGLMaterialsTexturePartialupdateDemo } from './webgl_materials_texture_partialupdate';

describe('three.js webgl - partial texture updates', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMaterialsTexturePartialupdateDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders dynamically painted texture', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - partial texture updates', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMaterialsTexturePartialupdate(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_texture_partialupdate-t0.png'));
    console.log('Screenshot: webgl_materials_texture_partialupdate-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_texture_partialupdate-t500.png'));
    console.log('Screenshot: webgl_materials_texture_partialupdate-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_materials_texture_partialupdate-t1000.png'));
    console.log('Screenshot: webgl_materials_texture_partialupdate-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
