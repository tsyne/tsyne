/**
 * Visual Test for webgl_texture3d_partialupdate
 *
 * Port of three.js example: three/examples/webgl_texture3d_partialupdate.html
 * Tests Data3DTexture volume rendering with partial texture updates via
 * copyTextureToTexture, using a RawShaderMaterial GLSL3 raymarcher.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildWebGLTexture3dPartialupdate,
  WebGLTexture3dPartialupdateDemo,
} from './webgl_texture3d_partialupdate';

describe('three.js webgl2 - volume - cloud (3D texture partial update)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLTexture3dPartialupdateDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders volume cloud with partial 3D texture updates', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        {
          title: 'three.js webgl2 - volume - cloud',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLTexture3dPartialupdate(app, win, {
              width: WIDTH,
              height: HEIGHT,
            });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization + some frames + at least one partial update
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_texture3d_partialupdate-t500.png')
    );
    console.log('Screenshot: webgl_texture3d_partialupdate-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(
      path.join(screenshotDir, 'webgl_texture3d_partialupdate-t1000.png')
    );
    console.log('Screenshot: webgl_texture3d_partialupdate-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
