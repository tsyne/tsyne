/**
 * Test: three.js webgl - sprites
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLSprites } from './webgl_sprites';

describe('webgl_sprites', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render billboard sprites', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLSprites>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Sprites Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLSprites(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    });

    await testApp.run();

    // Wait for initialization and animation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(demo).toBeDefined();
    expect(demo!.getTime()).toBeGreaterThan(500);

    // Clean up
    demo!.stop();
  }, 30000);
});
