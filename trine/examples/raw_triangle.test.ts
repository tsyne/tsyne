import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildRawTriangle } from './raw_triangle';

describe('raw triangle (no Three.js)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: { stop: () => void } | null = null;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterAll(async () => {
    if (demo) demo.stop();
    await tsyneTest?.cleanup();
  });

  it('renders a red triangle on black background', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await app.window({ title: 'Raw Triangle', width: 450, height: 350 }, async (win) => {
        demo = await buildRawTriangle(app, win, { width: 400, height: 300 });
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    // Wait for rendering
    await ctx.wait(500);

    // Screenshot
    await tsyneTest.screenshot(path.join(screenshotsDir, 'raw_triangle-t0.png'));
  }, 30000);
});
