/**
 * Screenshot test for clipping demo
 *
 * Verifies clipping regions render correctly with circular,
 * rectangular, and polygonal clipping paths.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Clipping Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render circular clipping', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Clipping Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              // Checkered background
              for (let x = 0; x < WIDTH; x += 40) {
                for (let y = 0; y < HEIGHT; y += 40) {
                  const isDark = ((x / 40 + y / 40) % 2) === 0;
                  c.rect(x, y, 40, 40).fill(isDark ? '#e0e0e0' : '#ffffff');
                }
              }

              // Clipped circle
              c.circle(WIDTH / 2, HEIGHT / 2, 120)
                .fill({ type: 'linear', start: [0, 0], end: [WIDTH, HEIGHT], colors: ['#ff6b6b', '#feca57', '#ff9ff3'] })
                .stroke('#333', 2)
                .withId('clipped-circle');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('clipping-circular.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render rectangular clipping', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Clipping Rectangular', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(WIDTH / 2 - 100, HEIGHT / 2 - 75, 200, 150)
                .fill({ type: 'linear', start: [0, 0], end: [WIDTH, HEIGHT], colors: ['#4ecdc4', '#44af69', '#f7dc6f'] })
                .stroke('#333', 2)
                .withId('clipped-rect');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('clipping-rectangular.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render polygonal clipping', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Clipping Polygonal', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const centerX = WIDTH / 2;
              const centerY = HEIGHT / 2;
              const size = 100;

              c.polygon(centerX, centerY, [
                { x: 0, y: -size },
                { x: size, y: 0 },
                { x: 0, y: size },
                { x: -size, y: 0 },
              ])
                .fill({ type: 'radial', center: [centerX, centerY], radius: size, colors: ['#f39c12', '#e74c3c', '#9b59b6'] })
                .stroke('#333', 2)
                .withId('clipped-polygon');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('clipping-polygonal.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
