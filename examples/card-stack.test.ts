// Test for Card Stack example - demonstrates Stack container for Z-layered UI
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Card Stack Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display stacked cards with controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Card Stack Demo', width: 600, height: 500 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Card Stack Demo');
            app.label('Click the buttons below to bring cards to the front');

            // Card control buttons
            app.hbox(() => {
              app.button('Show Card 1').onClick(() => {});
              app.button('Show Card 2').onClick(() => {});
              app.button('Show Card 3').onClick(() => {});
            });

            // Stack container - cards are layered on top of each other
            app.stack(() => {
              // Card 1 (bottom)
              app.card('Card 1', 'First card in the stack', () => {
                app.vbox(() => {
                  app.label('This is Card 1');
                  app.label('It appears at the bottom of the stack');
                });
              });

              // Card 2 (middle)
              app.card('Card 2', 'Second card in the stack', () => {
                app.vbox(() => {
                  app.label('This is Card 2');
                  app.label('It appears in the middle of the stack');
                });
              });

              // Card 3 (top)
              app.card('Card 3', 'Third card in the stack', () => {
                app.vbox(() => {
                  app.label('This is Card 3');
                  app.label('It appears on top of the stack');
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

    // Verify the stack container and its cards are visible
    await ctx.expect(ctx.getByExactText('Card Stack Demo')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Card 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Card 2')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Card 3')).toBeVisible();

    // Verify control buttons are present
    await ctx.expect(ctx.getByExactText('Show Card 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Card 2')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Card 3')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'card-stack.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should create stack with multiple children', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Stack Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.stack(() => {
            app.label('Layer 1 - Bottom');
            app.label('Layer 2 - Middle');
            app.label('Layer 3 - Top');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All layers should exist in the stack
    await ctx.expect(ctx.getByExactText('Layer 1 - Bottom')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Layer 2 - Middle')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Layer 3 - Top')).toBeVisible();
  });

  test('should support nested containers in stack', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Nested Stack Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.stack(() => {
            // Background layer
            app.vbox(() => {
              app.label('Background');
            });
            // Foreground layer
            app.vbox(() => {
              app.label('Foreground');
              app.button('Action').onClick(() => {});
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Both layers should be visible
    await ctx.expect(ctx.getByExactText('Background')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Foreground')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Action')).toBeVisible();
  });
});
