import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLTestMemory, WebGLTestMemoryDemo } from './webgl_test_memory';

describe('three.js webgl - memory test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLTestMemoryDemo | null = null;

  beforeEach(async () => { tsyneTest = new TsyneTest({ headed: true }); });
  afterEach(async () => { demo?.stop(); demo = null; await tsyneTest.cleanup(); });

  test('creates and disposes geometry/material/texture each frame', async () => {
    const WIDTH = 400, HEIGHT = 300;
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'memory test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { app.label('Initializing...'); });
        win.show();
        setTimeout(async () => {
          demo = await buildWebGLTestMemory(app, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_test_memory-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_test_memory-t1000.png'));
  }, 30000);
});
