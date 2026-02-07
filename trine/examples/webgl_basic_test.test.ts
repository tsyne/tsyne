import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildBasicTest, BasicTestDemo } from './webgl_basic_test';

describe('three.js basic test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: BasicTestDemo | null = null;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterAll(async () => {
    if (demo) demo.stop();
    await tsyneTest?.cleanup();
  });

  it('renders solid color cubes', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await app.window({ title: 'Basic Test', width: 450, height: 350 }, async (win) => {
        demo = await buildBasicTest(app, win, { width: 400, height: 300 });
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
    
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    // Wait for initialization
    await ctx.wait(500);

    // t0
    await tsyneTest.screenshot(path.join(screenshotsDir, 'webgl_basic_test-t0.png'));

    // t1000
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(screenshotsDir, 'webgl_basic_test-t1000.png'));
  }, 30000);
});
