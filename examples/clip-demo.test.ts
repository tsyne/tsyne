/**
 * Tests for the Clip container
 *
 * Verifies that the clip container:
 * 1. Can be created with content
 * 2. Renders its child content
 * 3. Works properly in the widget tree
 */
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Clip Container', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create a clip container with content', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Clip Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Before Clip');

            // Create a clip container with content
            app.clip(() => {
              app.vbox(() => {
                app.label('Inside Clip Container');
                app.label('This content is clipped');
              });
            });

            app.label('After Clip');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify content before clip is visible
    await ctx.expect(ctx.getByExactText('Before Clip')).toBeVisible();

    // Verify content inside clip is visible
    await ctx.expect(ctx.getByExactText('Inside Clip Container')).toBeVisible();
    await ctx.expect(ctx.getByExactText('This content is clipped')).toBeVisible();

    // Verify content after clip is visible
    await ctx.expect(ctx.getByExactText('After Clip')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'clip-demo.png');
      await ctx.wait(500); // Wait for rendering
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should work with nested clip containers', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Nested Clip Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.clip(() => {
            app.vbox(() => {
              app.label('Outer Clip');

              app.clip(() => {
                app.label('Inner Clip');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify both nested clip containers render their content
    await ctx.expect(ctx.getByExactText('Outer Clip')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Inner Clip')).toBeVisible();
  });

  test('should work with interactive widgets inside clip', async () => {
    let buttonClicked = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Clip Interactive Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.clip(() => {
            app.vbox(() => {
              app.label('Click the button below:');
              app.button('Click Me').onClick(() => {
                buttonClicked = true;
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify button is visible and clickable
    await ctx.expect(ctx.getByText('Click Me')).toBeVisible();
    await ctx.getByText('Click Me').click();
    await ctx.wait(100);

    // Verify button click was registered
    expect(buttonClicked).toBe(true);
  });
});
