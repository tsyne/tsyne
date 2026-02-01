/**
 * Screenshot test for effects demo
 *
 * Verifies visual effects render correctly including shadows,
 * glow, and text effects.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Effects Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render drop shadow effect', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Effects Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              // Shadow
              c.circle(WIDTH / 2 + 5, HEIGHT / 2 + 5, 80)
                .fill('rgba(0, 0, 0, 0.2)');

              // Main circle
              c.circle(WIDTH / 2, HEIGHT / 2, 80)
                .fill('#3498db')
                .stroke('#2c3e50', 3)
                .withId('shadow-circle');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('effects-shadow.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render glow effect', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Effects Glow', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              // Glow layers
              c.rect(WIDTH / 2 - 120, HEIGHT / 2 - 70, 240, 140)
                .fill(undefined)
                .stroke('rgba(231, 76, 60, 0.2)', 4);

              c.rect(WIDTH / 2 - 110, HEIGHT / 2 - 60, 220, 120)
                .fill(undefined)
                .stroke('rgba(231, 76, 60, 0.4)', 4);

              // Main rectangle
              c.rect(WIDTH / 2 - 100, HEIGHT / 2 - 50, 200, 100)
                .fill('#e74c3c')
                .stroke('#c0392b', 2)
                .withId('glow-rect');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('effects-glow.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render text shadow effect', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Effects Text', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              // Shadow text
              c.text(WIDTH / 2 + 3, HEIGHT / 2 + 3, 'Shadowed', {
                fillColor: 'rgba(0, 0, 0, 0.3)',
                fontSize: 48,
                textAlign: 'center',
              });

              // Main text
              c.text(WIDTH / 2, HEIGHT / 2, 'Shadowed', {
                fillColor: '#2c3e50',
                fontSize: 48,
                textAlign: 'center',
                fontWeight: 'bold',
              }).withId('shadow-text');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('effects-text-shadow.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
