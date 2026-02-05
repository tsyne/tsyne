/**
 * Visual Test for webgl_multiple_scenes_comparison
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMultipleScenesComparison, WebGLMultipleScenesComparisonDemo } from './webgl_multiple_scenes_comparison';

describe('three.js webgl - multiple scenes comparison', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMultipleScenesComparisonDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders side-by-side scene comparison', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - multiple scenes comparison', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMultipleScenesComparison(app, win, { width: WIDTH, height: HEIGHT });
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_multiple_scenes_comparison-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_multiple_scenes_comparison-t1000.png'));
  }, 30000);
});
