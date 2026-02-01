/**
 * Screenshot test for collections demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Collections Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should efficiently render collection of 50 circles', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Collections Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f0f0f0');

              for (let i = 0; i < 50; i++) {
                const angle = (i / 50) * Math.PI * 2;
                const distance = 80;
                const x = WIDTH / 2 + Math.cos(angle) * distance;
                const y = HEIGHT / 2 + Math.sin(angle) * distance;

                c.circle(x, y, 4).fill(`hsl(${(i / 50) * 360}, 80%, 50%)`);
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
    await ctx.captureScreenshot('collections-50.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
