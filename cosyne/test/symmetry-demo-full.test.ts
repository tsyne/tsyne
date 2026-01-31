/**
 * Test the symmetry demo modes - each mode in a separate window (no rebuild needed)
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 400;
const HEIGHT = 400;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const segments = 8;

describe('Symmetry Demo Full', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render kaleidoscope mode', async () => {
    const { cosyne, generateRadialSymmetry } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Kaleidoscope Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Kaleidoscope Mode');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');
                const mouseX = CENTER_X + 80;
                const mouseY = CENTER_Y - 60;
                const symPoints = generateRadialSymmetry(
                  { x: mouseX, y: mouseY },
                  { segments, centerX: CENTER_X, centerY: CENTER_Y, mirror: true }
                );
                symPoints.forEach((p: any, i: number) => {
                  const hue = (i / symPoints.length) * 360;
                  c.line(CENTER_X, CENTER_Y, p.x, p.y)
                    .stroke(`hsl(${hue}, 70%, 60%)`, 2);
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
    await ctx.wait(500);
    await ctx.captureScreenshot('symmetry-kaleidoscope.png');
    expect(true).toBe(true);
  });

  it('should render polygon mode', async () => {
    const { cosyne, generateRegularPolygon } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Polygon Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Polygon Mode');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');
                const radius = 100;
                const vertices = generateRegularPolygon(segments, CENTER_X, CENTER_Y, radius, 0);
                for (let i = 0; i < vertices.length; i++) {
                  const p1 = vertices[i];
                  const p2 = vertices[(i + 1) % vertices.length];
                  c.line(p1.x, p1.y, p2.x, p2.y).stroke('#4fc3f7', 3);
                }
                vertices.forEach((v: any) => {
                  c.circle(v.x, v.y, 6).fill('#81d4fa');
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
    await ctx.wait(500);
    await ctx.captureScreenshot('symmetry-polygon.png');
    expect(true).toBe(true);
  });

  it('should render star mode', async () => {
    const { cosyne, generateStar } = await import('../src');

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Star Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Star Mode');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');
                const outerRadius = 120;
                const innerRadius = 50;
                const vertices = generateStar(segments, CENTER_X, CENTER_Y, outerRadius, innerRadius, 0);
                if (vertices.length > 2) {
                  let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                  for (let i = 1; i < vertices.length; i++) {
                    pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                  }
                  pathD += ' Z';
                  c.path(pathD).fill('#ffb74d').stroke('#ff9800', 2);
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
    await ctx.wait(500);
    await ctx.captureScreenshot('symmetry-star.png');
    expect(true).toBe(true);
  });
});
