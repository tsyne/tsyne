/**
 * Visual Test for webgl_morphtargets_horse
 *
 * Port of three.js example: three/examples/webgl_morphtargets_horse.html
 * Tests animated morph targets simulating horse gallop.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLMorphtargetsHorse, WebGLMorphtargetsHorseDemo } from './webgl_morphtargets_horse';

describe('three.js webgl - morph targets horse', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLMorphtargetsHorseDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders galloping horses with morph animations', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - morph targets horse', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLMorphtargetsHorse(app, win, {
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_morphtargets_horse-t0.png'));
    console.log('Screenshot: webgl_morphtargets_horse-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_morphtargets_horse-t500.png'));
    console.log('Screenshot: webgl_morphtargets_horse-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_morphtargets_horse-t1000.png'));
    console.log('Screenshot: webgl_morphtargets_horse-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
