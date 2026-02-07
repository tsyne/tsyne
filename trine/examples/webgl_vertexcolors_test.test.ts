import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildVertexColorsTest, VertexColorsTestDemo } from './webgl_vertexcolors_test';

describe('three.js vertex colors test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: VertexColorsTestDemo | null = null;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterAll(async () => {
    if (demo) demo.stop();
    await tsyneTest?.cleanup();
  });

  it('renders cube with vertex colors', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await app.window({ title: 'Vertex Colors Test', width: 450, height: 350 }, async (win) => {
        demo = await buildVertexColorsTest(app, win, { width: 400, height: 300 });
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
    
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotsDir, 'webgl_vertexcolors_test-t0.png'));

    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotsDir, 'webgl_vertexcolors_test-t1000.png'));
  }, 30000);
});
