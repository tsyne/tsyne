/**
 * Test for symmetry demo
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 400;
const HEIGHT = 400;

describe('Symmetry Demo', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render symmetry pattern', async () => {
    // Import key functions from cosyne
    const { cosyne, generateRadialSymmetry } = await import('../src');

    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT / 2;

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Symmetry Test', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Symmetry Test');
            a.canvasStack(() => {
              cosyne(a, (c: any) => {
                // Background
                c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                // Generate symmetric points
                const mouseX = CENTER_X + 80;
                const mouseY = CENTER_Y - 60;
                const symPoints = generateRadialSymmetry(
                  { x: mouseX, y: mouseY },
                  { segments: 8, centerX: CENTER_X, centerY: CENTER_Y, mirror: true }
                );

                // Draw lines from center to each symmetric point
                symPoints.forEach((p: any, i: number) => {
                  const hue = (i / symPoints.length) * 360;
                  c.line(CENTER_X, CENTER_Y, p.x, p.y)
                    .stroke(`hsl(${hue}, 70%, 60%)`, 2)
                    .withId(`line-${i}`);
                  c.circle(p.x, p.y, 4)
                    .fill(`hsl(${hue}, 70%, 60%)`)
                    .withId(`point-${i}`);
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

    // Wait for rendering
    await ctx.wait(500);

    // Take screenshot
    await ctx.captureScreenshot('symmetry-demo.png');

    // Basic check
    const widgets = await ctx.getAllWidgets();
    console.log(`[test] Total widgets: ${widgets.length}`);
    expect(widgets.length).toBeGreaterThan(0);
  });
});
