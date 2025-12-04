// Test for theme-creator example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Theme Creator Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display theme creator interface', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Theme Creator Test', width: 800, height: 600 }, (win) => {
        let statusLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('Custom Theme Creator');
            app.label('Build and preview custom color schemes');
            app.separator();

            // Theme controls
            app.label('Preset Themes:');
            app.hbox(() => {
              app.button('Ocean').onClick(async () => {
                await app.setCustomTheme({
                  background: '#0a1929',
                  foreground: '#b2bac2',
                  primary: '#1976d2',
                });
                statusLabel.setText('Applied Ocean theme');
              });

              app.button('Forest').onClick(async () => {
                await app.setCustomTheme({
                  background: '#1a2e1a',
                  foreground: '#c8e6c9',
                  primary: '#4caf50',
                });
                statusLabel.setText('Applied Forest theme');
              });

              app.button('Reset').onClick(async () => {
                await app.clearCustomTheme();
                statusLabel.setText('Reset to default theme');
              });
            });

            app.separator();

            // Widget preview
            app.label('Widget Preview:');
            app.hbox(() => {
              app.button('Test Button').onClick(() => statusLabel.setText('Button clicked'));
            });
            app.entry('Sample entry field');
            app.checkbox('Sample checkbox', () => {});

            app.separator();
            statusLabel = app.label('Select a theme to apply');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify UI elements are visible
    await ctx.expect(ctx.getByExactText('Custom Theme Creator')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Preset Themes:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Ocean')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Forest')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Reset')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Widget Preview:')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'theme-creator.png');
      await ctx.getByExactText('Widget Preview:').within(500).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Test applying Ocean theme
    await ctx.getByExactText('Ocean').click();
    await ctx.getByExactText('Applied Ocean theme').within(200).shouldExist();

    // Test applying Forest theme
    await ctx.getByExactText('Forest').click();
    await ctx.getByExactText('Applied Forest theme').within(200).shouldExist();

    // Test resetting theme
    await ctx.getByExactText('Reset').click();
    await ctx.getByExactText('Reset to default theme').within(200).shouldExist();
  });

  test('should support font scale changes', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Font Scale Test', width: 600, height: 400 }, (win) => {
        let scaleLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('Font Scale Test');
            app.separator();

            scaleLabel = app.label('Scale: 1.0x');

            app.hbox(() => {
              app.button('Small').onClick(async () => {
                await app.setFontScale(0.75);
                scaleLabel.setText('Scale: 0.75x');
              });

              app.button('Normal').onClick(async () => {
                await app.setFontScale(1.0);
                scaleLabel.setText('Scale: 1.0x');
              });

              app.button('Large').onClick(async () => {
                await app.setFontScale(1.5);
                scaleLabel.setText('Scale: 1.5x');
              });
            });

            app.separator();
            app.label('Sample text for scaling preview');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Scale: 1.0x')).toBeVisible();

    // Test small scale
    await ctx.getByExactText('Small').click();
    await ctx.getByExactText('Scale: 0.75x').within(200).shouldExist();

    // Test large scale
    await ctx.getByExactText('Large').click();
    await ctx.getByExactText('Scale: 1.5x').within(200).shouldExist();

    // Reset to normal
    await ctx.getByExactText('Normal').click();
    await ctx.getByExactText('Scale: 1.0x').within(200).shouldExist();
  });
});
