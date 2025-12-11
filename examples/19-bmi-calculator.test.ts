// Test for BMI Calculator example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('BMI Calculator Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial BMI calculation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'BMI Calculator', width: 400, height: 550 }, (win) => {
        let heightCm = 170;
        let weightKg = 70;
        let bmiLabel: any;
        let categoryLabel: any;

        function calculateBMI() {
          const heightM = heightCm / 100;
          const bmi = weightKg / (heightM * heightM);

          let category = '';
          let emoji = '';

          if (bmi < 18.5) {
            category = 'Underweight';
            emoji = '⚠️';
          } else if (bmi < 25) {
            category = 'Normal weight';
            emoji = '✅';
          } else if (bmi < 30) {
            category = 'Overweight';
            emoji = '⚠️';
          } else {
            category = 'Obese';
            emoji = '❗';
          }

          if (bmiLabel) bmiLabel.setText(`BMI: ${bmi.toFixed(1)}`);
          if (categoryLabel) categoryLabel.setText(`${emoji} ${category}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('📊 BMI Calculator 📊');
            app.separator();

            app.label(`Height: ${heightCm} cm`);
            app.label(`Weight: ${weightKg} kg`);

            app.separator();

            app.label('═══════════════════');
            bmiLabel = app.label('BMI: --');
            categoryLabel = app.label('--');
            app.label('═══════════════════');

            app.separator();

            app.label('BMI Categories:');
            app.label('• Underweight: < 18.5');
            app.label('• Normal: 18.5 - 24.9');
            app.label('• Overweight: 25 - 29.9');
            app.label('• Obese: ≥ 30');
          });
        });

        calculateBMI();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial BMI should be calculated (170cm, 70kg = 24.2)
    await ctx.expect(ctx.getByExactText('BMI: 24.2')).toBeVisible();
    await ctx.expect(ctx.getByExactText('✅ Normal weight')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '19-bmi-calculator.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should categorize underweight correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'BMI Calculator', width: 400, height: 550 }, (win) => {
        let heightCm = 180;
        let weightKg = 55;
        let bmiLabel: any;
        let categoryLabel: any;

        function calculateBMI() {
          const heightM = heightCm / 100;
          const bmi = weightKg / (heightM * heightM);

          let category = '';
          let emoji = '';

          if (bmi < 18.5) {
            category = 'Underweight';
            emoji = '⚠️';
          } else if (bmi < 25) {
            category = 'Normal weight';
            emoji = '✅';
          } else if (bmi < 30) {
            category = 'Overweight';
            emoji = '⚠️';
          } else {
            category = 'Obese';
            emoji = '❗';
          }

          if (bmiLabel) bmiLabel.setText(`BMI: ${bmi.toFixed(1)}`);
          if (categoryLabel) categoryLabel.setText(`${emoji} ${category}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('📊 BMI Calculator 📊');
            bmiLabel = app.label('BMI: --');
            categoryLabel = app.label('--');
          });
        });

        calculateBMI();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // BMI should be 17.0 (underweight)
    await ctx.expect(ctx.getByExactText('BMI: 17.0')).toBeVisible();
    await ctx.expect(ctx.getByExactText('⚠️ Underweight')).toBeVisible();
  });

  test('should categorize overweight correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'BMI Calculator', width: 400, height: 550 }, (win) => {
        let heightCm = 170;
        let weightKg = 80;
        let bmiLabel: any;
        let categoryLabel: any;

        function calculateBMI() {
          const heightM = heightCm / 100;
          const bmi = weightKg / (heightM * heightM);

          let category = '';
          let emoji = '';

          if (bmi < 18.5) {
            category = 'Underweight';
            emoji = '⚠️';
          } else if (bmi < 25) {
            category = 'Normal weight';
            emoji = '✅';
          } else if (bmi < 30) {
            category = 'Overweight';
            emoji = '⚠️';
          } else {
            category = 'Obese';
            emoji = '❗';
          }

          if (bmiLabel) bmiLabel.setText(`BMI: ${bmi.toFixed(1)}`);
          if (categoryLabel) categoryLabel.setText(`${emoji} ${category}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('📊 BMI Calculator 📊');
            bmiLabel = app.label('BMI: --');
            categoryLabel = app.label('--');
          });
        });

        calculateBMI();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // BMI should be 27.7 (overweight)
    await ctx.expect(ctx.getByExactText('BMI: 27.7')).toBeVisible();
    await ctx.expect(ctx.getByExactText('⚠️ Overweight')).toBeVisible();
  });

  test('should categorize obese correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'BMI Calculator', width: 400, height: 550 }, (win) => {
        let heightCm = 170;
        let weightKg = 95;
        let bmiLabel: any;
        let categoryLabel: any;

        function calculateBMI() {
          const heightM = heightCm / 100;
          const bmi = weightKg / (heightM * heightM);

          let category = '';
          let emoji = '';

          if (bmi < 18.5) {
            category = 'Underweight';
            emoji = '⚠️';
          } else if (bmi < 25) {
            category = 'Normal weight';
            emoji = '✅';
          } else if (bmi < 30) {
            category = 'Overweight';
            emoji = '⚠️';
          } else {
            category = 'Obese';
            emoji = '❗';
          }

          if (bmiLabel) bmiLabel.setText(`BMI: ${bmi.toFixed(1)}`);
          if (categoryLabel) categoryLabel.setText(`${emoji} ${category}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('📊 BMI Calculator 📊');
            bmiLabel = app.label('BMI: --');
            categoryLabel = app.label('--');
          });
        });

        calculateBMI();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // BMI should be 32.9 (obese)
    await ctx.expect(ctx.getByExactText('BMI: 32.9')).toBeVisible();
    await ctx.expect(ctx.getByExactText('❗ Obese')).toBeVisible();
  });
});
