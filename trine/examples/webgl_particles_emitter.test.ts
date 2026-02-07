/**
 * Visual Test for webgl_particles_emitter
 *
 * Tests particle system with emitter behavior.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLParticlesEmitter, WebGLParticlesEmitterDemo } from './webgl_particles_emitter';

describe('three.js webgl - particles emitter', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLParticlesEmitterDemo | null = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders particle emitter system', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'three.js webgl - particles emitter', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildWebGLParticlesEmitter(app, win, {
              width: WIDTH,
              height: HEIGHT,
              particleCount: 1000,
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

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_particles_emitter-t0.png'));
    console.log('Screenshot: webgl_particles_emitter-t0.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_particles_emitter-t500.png'));
    console.log('Screenshot: webgl_particles_emitter-t500.png');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_particles_emitter-t1000.png'));
    console.log('Screenshot: webgl_particles_emitter-t1000.png');

    console.log(`Screenshots saved to: ${screenshotDir}`);
  }, 30000);
});
