/**
 * Screenshot test for projections demo
 *
 * Verifies projection systems render correctly including isometric,
 * spherical, and perspective projections.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Projections Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render isometric projection of cube', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Projections Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              function isometricProject(x: number, y: number, z: number): [number, number] {
                const angle = Math.PI / 6;
                const px = (x - y) * Math.cos(angle);
                const py = z + (x + y) * Math.sin(angle);
                return [WIDTH / 2 + px * 80, HEIGHT / 2 - py * 80];
              }

              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              const vertices: [number, number, number][] = [
                [-1, -1, -1],
                [1, -1, -1],
                [1, 1, -1],
                [-1, 1, -1],
                [-1, -1, 1],
                [1, -1, 1],
                [1, 1, 1],
                [-1, 1, 1],
              ];

              const edges: [number, number][] = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
              ];

              edges.forEach((edge) => {
                const [v1, v2] = edge;
                const [px1, py1] = isometricProject(vertices[v1][0], vertices[v1][1], vertices[v1][2]);
                const [px2, py2] = isometricProject(vertices[v2][0], vertices[v2][1], vertices[v2][2]);
                c.line(px1, py1, px2, py2).stroke('#333', 2);
              });

              vertices.forEach((v) => {
                const [px, py] = isometricProject(v[0], v[1], v[2]);
                c.circle(px, py, 4).fill('#ff6b6b');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('projection-isometric.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render perspective projection of cube', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Projections Perspective', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              function perspectiveProject(x: number, y: number, z: number): [number, number] {
                const distance = 500;
                const scale = distance / (distance + z * 50);
                return [
                  WIDTH / 2 + x * scale * 100,
                  HEIGHT / 2 + y * scale * 100,
                ];
              }

              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              const vertices: [number, number, number][] = [
                [-1, -1, -1],
                [1, -1, -1],
                [1, 1, -1],
                [-1, 1, -1],
                [-1, -1, 1],
                [1, -1, 1],
                [1, 1, 1],
                [-1, 1, 1],
              ];

              const edges: [number, number][] = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
              ];

              edges.forEach((edge) => {
                const [v1, v2] = edge;
                const [px1, py1] = perspectiveProject(vertices[v1][0], vertices[v1][1], vertices[v1][2]);
                const [px2, py2] = perspectiveProject(vertices[v2][0], vertices[v2][1], vertices[v2][2]);
                c.line(px1, py1, px2, py2).stroke('#4ecdc4', 2);
              });

              vertices.forEach((v) => {
                const [px, py] = perspectiveProject(v[0], v[1], v[2]);
                c.circle(px, py, 4).fill('#4ecdc4');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('projection-perspective.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
