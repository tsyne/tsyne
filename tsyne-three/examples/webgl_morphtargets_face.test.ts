/**
 * Visual Test for webgl_morphtargets_face
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMorphtargetsFace, WebGLMorphtargetsFaceDemo } from './webgl_morphtargets_face';

describe('three.js webgl - morphtargets face', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMorphtargetsFaceDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders face with morph target animation', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - morphtargets face', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMorphtargetsFace(app, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_morphtargets_face-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_morphtargets_face-t1000.png'));
  }, 30000);
});
