import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLBufferGeometryUint, WebGLBufferGeometryUintDemo } from './webgl_buffergeometry_uint';

describe('three.js webgl - buffergeometry uint', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLBufferGeometryUintDemo | null = null;

  beforeEach(async () => { tsyneTest = new TsyneTest({ headed: true }); });
  afterEach(async () => { demo?.stop(); demo = null; await tsyneTest.cleanup(); });

  test('renders with normalized Int16/Uint8 attributes', async () => {
    const WIDTH = 400, HEIGHT = 300;
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'uint test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { app.label('Initializing...'); });
        win.show();
        setTimeout(async () => {
          demo = await buildWebGLBufferGeometryUint(app, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_uint-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_uint-t1000.png'));
  }, 30000);
});
