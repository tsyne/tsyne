/**
 * Screenshot test for symmetry demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 500;
const HEIGHT = 500;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

describe('Symmetry Demo Screenshots', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render polygon with 6 sides', async () => {
    const { cosyne, generateRegularPolygon } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Polygon - 6 sides', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Polygon - 6 sides');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                const radius = 150;
                const vertices = generateRegularPolygon(6, CENTER_X, CENTER_Y, radius, -Math.PI / 2);

                // Draw edges
                for (let i = 0; i < vertices.length; i++) {
                  const p1 = vertices[i];
                  const p2 = vertices[(i + 1) % vertices.length];
                  c.line(p1.x, p1.y, p2.x, p2.y).stroke('#2196f3', 4);
                }

                // Draw vertices
                vertices.forEach((v: any) => {
                  c.circle(v.x, v.y, 8).fill('#64b5f6');
                });
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);
    await ctx.captureScreenshot('symmetry-polygon-6.png');
    expect(true).toBe(true);
  });

  it('should render polygon with 8 sides', async () => {
    const { cosyne, generateRegularPolygon } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Polygon - 8 sides', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Polygon - 8 sides');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                const radius = 150;
                const vertices = generateRegularPolygon(8, CENTER_X, CENTER_Y, radius, -Math.PI / 2);

                // Draw edges
                for (let i = 0; i < vertices.length; i++) {
                  const p1 = vertices[i];
                  const p2 = vertices[(i + 1) % vertices.length];
                  c.line(p1.x, p1.y, p2.x, p2.y).stroke('#2196f3', 4);
                }

                // Draw vertices
                vertices.forEach((v: any) => {
                  c.circle(v.x, v.y, 8).fill('#64b5f6');
                });
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);
    await ctx.captureScreenshot('symmetry-polygon-8.png');
    expect(true).toBe(true);
  });

  it('should render star with 5 points', async () => {
    const { cosyne, generateStar } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Star - 5 points', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Star - 5 points');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                const outerRadius = 150;
                const innerRadius = 60;
                const vertices = generateStar(5, CENTER_X, CENTER_Y, outerRadius, innerRadius, -Math.PI / 2);

                if (vertices.length > 2) {
                  let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                  for (let i = 1; i < vertices.length; i++) {
                    pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                  }
                  pathD += ' Z';
                  c.path(pathD).fill('#ff9800').stroke('#ffb74d', 3);
                }
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);
    await ctx.captureScreenshot('symmetry-star-5.png');
    expect(true).toBe(true);
  });

  it('should render star with 8 points', async () => {
    const { cosyne, generateStar } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Star - 8 points', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Star - 8 points');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                const outerRadius = 150;
                const innerRadius = 60;
                const vertices = generateStar(8, CENTER_X, CENTER_Y, outerRadius, innerRadius, -Math.PI / 2);

                if (vertices.length > 2) {
                  let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                  for (let i = 1; i < vertices.length; i++) {
                    pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                  }
                  pathD += ' Z';
                  c.path(pathD).fill('#ff9800').stroke('#ffb74d', 3);
                }
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);
    await ctx.captureScreenshot('symmetry-star-8.png');
    expect(true).toBe(true);
  });
});
