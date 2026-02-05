/**
 * Test: three.js webgl - custom attributes
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLCustomAttributes } from './webgl_custom_attributes';

describe('webgl_custom_attributes', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render geometry with custom per-vertex attributes', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLCustomAttributes>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Custom Attributes Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLCustomAttributes(a, win, { width: WIDTH, height: HEIGHT });
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
