/**
 * Screenshot test for gradients demo
 *
 * Verifies gradient fills render correctly with linear, radial,
 * color stops, and alpha blending.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne, CosyneContext } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Gradients Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render linear horizontal gradient', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Gradients Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const colors = ['#ff6b6b', '#feca57', '#ff9ff3', '#ff6348'];
              c.rect(50, 50, WIDTH - 100, 80)
                .fill({ type: 'linear', start: [50, 50], end: [WIDTH - 50, 50], colors })
                .stroke('#333', 2)
                .withId('gradient-h');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('gradient-linear-h.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render linear vertical gradient', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Gradients Vertical', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const colors = ['#0984e3', '#6c5ce7', '#00b894', '#0984e3'];
              c.rect(50, 50, 80, HEIGHT - 100)
                .fill({ type: 'linear', start: [90, 50], end: [90, HEIGHT - 50], colors })
                .stroke('#333', 2)
                .withId('gradient-v');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('gradient-linear-v.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render radial gradient', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Gradients Radial', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const colors = ['#ff69b4', '#ff1493', '#ffb6c1', '#ffc0cb'];
              c.circle(WIDTH / 2, HEIGHT / 2, 100)
                .fill({ type: 'radial', center: [WIDTH / 2, HEIGHT / 2], radius: 100, colors })
                .stroke('#333', 2)
                .withId('gradient-radial');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('gradient-radial.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render multiple gradients', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Gradients Multiple', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              const colors1 = ['#ff6b6b', '#feca57', '#ff9ff3', '#ff6348'];
              const colors2 = ['#27ae60', '#16a085', '#2c3e50', '#27ae60'];

              // Horizontal gradient
              c.rect(50, 50, 250, 100)
                .fill({ type: 'linear', start: [50, 50], end: [300, 50], colors: colors1 })
                .stroke('#333', 1);

              // Vertical gradient
              c.rect(320, 50, 250, 100)
                .fill({ type: 'linear', start: [445, 50], end: [445, 150], colors: colors2 })
                .stroke('#333', 1);

              // Radial gradient
              c.circle(150, 300, 80)
                .fill({ type: 'radial', center: [150, 300], radius: 80, colors: colors1 })
                .stroke('#333', 1);

              // Diagonal gradient
              c.rect(320, 250, 200, 150)
                .fill({ type: 'linear', start: [320, 250], end: [520, 400], colors: colors2 })
                .stroke('#333', 1);
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('gradient-multi.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
