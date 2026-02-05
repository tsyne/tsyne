/**
 * Test: three.js webgl - lights hemisphere
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLLightsHemisphere } from './webgl_lights_hemisphere';

describe('webgl_lights_hemisphere', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render scene with hemisphere lighting', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLLightsHemisphere>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Lights Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLLightsHemisphere(a, win, { width: WIDTH, height: HEIGHT });
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
