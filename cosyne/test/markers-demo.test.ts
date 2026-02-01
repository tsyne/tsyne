/**
 * Screenshot test for markers demo
 *
 * Verifies line markers and connector lines render correctly.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Markers Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render arrow markers on lines', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Markers Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              // Line 1
              c.line(50, 100, 200, 150).stroke('#333', 2);

              // Arrow marker
              c.polygon(200, 150, [
                { x: -8, y: 0 },
                { x: -5, y: -5 },
                { x: -5, y: 5 },
              ]).fill('#4ecdc4');

              // Line 2
              c.line(50, 250, 200, 300).stroke('#333', 2);

              // Arrow marker
              c.polygon(50, 250, [
                { x: 8, y: 0 },
                { x: 5, y: -5 },
                { x: 5, y: 5 },
              ]).fill('#ff6b6b').withId('arrow-markers');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('markers-arrows.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render shape markers on lines', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Markers Shapes', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              const positions = [
                { x: 100, label: 'Circle', color: '#ff6b6b' },
                { x: 200, label: 'Square', color: '#4ecdc4' },
                { x: 300, label: 'Diamond', color: '#ffd93d' },
              ];

              positions.forEach((p) => {
                c.line(p.x, 80, p.x, 150).stroke('#333', 2);

                if (p.label === 'Circle') {
                  c.circle(p.x, 80, 8).fill(p.color);
                } else if (p.label === 'Square') {
                  c.rect(p.x - 8, 80 - 8, 16, 16).fill(p.color);
                } else {
                  c.polygon(p.x, 80, [
                    { x: 0, y: -10 },
                    { x: 10, y: 0 },
                    { x: 0, y: 10 },
                    { x: -10, y: 0 },
                  ]).fill(p.color);
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
    await ctx.captureScreenshot('markers-shapes.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render connector lines in flowchart', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Markers Connectors', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              // Boxes
              c.rect(50, 50, 80, 50).fill('#4ecdc4').stroke('#333', 2);
              c.rect(200, 50, 80, 50).fill('#45b7d1').stroke('#333', 2);

              // Connectors
              c.line(130, 75, 200, 75).stroke('#333', 2);
              c.line(240, 75, 240, 200).stroke('#333', 2);
              c.line(240, 200, 100, 200).stroke('#333', 2).withId('connectors');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('markers-connectors.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
