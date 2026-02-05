/**
 * Test: three.js webgl - interactive lines
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLInteractiveLines } from './webgl_interactive_lines';

describe('webgl_interactive_lines', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render animated connected lines', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLInteractiveLines>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Lines Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLInteractiveLines(a, win, { width: WIDTH, height: HEIGHT });
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
