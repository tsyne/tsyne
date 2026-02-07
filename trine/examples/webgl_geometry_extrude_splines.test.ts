/**
 * Test: three.js webgl - geometry extrude splines
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLGeometryExtrudeSplines } from './webgl_geometry_extrude_splines';

describe('webgl_geometry_extrude_splines', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render shapes extruded along splines', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLGeometryExtrudeSplines>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Extrude Splines Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLGeometryExtrudeSplines(a, win, { width: WIDTH, height: HEIGHT });
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
