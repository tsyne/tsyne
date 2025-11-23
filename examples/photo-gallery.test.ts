// Test for Photo Gallery example - demonstrates AdaptiveGrid and Padded containers
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Photo Gallery Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display gallery with adaptive grid', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Photo Gallery Test', width: 800, height: 600 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Header with padded content
            app.padded(() => {
              app.label('Photo Gallery');
            });

            // Gallery using adaptive grid with 3 columns
            app.adaptivegrid(3, () => {
              app.card('Sunset Beach', 'Photo 1', () => {
                app.padded(() => {
                  app.button('View', () => {});
                });
              });

              app.card('Mountain View', 'Photo 2', () => {
                app.padded(() => {
                  app.button('View', () => {});
                });
              });

              app.card('City Lights', 'Photo 3', () => {
                app.padded(() => {
                  app.button('View', () => {});
                });
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify header is visible
    await ctx.expect(ctx.getByExactText('Photo Gallery')).toBeVisible();

    // Verify cards are visible
    await ctx.expect(ctx.getByExactText('Sunset Beach')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Mountain View')).toBeVisible();
    await ctx.expect(ctx.getByExactText('City Lights')).toBeVisible();

    // Verify at least one View button inside padded containers is visible
    await ctx.expect(ctx.getByExactText('View')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'photo-gallery.png');
      await ctx.wait(500); // Wait for rendering
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should create padded container correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Padded Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.padded(() => {
            app.label('Content with padding');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Content with padding')).toBeVisible();
  });

  test('should create adaptive grid with varying content', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'AdaptiveGrid Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.adaptivegrid(2, () => {
            app.button('Item 1', () => {});
            app.button('Item 2', () => {});
            app.button('Item 3', () => {});
            app.button('Item 4', () => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All items should be visible
    await ctx.expect(ctx.getByExactText('Item 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Item 2')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Item 3')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Item 4')).toBeVisible();
  });
});
