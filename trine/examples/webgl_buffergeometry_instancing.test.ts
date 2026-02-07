/**
 * Test: three.js webgl - buffergeometry instancing
 */

import { TsyneTest } from 'tsyne';
import { buildWebGLBufferGeometryInstancing } from './webgl_buffergeometry_instancing';

describe('webgl_buffergeometry_instancing', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render instanced geometry with many instances', async () => {
    const WIDTH = 400;
    const HEIGHT = 300;

    let demo: Awaited<ReturnType<typeof buildWebGLBufferGeometryInstancing>> | undefined;

    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Instancing Test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => {
          a.label('Loading...');
        });
        win.show();

        setTimeout(async () => {
          demo = await buildWebGLBufferGeometryInstancing(a, win, { width: WIDTH, height: HEIGHT });
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
