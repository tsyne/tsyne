// Test for font-preview example
import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';

describe('Font Preview Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display font preview interface', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Font Preview Test', width: 700, height: 500 }, (win) => {
        let statusLabel: any;
        let fontPathEntry: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('Custom Font Preview');
            app.label('Load and preview custom fonts');
            app.separator();

            app.label('Load Custom Font:');
            app.hbox(() => {
              app.label('Font Path:');
              fontPathEntry = app.entry('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
            });

            app.hbox(() => {
              app.button('Load Font').onClick(async () => {
                const fontPath = await fontPathEntry.getText();
                try {
                  await app.setCustomFont(fontPath, 'regular');
                  statusLabel.setText(`Loaded font: ${fontPath}`);
                } catch (err: any) {
                  statusLabel.setText(`Error: ${err.message || 'Failed to load font'}`);
                }
              });

              app.button('Clear Fonts').onClick(async () => {
                await app.clearCustomFont('all');
                statusLabel.setText('Cleared all custom fonts');
              });
            });

            app.separator();

            app.label('Font Scale:');
            app.hbox(() => {
              app.button('Small').onClick(async () => {
                await app.setFontScale(0.75);
                statusLabel.setText('Font scale: 0.75x');
              });
              app.button('Normal').onClick(async () => {
                await app.setFontScale(1.0);
                statusLabel.setText('Font scale: 1.0x');
              });
              app.button('Large').onClick(async () => {
                await app.setFontScale(1.5);
                statusLabel.setText('Font scale: 1.5x');
              });
            });

            app.separator();

            app.label('Sample Text:');
            app.label('The quick brown fox jumps over the lazy dog.');
            app.label('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            app.label('0123456789');

            app.separator();
            statusLabel = app.label('Ready');

            app.separator();
            app.label('Supported formats: .ttf, .otf');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify UI elements
    await ctx.expect(ctx.getByExactText('Custom Font Preview')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Load Custom Font:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Font Path:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Load Font')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Clear Fonts')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Font Scale:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Sample Text:')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'font-preview.png');
      await ctx.getByExactText('Sample Text:').within(500).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Test clear fonts button
    await ctx.getByExactText('Clear Fonts').click();
    await ctx.getByExactText('Cleared all custom fonts').within(200).shouldExist();

    // Test font scale buttons
    await ctx.getByExactText('Small').click();
    await ctx.getByExactText('Font scale: 0.75x').within(200).shouldExist();

    await ctx.getByExactText('Large').click();
    await ctx.getByExactText('Font scale: 1.5x').within(200).shouldExist();

    await ctx.getByExactText('Normal').click();
    await ctx.getByExactText('Font scale: 1.0x').within(200).shouldExist();
  });

  test('should provide font information', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Font Info Test', width: 600, height: 400 }, (win) => {
        let infoLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('Font Information');
            app.separator();

            app.button('Get Font Info').onClick(async () => {
              const fontInfo = await app.getAvailableFonts();
              const extensions = fontInfo.supportedExtensions.join(', ');
              const styles = fontInfo.styles.join(', ');
              infoLabel.setText(`Extensions: ${extensions} | Styles: ${styles}`);
            });

            app.separator();
            infoLabel = app.label('Click button to get font info');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test getting font info
    await ctx.getByExactText('Get Font Info').click();

    // Verify font info was retrieved (should contain .ttf)
    await ctx.getByText('.ttf').within(200).shouldExist();
  });
});
