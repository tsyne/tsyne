/**
 * Screenshot test for zoom and pan demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Zoom & Pan Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render zoomable grid and circles', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Zoom & Pan Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              // Grid
              const gridSize = 50;
              for (let x = 0; x < WIDTH; x += gridSize) {
                c.line(x, 0, x, HEIGHT).stroke('#ddd', 0.5);
              }
              for (let y = 0; y < HEIGHT; y += gridSize) {
                c.line(0, y, WIDTH, y).stroke('#ddd', 0.5);
              }

              // Circles
              const positions = [
                { pos: [150, 150], color: '#ff6b6b' },
                { pos: [350, 150], color: '#4ecdc4' },
                { pos: [250, 350], color: '#45b7d1' },
              ];

              positions.forEach((item) => {
                c.circle(item.pos[0], item.pos[1], 30)
                  .fill(item.color)
                  .stroke('#333', 2);
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
    await ctx.captureScreenshot('zoom-pan-default.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
