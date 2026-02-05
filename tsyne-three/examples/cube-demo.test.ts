/**
 * Visual Test for Cube Demo
 *
 * Runs the cube demo and captures screenshots at intervals.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { createCubeDemo, CubeDemo } from './cube-demo';

describe('Three.js Cube Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: CubeDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders rotating cube with colored faces', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Cube Demo', width: 1024, height: 768 }, (win) => {
        win.setContent(() => {
          app.label('Initializing...');
        });
        win.show();

        setTimeout(async () => {
          demo = await createCubeDemo(app, win, { width: 1024, height: 768 });
        }, 100);
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization + some frames
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'cube-t0.png'));
    console.log('Screenshot: cube-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'cube-t500.png'));
    console.log('Screenshot: cube-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'cube-t1000.png'));
    console.log('Screenshot: cube-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
