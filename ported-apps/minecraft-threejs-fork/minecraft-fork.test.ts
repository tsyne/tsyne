import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildMinecraftFork } from './src/main';

describe('Minecraft Three.js Fork', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let demo: any = null;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    demo?.stop();
    demo = null;
    await tsyneTest.cleanup();
  });

  test('renders terrain', async () => {
    const WIDTH = 800;
    const HEIGHT = 600;

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'Minecraft Fork Test', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            app.label('Loading...');
          });
          win.show();

          setTimeout(async () => {
            demo = await buildMinecraftFork(app, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for terrain generation + a few frames
    await ctx.wait(5000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'minecraft-fork-initial.png'));
    console.log('Screenshot saved: minecraft-fork-initial.png');
  }, 30000);
});
