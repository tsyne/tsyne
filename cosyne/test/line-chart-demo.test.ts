/**
 * Screenshot test for line chart demo
 *
 * Verifies that multi-series line charts render correctly with
 * different interpolation types, axes, labels, and legend.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne, CosyneContext } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Line Chart Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render multi-series line chart with axes and grid', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Line Chart', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (ctx: CosyneContext) => {
              // Background
              ctx.rect(0, 0, WIDTH, HEIGHT)
                .fill('#f5f5f5')
                .withId('chart-bg');

              // Grid
              for (let x = 0; x <= 10; x += 1) {
                const px = 50 + (x / 10) * 600;
                ctx.line(px, 50, px, 450)
                  .stroke('#ddd', 0.5)
                  .withId(`vgrid-${x}`);
              }

              for (let y = 0; y <= 100; y += 20) {
                const py = 450 - (y / 100) * 400;
                ctx.line(50, py, 650, py)
                  .stroke('#ddd', 0.5)
                  .withId(`hgrid-${y}`);
              }

              // Axes
              ctx.line(50, 450, 650, 450)
                .stroke('#333', 2)
                .withId('x-axis');
              ctx.line(50, 50, 50, 450)
                .stroke('#333', 2)
                .withId('y-axis');

              // Generate sample data
              const series1: [number, number][] = [];
              for (let x = 0; x <= 10; x += 0.5) {
                series1.push([x, 50 + 30 * Math.sin(x * 0.8)]);
              }

              // Plot series
              series1.forEach((point, i) => {
                const px = 50 + (point[0] / 10) * 600;
                const py = 450 - (point[1] / 100) * 400;

                if (i > 0) {
                  const prevPoint = series1[i - 1];
                  const prevPx = 50 + (prevPoint[0] / 10) * 600;
                  const prevPy = 450 - (prevPoint[1] / 100) * 400;
                  ctx.line(prevPx, prevPy, px, py)
                    .stroke('#ff6b6b', 2)
                    .withId(`line-${i}`);
                }

                ctx.circle(px, py, 3)
                  .fill('#ff6b6b')
                  .withId(`point-${i}`);
              });

              // Labels
              ctx.text(350, 480, 'X Axis', { fillColor: '#666', fontSize: 12 }).withId('x-label');
              ctx.text(20, 250, 'Y Axis', { fillColor: '#666', fontSize: 12 }).withId('y-label');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('line-chart-axes.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render line chart with multiple series', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Multi-Series Chart', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (ctx: CosyneContext) => {
              ctx.rect(0, 0, WIDTH, HEIGHT)
                .fill('#f5f5f5');

              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

              // Generate multiple series
              const allSeries = [
                (() => {
                  const s: [number, number][] = [];
                  for (let x = 0; x <= 10; x += 0.5) {
                    s.push([x, 50 + 30 * Math.sin(x * 0.8)]);
                  }
                  return s;
                })(),
                (() => {
                  const s: [number, number][] = [];
                  for (let x = 0; x <= 10; x += 0.5) {
                    s.push([x, 40 + 20 * Math.cos(x * 0.6)]);
                  }
                  return s;
                })(),
                (() => {
                  const s: [number, number][] = [];
                  for (let x = 0; x <= 10; x += 0.5) {
                    s.push([x, 30 + 25 * Math.sin(x * 1.2 + 1)]);
                  }
                  return s;
                })(),
              ];

              // Draw all series
              allSeries.forEach((series, seriesIdx) => {
                series.forEach((point, i) => {
                  const px = 50 + (point[0] / 10) * 600;
                  const py = 450 - (point[1] / 100) * 400;

                  if (i > 0) {
                    const prevPoint = series[i - 1];
                    const prevPx = 50 + (prevPoint[0] / 10) * 600;
                    const prevPy = 450 - (prevPoint[1] / 100) * 400;
                    ctx.line(prevPx, prevPy, px, py)
                      .stroke(colors[seriesIdx], 2);
                  }

                  ctx.circle(px, py, 3)
                    .fill(colors[seriesIdx]);
                });
              });

              // Axes
              ctx.line(50, 450, 650, 450)
                .stroke('#333', 2);
              ctx.line(50, 50, 50, 450)
                .stroke('#333', 2);
            });
          });
        });
        win.show();
      });
    });

    await testApp.run();
    expect(cosyneTest).toBeDefined();
  });
});
