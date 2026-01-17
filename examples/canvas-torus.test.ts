/**
 * TsyneTest integration tests for interactive torus
 */

import { TsyneTest } from '../src/index-test';
import {
  cosyne,
  TorusProjection,
  generateTorusWireframe,
  Point3D,
} from '../cosyne/src';

describe('Canvas Torus Visualization', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render torus canvas without crashing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Torus Test', width: 600, height: 500 }, (win) => {
        win.setContent(async () => {
          app.canvasStack(500, 400, (c) => {
            // Simple torus rendering
            const proj = new TorusProjection({
              focalLength: 250,
              center: { x: 250, y: 200 },
            });

            proj.setRotation({ theta: 0.5, phi: 0.3, psi: 0 });

            const wireframe = generateTorusWireframe(60, 25, 12, 8);

            for (const line of wireframe) {
              let prev: Point3D | null = null;
              for (const point of line) {
                const p2d = proj.project(point);
                const alpha = proj.getAlpha(point);

                if (alpha > 0.1 && prev) {
                  const prevP2d = proj.project(prev);
                  c.line(prevP2d.x, prevP2d.y, p2d.x, p2d.y)
                    .stroke('red')
                    .strokeWidth(1)
                    .alpha(alpha);
                }
                prev = point;
              }
            }
          }).withId('torusRender');
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    expect(ctx).toBeDefined();

    // Test should pass if canvas renders
    await testApp.run();
  });

  it('should create rotating torus with multiple rotations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      let rotation = 0;

      app.window({ title: 'Rotating Torus', width: 600, height: 500 }, (win) => {
        win.setContent(async () => {
          app.vbox(async () => {
            // Render rotating torus
            const canvas = app.canvasStack(500, 400, (c) => {
              const proj = new TorusProjection({
                focalLength: 250,
                center: { x: 250, y: 200 },
              });

              proj.setRotation({
                theta: rotation,
                phi: rotation * 0.7,
                psi: rotation * 0.5,
              });

              const wireframe = generateTorusWireframe(60, 25, 10, 8);

              for (const line of wireframe) {
                let prev: Point3D | null = null;
                for (const point of line) {
                  const p2d = proj.project(point);
                  const alpha = proj.getAlpha(point);

                  if (alpha > 0.1 && prev) {
                    const prevP2d = proj.project(prev);
                    c.line(prevP2d.x, prevP2d.y, p2d.x, p2d.y)
                      .stroke(`rgba(200, 0, 0, ${alpha})`)
                      .strokeWidth(1);
                  }
                  prev = point;
                }
              }
            }).withId('rotatingTorus');

            // Button to rotate
            app.button('Rotate').onClick(() => {
              rotation += 0.2;
              // In a real app, this would trigger a canvas redraw
            }).withId('rotateBtn');

            app.label(`Rotation: ${rotation.toFixed(2)}`).withId('rotationLabel');
          });
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    const btn = ctx.getById('rotateBtn');
    const label = ctx.getById('rotationLabel');

    await testApp.run();
    expect(btn).toBeDefined();
    expect(label).toBeDefined();
  });

  it('should project torus vertices to 2D correctly', async () => {
    const proj = new TorusProjection({
      focalLength: 300,
      center: { x: 400, y: 300 },
    });

    proj.setRotation({ theta: 0.5, phi: 0.3, psi: 0.1 });

    const wireframe = generateTorusWireframe(100, 40, 16, 12);

    // Check that projected points have reasonable coordinates
    for (const line of wireframe) {
      for (const point of line) {
        const p2d = proj.project(point);
        const alpha = proj.getAlpha(point);

        // Points should be projected to reasonable canvas area
        expect(p2d.x).toBeGreaterThan(0);
        expect(p2d.x).toBeLessThan(1000); // Reasonable canvas width
        expect(p2d.y).toBeGreaterThan(0);
        expect(p2d.y).toBeLessThan(800); // Reasonable canvas height

        // Alpha should be valid
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should handle different torus geometries', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Torus Geometries', width: 900, height: 400 }, (win) => {
        win.setContent(async () => {
          app.hbox(async () => {
            // Different geometries in different sizes
            const geometries = [
              { majorRadius: 50, minorRadius: 20, label: 'Thin' },
              { majorRadius: 80, minorRadius: 30, label: 'Medium' },
              { majorRadius: 100, minorRadius: 50, label: 'Fat' },
            ];

            for (const geom of geometries) {
              app.vbox(async () => {
                app.canvasStack(250, 250, (c) => {
                  const proj = new TorusProjection({
                    focalLength: 200,
                    center: { x: 125, y: 125 },
                  });

                  proj.setRotation({ theta: 0.3, phi: 0.4, psi: 0 });

                  const wireframe = generateTorusWireframe(
                    geom.majorRadius,
                    geom.minorRadius,
                    12,
                    8
                  );

                  for (const line of wireframe) {
                    let prev: Point3D | null = null;
                    for (const point of line) {
                      const p2d = proj.project(point);
                      const alpha = proj.getAlpha(point);

                      if (alpha > 0.1 && prev) {
                        const prevP2d = proj.project(prev);
                        c.line(prevP2d.x, prevP2d.y, p2d.x, p2d.y)
                          .stroke('red')
                          .strokeWidth(1)
                          .alpha(alpha);
                      }
                      prev = point;
                    }
                  }
                }).withId(`torus_${geom.label}`);

                app.label(geom.label);
              });
            }
          });
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    expect(ctx.getById('torus_Thin')).toBeDefined();
    expect(ctx.getById('torus_Medium')).toBeDefined();
    expect(ctx.getById('torus_Fat')).toBeDefined();

    await testApp.run();
  });

  it('should apply different rotations to torus', async () => {
    const rotations = [
      { theta: 0, phi: 0, psi: 0, label: 'No rotation' },
      { theta: Math.PI / 2, phi: 0, psi: 0, label: 'Yaw 90°' },
      { theta: 0, phi: Math.PI / 2, psi: 0, label: 'Pitch 90°' },
      { theta: 0.3, phi: 0.4, psi: 0.1, label: 'Combined' },
    ];

    for (const rot of rotations) {
      const proj = new TorusProjection({
        focalLength: 250,
        center: { x: 200, y: 200 },
      });

      proj.setRotation({ theta: rot.theta, phi: rot.phi, psi: rot.psi });

      const wireframe = generateTorusWireframe(80, 30, 12, 8);

      // Verify projection works for all rotations
      let projectedCount = 0;
      for (const line of wireframe) {
        for (const point of line) {
          const p2d = proj.project(point);
          if (proj.getAlpha(point) > 0.1) {
            projectedCount++;
          }
        }
      }

      expect(projectedCount).toBeGreaterThan(0);
    }
  });
});
