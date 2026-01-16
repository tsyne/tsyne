/**
 * Test TappableCanvasRaster events using tapAt()
 */

import { TsyneTest } from '../tsyne-test';
import { App } from '../app';

describe('TappableCanvasRaster tapAt', () => {
  let tsyneTest: TsyneTest;
  let tapReceived = false;
  let tapX = -1;
  let tapY = -1;

  beforeEach(() => {
    tapReceived = false;
    tapX = -1;
    tapY = -1;
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should receive tap events through Fyne event system', async () => {
    const createTestApp = (a: App) => {
      a.window({ title: 'Tap Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          a.canvasStack(() => {
            // Create TappableCanvasRaster
            a.tappableCanvasRaster(400, 300, {
              onTap: (x, y) => {
                console.log(`[TEST] Tap received at (${x}, ${y})`);
                tapReceived = true;
                tapX = x;
                tapY = y;
              },
            });
          });
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for window to be ready
    await new Promise(resolve => setTimeout(resolve, 200));

    // Tap at center of window
    console.log('[TEST] Calling tapAt(200, 150)');
    await ctx.tapAt(200, 150);

    // Wait for event to propagate
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify tap was received
    // Allow small coordinate offset due to window decorations
    console.log(`[TEST] tapReceived=${tapReceived}, tapX=${tapX}, tapY=${tapY}`);
    expect(tapReceived).toBe(true);
    expect(Math.abs(tapX - 200)).toBeLessThan(10);
    expect(Math.abs(tapY - 150)).toBeLessThan(10);
  });
});
