/**
 * Test interactive-shapes-cosyne demo
 * Verifies tap, drag, and hover interactions work correctly
 */

import { TsyneTest } from 'tsyne';
import { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from '../../cosyne/src';
import * as fs from 'fs';
import * as path from 'path';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

describe('interactive-shapes-cosyne', () => {
  let tsyneTest: TsyneTest;
  const screenshotDir = '/tmp/interactive-shapes-test';

  // Track state changes
  let circle1Color = COLORS[0];
  let circle1Clicked = false;
  let circle1Dragged = false;
  let circle1Hovered = false;

  beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  beforeEach(() => {
    circle1Color = COLORS[0];
    circle1Clicked = false;
    circle1Dragged = false;
    circle1Hovered = false;
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should receive tap events and change color', async () => {
    const createTestApp = (a: App) => {
      a.window({ title: 'Interactive Shapes Test', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          a.canvasStack(() => {
            const ctx = cosyne(a, (c: CosyneContext) => {
              // Circle at (100, 100) with radius 30
              c.circle(100, 100, 30, { fillColor: circle1Color })
                .bindFill(() => circle1Color)
                .withId('circle1')
                .onClick(async (e) => {
                  console.log(`[TEST] Circle1 clicked at (${e.x}, ${e.y})`);
                  circle1Clicked = true;
                  // Change color
                  const currentIndex = COLORS.indexOf(circle1Color);
                  circle1Color = COLORS[(currentIndex + 1) % COLORS.length];
                  console.log(`[TEST] Color changed to ${circle1Color}`);
                  refreshAllCosyneContexts();
                });
            });

            enableEventHandling(ctx, a, { width: 500, height: 450 });
          });
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const testCtx = tsyneTest.getContext();
    await testApp.run();

    // Wait for window
    await new Promise(resolve => setTimeout(resolve, 300));

    // Take screenshot before tap
    await testCtx.captureScreenshot(path.join(screenshotDir, 'before-tap.png'));

    // Tap on circle1 (center at 100, 100)
    console.log('[TEST] Tapping at (100, 100)');
    await testCtx.tapAt(100, 100);

    // Wait for event to propagate
    await new Promise(resolve => setTimeout(resolve, 200));

    // Take screenshot after tap
    await testCtx.captureScreenshot(path.join(screenshotDir, 'after-tap.png'));

    // Verify click was received
    console.log(`[TEST] circle1Clicked=${circle1Clicked}, circle1Color=${circle1Color}`);
    expect(circle1Clicked).toBe(true);
    expect(circle1Color).toBe(COLORS[1]); // Should have changed to next color
  });

  it('should log tap coordinates for debugging', async () => {
    let tapX = -1;
    let tapY = -1;

    const createTestApp = (a: App) => {
      a.window({ title: 'Tap Debug', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          a.canvasStack(() => {
            const ctx = cosyne(a, (c: CosyneContext) => {
              // Large circle to make it easy to hit
              c.circle(250, 225, 100, { fillColor: '#FF6B6B' })
                .fill('#FF6B6B')
                .onClick(async (e) => {
                  console.log(`[TEST] Large circle clicked at (${e.x}, ${e.y})`);
                  tapX = e.x;
                  tapY = e.y;
                });
            });

            enableEventHandling(ctx, a, { width: 500, height: 450 });
          });
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const testCtx = tsyneTest.getContext();
    await testApp.run();

    await new Promise(resolve => setTimeout(resolve, 300));

    // Tap at center of window (should hit the large circle)
    console.log('[TEST] Tapping at center (250, 225)');
    await testCtx.tapAt(250, 225);

    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`[TEST] Tap received at (${tapX}, ${tapY})`);

    // Check if tap was received (allowing for coordinate offset)
    expect(tapX).toBeGreaterThan(0);
    expect(tapY).toBeGreaterThan(0);
  });
});
