/**
 * Minimal test for canvas fill color
 * Tests that canvasCircle and canvasRectangle actually fill with the specified color
 */
import { TsyneTest, TestContext } from '../src/index-test';

describe('Canvas Fill Color', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should fill a circle with specified color', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Fill Test', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Red filled circle - should be very visible
            a.canvasCircle({
              x: 50, y: 50,
              x2: 250, y2: 250,
              fillColor: '#ff0000',  // Bright red
              strokeColor: '#000000',
              strokeWidth: 2,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for render
    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-fill-circle.png');
      console.log('Screenshot saved to /tmp/canvas-fill-circle.png');
    }
  }, 15000);

  it('should fill a rectangle with specified color', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Rect Fill Test', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Green filled rectangle
            a.canvasRectangle({
              width: 200, height: 200,
              fillColor: '#00ff00',  // Bright green
              strokeColor: '#000000',
              strokeWidth: 2,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-fill-rect.png');
      console.log('Screenshot saved to /tmp/canvas-fill-rect.png');
    }
  }, 15000);

  it('should fill circle with light gray like clock face', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Clock Face Test', width: 250, height: 250 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Same setup as clock.ts
            a.canvasCircle({
              x: 0, y: 0,
              x2: 200, y2: 200,
              fillColor: '#f5f5f5',  // Light gray - same as clock
              strokeColor: '#333333',
              strokeWidth: 3,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-fill-clockface.png');
      console.log('Screenshot saved to /tmp/canvas-fill-clockface.png');
    }
  }, 15000);

  it('should render multiple overlapping canvas elements like clock', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Multi Canvas Test', width: 250, height: 250 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Clock face (should be bottom)
            a.canvasCircle({
              x: 0, y: 0,
              x2: 200, y2: 200,
              fillColor: '#f5f5f5',
              strokeColor: '#333333',
              strokeWidth: 3,
            });
            // Hour hand (positional args: x1, y1, x2, y2, options)
            a.canvasLine(100, 100, 100, 50, {
              strokeColor: '#000000',
              strokeWidth: 4,
            });
            // Minute hand
            a.canvasLine(100, 100, 150, 100, {
              strokeColor: '#000000',
              strokeWidth: 2,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-multi-layer.png');
      console.log('Screenshot saved to /tmp/canvas-multi-layer.png');
    }
  }, 15000);

  // Step-of-elimination test: verify canvasLine x1,y1 coordinates
  it('should draw line from specified x1,y1 NOT from (0,0)', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Line Position Test', width: 200, height: 200 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Single horizontal line from center (100,100) to right (180,100)
            // If x1,y1 works: horizontal line in middle-right area
            // If x1,y1 ignored: diagonal line from (0,0) to (180,100)
            a.canvasLine(100, 100, 180, 100, {
              strokeColor: '#ff0000',
              strokeWidth: 5,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-line-position.png');
      console.log('Screenshot saved to /tmp/canvas-line-position.png');
      console.log('Expected: SHORT horizontal line in middle-right');
      console.log('If broken: LONG diagonal from top-left to middle-right');
    }
  }, 15000);

  // Additional test: vertical line from center going down
  it('should draw vertical line from center downward', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Vertical Line Test', width: 200, height: 200 }, (win) => {
        win.setContent(() => {
          a.stack(() => {
            // Vertical line from (100,100) down to (100,180)
            // If working: short vertical line in bottom-center
            // If broken: diagonal from (0,0) to (100,180)
            a.canvasLine(100, 100, 100, 180, {
              strokeColor: '#0000ff',
              strokeWidth: 5,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/canvas-line-vertical.png');
      console.log('Screenshot saved to /tmp/canvas-line-vertical.png');
      console.log('Expected: SHORT vertical line in bottom-center');
      console.log('If broken: diagonal from top-left to bottom-center');
    }
  }, 15000);
});
