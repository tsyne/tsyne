/**
 * Screenshot test for axes and grid demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Axes & Grid Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render coordinate grid with axes and labels', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Axes & Grid Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const margin = { top: 40, right: 40, bottom: 60, left: 60 };
              const chartWidth = WIDTH - margin.left - margin.right;
              const chartHeight = HEIGHT - margin.top - margin.bottom;

              c.rect(0, 0, WIDTH, HEIGHT).fill('#ffffff');

              const chartLeft = margin.left;
              const chartTop = margin.top;
              const chartRight = WIDTH - margin.right;
              const chartBottom = HEIGHT - margin.bottom;

              // Grid
              for (let i = 0; i <= 10; i += 2) {
                const x = chartLeft + (i / 10) * chartWidth;
                c.line(x, chartTop, x, chartBottom).stroke('#e0e0e0', 1);

                const y = chartTop + (i / 10) * chartHeight;
                c.line(chartLeft, y, chartRight, y).stroke('#e0e0e0', 1);
              }

              // Axes
              c.line(chartLeft, chartBottom, chartRight, chartBottom).stroke('#333', 2);
              c.line(chartLeft, chartTop, chartLeft, chartBottom).stroke('#333', 2);

              // Ticks and labels
              for (let i = 0; i <= 10; i += 2) {
                const x = chartLeft + (i / 10) * chartWidth;
                c.line(x, chartBottom, x, chartBottom + 5).stroke('#333', 1);

                c.text(x, chartBottom + 20, (i * 10).toString(), {
                  fillColor: '#666',
                  fontSize: 12,
                  textAlign: 'center',
                });

                const y = chartBottom - (i / 10) * chartHeight;
                c.line(chartLeft - 5, y, chartLeft, y).stroke('#333', 1);

                c.text(chartLeft - 15, y + 4, (i * 10).toString(), {
                  fillColor: '#666',
                  fontSize: 12,
                  textAlign: 'right',
                });
              }
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('axes-grid-standard.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
