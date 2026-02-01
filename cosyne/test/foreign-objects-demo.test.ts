/**
 * Screenshot test for foreign objects demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Foreign Objects Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render canvas with widget zone annotations', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Foreign Objects Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              c.rect(0, 0, WIDTH, HEIGHT).fill('#f5f5f5');

              // Button zone
              c.rect(20, 20, 280, 200)
                .fill('rgba(100, 150, 200, 0.1)')
                .stroke('#999', 1);

              c.text(160, 35, 'Button Zone', {
                fillColor: '#666',
                fontSize: 14,
                textAlign: 'center',
              });

              // Slider zone
              c.rect(300, 20, 280, 100)
                .fill('rgba(200, 150, 100, 0.1)')
                .stroke('#999', 1);

              c.text(440, 35, 'Slider Zone', {
                fillColor: '#666',
                fontSize: 14,
                textAlign: 'center',
              });

              // State zone
              c.rect(20, 240, 280, 150)
                .fill('rgba(150, 200, 100, 0.1)')
                .stroke('#999', 1);

              c.text(160, 255, 'Current State', {
                fillColor: '#666',
                fontSize: 14,
                textAlign: 'center',
              });

              c.text(30, 280, 'Clicks: 0', {
                fillColor: '#333',
                fontSize: 12,
              }).withId('foreign-objects');
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('foreign-objects-zones.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
