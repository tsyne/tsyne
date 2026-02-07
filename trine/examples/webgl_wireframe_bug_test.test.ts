/**
 * Test wireframe bug - does wireframe break the scene?
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLWireframeBugTest, WebGLWireframeBugTestDemo } from './webgl_wireframe_bug_test';

describe('three.js webgl - wireframe bug test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLWireframeBugTestDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('grid + SOLID cube should both render', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'Wireframe Bug Test - SOLID', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLWireframeBugTest(app, win, {
              width: WIDTH,
              height: HEIGHT,
              useWireframe: false  // SOLID
            });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(2000);
    await ctx.wait(1000);  // Extra wait for rendering to stabilize

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_wireframe_bug_SOLID.png'));
  }, 30000);

  test('grid + WIREFRAME cube - does wireframe break scene?', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'Wireframe Bug Test - WIREFRAME', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLWireframeBugTest(app, win, {
              width: WIDTH,
              height: HEIGHT,
              useWireframe: true  // WIREFRAME
            });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(2000);
    await ctx.wait(1000);  // Extra wait for rendering to stabilize

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_wireframe_bug_WIREFRAME.png'));
  }, 30000);
});
