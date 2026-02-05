/**
 * Visual Test for webgl_nodes_playground
 *
 * Port of three.js example: three/examples/webgl_nodes_playground.html
 * Tests node-based material effects with dynamic updates.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLNodesPlayground, WebGLNodesPlaygroundDemo } from './webgl_nodes_playground';

describe('three.js webgl - nodes playground', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLNodesPlaygroundDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders various material effects', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - nodes playground', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLNodesPlayground(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_nodes_playground-t0.png'));
    console.log('Screenshot: webgl_nodes_playground-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_nodes_playground-t500.png'));
    console.log('Screenshot: webgl_nodes_playground-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_nodes_playground-t1000.png'));
    console.log('Screenshot: webgl_nodes_playground-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
