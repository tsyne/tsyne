/**
 * Screenshot test for data visualization demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

function getHeatColor(value: number): string {
  if (value < 0.2) return '#2c3e50';
  if (value < 0.4) return '#3498db';
  if (value < 0.6) return '#2ecc71';
  if (value < 0.8) return '#f39c12';
  return '#e74c3c';
}

describe('Data Visualization Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render heatmap', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Data Visualization Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              const gridSize = 8;
              const cellWidth = 300 / gridSize;
              const cellHeight = 300 / gridSize;

              for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                  const value = ((col + row) / (gridSize * 2)) % 1;

                  c.rect(50 + col * cellWidth, 50 + row * cellHeight, cellWidth - 1, cellHeight - 1)
                    .fill(getHeatColor(value));
                }
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
    await ctx.captureScreenshot('dataviz-heatmap.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render distribution histogram', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Data Visualization Histogram', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              const bins = 10;
              const binWidth = 300 / bins;

              for (let i = 0; i < bins; i++) {
                const height = 200 * (0.3 + 0.7 * Math.sin((i / bins) * Math.PI));

                c.rect(50 + i * binWidth, 250 - height, binWidth - 2, height)
                  .fill(`hsl(${(i / bins) * 360}, 80%, 50%)`);
              }

              c.line(50, 250, 350, 250).stroke('#333', 2).withId('histogram');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('dataviz-histogram.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
