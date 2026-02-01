/**
 * Screenshot test for trails demo
 *
 * Verifies that the trail system renders correctly in different modes.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import {
  cosyne,
  CosyneContext,
  refreshAllCosyneContexts,
  Trail,
  ColorTrail,
  MultiTrail,
  trailColors,
  TrailPoint,
} from '../src';
import path from 'path';

const WIDTH = 500;
const HEIGHT = 500;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

describe('Trails Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render single trail mode', async () => {
    const trail = new Trail({ maxLength: 100, fadeSpeed: 0.02 });

    // Pre-populate some trail points
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const radius = 50 + i * 2;
      trail.addPoint(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
    }

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Trail - Single Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Single Trail Mode - Spiral');
            a.canvasStack(() => {
              cosyne(a, (c: CosyneContext) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT)
                  .fill('#0a0a15')
                  .withId('bg');

                // Draw trail
                trail.forEach((point: TrailPoint, i: number, alpha: number) => {
                  c.circle(point.x, point.y, 4 + alpha * 4)
                    .fill('#ffffff')
                    .setAlpha(alpha)
                    .withId(`single-${i}`);
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'trails-single-spiral.png'));
    expect(true).toBe(true);
  });

  it('should render color trail mode with rainbow', async () => {
    const colorTrail = new ColorTrail(trailColors.rainbow, { maxLength: 100, fadeSpeed: 0.015 });

    // Pre-populate rainbow trail points
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 4;
      const radius = 30 + i * 2.5;
      colorTrail.addColorPoint(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
    }

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Trail - Color Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Color Trail Mode - Rainbow Spiral');
            a.canvasStack(() => {
              cosyne(a, (c: CosyneContext) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT)
                  .fill('#0a0a15')
                  .withId('bg');

                // Draw color trail
                colorTrail.forEach((point: TrailPoint<{ color: string }>, i: number, alpha: number) => {
                  c.circle(point.x, point.y, 4 + alpha * 6)
                    .fill(point.data?.color ?? '#ffffff')
                    .setAlpha(alpha)
                    .withId(`color-${i}`);
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'trails-color-rainbow.png'));
    expect(true).toBe(true);
  });

  it('should render multi-trail mode', async () => {
    const multiTrail = new MultiTrail<{ color: string }>({ maxLength: 50, fadeSpeed: 0.025 });

    // Pre-populate multiple trails
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
    const offsets = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];

    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 3; j++) {
        const angle = (i / 40) * Math.PI * 2 + offsets[j];
        const radius = 50 + i * 3;
        multiTrail.addPoint(
          `trail-${j}`,
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          { color: colors[j] }
        );
      }
    }

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Trail - Multi Mode', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Multi Trail Mode - 3 Interleaved Spirals');
            a.canvasStack(() => {
              cosyne(a, (c: CosyneContext) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT)
                  .fill('#0a0a15')
                  .withId('bg');

                // Draw multi trails
                multiTrail.forEach((trail, id) => {
                  trail.forEach((point: TrailPoint<{ color: string }>, i: number, alpha: number) => {
                    c.circle(point.x, point.y, 3 + alpha * 5)
                      .fill(point.data?.color ?? '#ffffff')
                      .setAlpha(alpha)
                      .withId(`${id}-${i}`);
                  });
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'trails-multi-spiral.png'));
    expect(true).toBe(true);
  });
});
