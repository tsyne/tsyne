// Test for Color Mixer example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Color Mixer Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial gray color', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'RGB Color Mixer', width: 400, height: 300 }, (win) => {
        let red = 128;
        let green = 128;
        let blue = 128;
        let colorDisplay: any;
        let hexLabel: any;
        let rgbLabel: any;

        function updateColor() {
          const hex = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
          const rgb = `rgb(${red}, ${green}, ${blue})`;

          if (hexLabel) hexLabel.setText(`Hex: ${hex}`);
          if (rgbLabel) rgbLabel.setText(`RGB: ${rgb}`);
          if (colorDisplay) colorDisplay.setText(`   █████████   \n   █████████   \n   █████████   `);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('Mix Your Color');
            app.separator();

            colorDisplay = app.label('   █████████   \n   █████████   \n   █████████   ');

            hexLabel = app.label(`Hex: #808080`);
            rgbLabel = app.label(`RGB: rgb(128, 128, 128)`);

            app.separator();

            const redLabel = app.label('Red: 128');
            app.slider(0, 255, 128, (value) => {
              red = Math.round(value);
              redLabel.setText(`Red: ${red}`);
              updateColor();
            });

            const greenLabel = app.label('Green: 128');
            app.slider(0, 255, 128, (value) => {
              green = Math.round(value);
              greenLabel.setText(`Green: ${green}`);
              updateColor();
            });

            const blueLabel = app.label('Blue: 128');
            app.slider(0, 255, 128, (value) => {
              blue = Math.round(value);
              blueLabel.setText(`Blue: ${blue}`);
              updateColor();
            });

            app.separator();

            app.hbox(() => {
              app.button('Random Color').onClick(() => {
                red = Math.floor(Math.random() * 256);
                green = Math.floor(Math.random() * 256);
                blue = Math.floor(Math.random() * 256);
                redLabel.setText(`Red: ${red}`);
                greenLabel.setText(`Green: ${green}`);
                blueLabel.setText(`Blue: ${blue}`);
                updateColor();
              });

              app.button('Reset').onClick(() => {
                red = green = blue = 128;
                redLabel.setText(`Red: 128`);
                greenLabel.setText(`Green: 128`);
                blueLabel.setText(`Blue: 128`);
                updateColor();
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial color should be gray (#808080)
    await ctx.expect(ctx.getByExactText('Hex: #808080')).toBeVisible();
    await ctx.expect(ctx.getByExactText('RGB: rgb(128, 128, 128)')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Red: 128')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Green: 128')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Blue: 128')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '14-color-mixer.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should handle reset button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'RGB Color Mixer', width: 400, height: 300 }, (win) => {
        let red = 200;
        let green = 100;
        let blue = 50;
        let colorDisplay: any;
        let hexLabel: any;
        let rgbLabel: any;

        function updateColor() {
          const hex = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
          const rgb = `rgb(${red}, ${green}, ${blue})`;

          if (hexLabel) hexLabel.setText(`Hex: ${hex}`);
          if (rgbLabel) rgbLabel.setText(`RGB: ${rgb}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('Mix Your Color');
            colorDisplay = app.label('Color Display');

            hexLabel = app.label(`Hex: #c86432`);
            rgbLabel = app.label(`RGB: rgb(200, 100, 50)`);

            const redLabel = app.label('Red: 200');
            const greenLabel = app.label('Green: 100');
            const blueLabel = app.label('Blue: 50');

            app.button('Reset').onClick(() => {
              red = green = blue = 128;
              redLabel.setText(`Red: 128`);
              greenLabel.setText(`Green: 128`);
              blueLabel.setText(`Blue: 128`);
              updateColor();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click reset
    await ctx.getByExactText('Reset').click();
    await ctx.wait(100);

    // Should reset to gray
    await ctx.expect(ctx.getByExactText('Hex: #808080')).toBeVisible();
    await ctx.expect(ctx.getByExactText('RGB: rgb(128, 128, 128)')).toBeVisible();
  });
});
