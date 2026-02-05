import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildWebGLBufferGeometryAttributesInteger, WebGLBufferGeometryAttributesIntegerDemo } from './webgl_buffergeometry_attributes_integer';

describe('three.js webgl - buffergeometry attributes integer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: WebGLBufferGeometryAttributesIntegerDemo | null = null;

  beforeEach(async () => { tsyneTest = new TsyneTest({ headed: true }); });
  afterEach(async () => { demo?.stop(); demo = null; await tsyneTest.cleanup(); });

  test('renders with integer attributes', async () => {
    const WIDTH = 400, HEIGHT = 300;
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'integer attributes test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { app.label('Initializing...'); });
        win.show();
        setTimeout(async () => {
          demo = await buildWebGLBufferGeometryAttributesInteger(app, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(2000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_attributes_integer-t0.png'));
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotDir, 'webgl_buffergeometry_attributes_integer-t1000.png'));
  }, 30000);
});
