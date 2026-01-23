// Test for padded container demo
import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';

describe('Padded Container Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display padded and non-padded content comparison', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Padded Container Demo', width: 500, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Title
            app.label('Padded Container Demo', undefined, 'center', undefined, { bold: true });
            app.separator();

            // Side-by-side comparison using split
            app.hsplit(
              // Left side: Without padding
              () => {
                app.vbox(() => {
                  app.label('Without Padding:', undefined, undefined, undefined, { bold: true });
                  app.card('Card Title', 'No padding around content', () => {
                    app.vbox(() => {
                      app.label('This content has no extra padding');
                      app.button('Button 1').onClick(() => {});
                      app.button('Button 2').onClick(() => {});
                    });
                  });
                });
              },
              // Right side: With padding
              () => {
                app.vbox(() => {
                  app.label('With Padding:', undefined, undefined, undefined, { bold: true });
                  app.card('Card Title', 'Theme padding around content', () => {
                    app.padded(() => {
                      app.vbox(() => {
                        app.label('This content has theme padding');
                        app.button('Button 1').onClick(() => {});
                        app.button('Button 2').onClick(() => {});
                      });
                    });
                  });
                });
              },
              0.5
            );
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the title is visible
    await ctx.expect(ctx.getByExactText('Padded Container Demo')).toBeVisible();

    // Verify both comparison labels are visible
    await ctx.expect(ctx.getByExactText('Without Padding:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('With Padding:')).toBeVisible();

    // Verify content in both sections
    await ctx.expect(ctx.getByExactText('This content has no extra padding')).toBeVisible();
    await ctx.expect(ctx.getByExactText('This content has theme padding')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'padded-demo.png');
      await ctx.wait(500); // Wait for rendering
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should allow padded container with single child', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Padded Test', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.padded(() => {
            app.label('Padded Label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Padded Label')).toBeVisible();
  });

  test('should allow nested padded containers', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Nested Padded', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.padded(() => {
            app.padded(() => {
              app.label('Double Padded');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Double Padded')).toBeVisible();
  });
});
