/**
 * Test for symmetry demo - all modes
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 400;
const HEIGHT = 400;

describe('Symmetry Demo Modes', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render polygon mode', async () => {
    const { cosyne, generateRegularPolygon } = await import('../src');

    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT / 2;

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Polygon Test', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Polygon Mode');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                // Draw regular polygon
                const radius = 100;
                const segments = 6;  // hexagon
                const vertices = generateRegularPolygon(segments, CENTER_X, CENTER_Y, radius, 0);

                console.log('[test] Polygon vertices:', vertices);

                // Draw polygon edges
                for (let i = 0; i < vertices.length; i++) {
                  const p1 = vertices[i];
                  const p2 = vertices[(i + 1) % vertices.length];
                  c.line(p1.x, p1.y, p2.x, p2.y)
                    .stroke('#4fc3f7', 3)
                    .withId(`edge-${i}`);
                }

                // Draw vertices
                vertices.forEach((v: any, i: number) => {
                  c.circle(v.x, v.y, 6)
                    .fill('#81d4fa')
                    .withId(`vertex-${i}`);
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
    await ctx.captureScreenshot('polygon-mode.png');

    const widgets = await ctx.getAllWidgets();
    console.log(`[test] Total widgets: ${widgets.length}`);
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render star mode', async () => {
    const { cosyne, generateStar } = await import('../src');

    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT / 2;

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Star Test', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Star Mode');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                // Draw star
                const outerRadius = 120;
                const innerRadius = 50;
                const points = 5;  // 5-pointed star
                const vertices = generateStar(points, CENTER_X, CENTER_Y, outerRadius, innerRadius, 0);

                console.log('[test] Star vertices:', vertices);

                // Draw star as path
                if (vertices.length > 2) {
                  let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                  for (let i = 1; i < vertices.length; i++) {
                    pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                  }
                  pathD += ' Z';
                  console.log('[test] Star path:', pathD);
                  c.path(pathD)
                    .fill('#ffb74d')
                    .stroke('#ff9800', 2)
                    .withId('star');
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
    await ctx.captureScreenshot('star-mode.png');

    const widgets = await ctx.getAllWidgets();
    console.log(`[test] Total widgets: ${widgets.length}`);
    expect(widgets.length).toBeGreaterThan(0);
  });
});
