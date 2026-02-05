/**
 * Visual Test for webgl_multiple_canvases_grid
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMultipleCanvasesGrid, WebGLMultipleCanvasesGridDemo } from './webgl_multiple_canvases_grid';

describe('three.js webgl - multiple canvases grid', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMultipleCanvasesGridDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders 3x3 grid of viewports', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - multiple canvases grid', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMultipleCanvasesGrid(app, win, { width: WIDTH, height: HEIGHT });
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_multiple_canvases_grid-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_multiple_canvases_grid-t1000.png'));
  }, 30000);
});
