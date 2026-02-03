// BMI Calculator - Calculate Body Mass Index with visual feedback
// Demonstrates unit conversion, sliders, and conditional display

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'BMI Calculator' }, (a) => {
  a.window({ title: 'BMI Calculator', width: 400, height: 550 }, (win) => {
    let heightCm = 170;
    let weightKg = 70;
    let useMetric = true;
    let bmiLabel: any;
    let categoryLabel: any;
    let rangeLabel: any;
    let heightLabel: any;
    let weightLabel: any;

    function calculateBMI() {
      // Convert to metric if needed
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);

      let category = '';
      let emoji = '';
      let range = '';

      if (bmi < 18.5) {
        category = 'Underweight';
        emoji = '⚠️';
        range = 'BMI < 18.5';
      } else if (bmi < 25) {
        category = 'Normal weight';
        emoji = '✅';
        range = '18.5 ≤ BMI < 25';
      } else if (bmi < 30) {
        category = 'Overweight';
        emoji = '⚠️';
        range = '25 ≤ BMI < 30';
      } else {
        category = 'Obese';
        emoji = '❗';
        range = 'BMI ≥ 30';
      }

      if (bmiLabel) bmiLabel.setText(`BMI: ${bmi.toFixed(1)}`);
      if (categoryLabel) categoryLabel.setText(`${emoji} ${category}`);
      if (rangeLabel) rangeLabel.setText(`(${range})`);
    }

    function updateHeightDisplay() {
      if (!heightLabel) return;

      if (useMetric) {
        heightLabel.setText(`Height: ${heightCm} cm`);
      } else {
        const totalInches = heightCm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        heightLabel.setText(`Height: ${feet}' ${inches}"`);
      }
    }

    function updateWeightDisplay() {
      if (!weightLabel) return;

      if (useMetric) {
        weightLabel.setText(`Weight: ${weightKg} kg`);
      } else {
        const lbs = Math.round(weightKg * 2.20462);
        weightLabel.setText(`Weight: ${lbs} lbs`);
      }
    }

    win.setContent(() => {
      a.vbox(() => {
        a.label('📊 BMI Calculator 📊');
        a.separator();

        // Unit toggle
        a.hbox(() => {
          a.button(useMetric ? '✓ Metric' : 'Metric', { onClick: () => {
            useMetric = true;
            updateHeightDisplay();
            updateWeightDisplay();
            win.setContent(() => buildUI());
          } });

          a.button(!useMetric ? '✓ Imperial' : 'Imperial', { onClick: () => {
            useMetric = false;
            updateHeightDisplay();
            updateWeightDisplay();
            win.setContent(() => buildUI());
          } });
        });

        a.separator();

        // Height slider
        heightLabel = a.label(`Height: ${heightCm} cm`);
        updateHeightDisplay();

        a.slider(100, 250, heightCm, (value) => {
          heightCm = Math.round(value);
          updateHeightDisplay();
          calculateBMI();
        });

        a.separator();

        // Weight slider
        weightLabel = a.label(`Weight: ${weightKg} kg`);
        updateWeightDisplay();

        a.slider(30, 200, weightKg, (value) => {
          weightKg = Math.round(value);
          updateWeightDisplay();
          calculateBMI();
        });

        a.separator();

        // Results
        a.label('═══════════════════');
        bmiLabel = a.label('BMI: --');
        categoryLabel = a.label('--');
        rangeLabel = a.label('');
        a.label('═══════════════════');

        a.separator();

        // BMI Categories reference
        a.label('BMI Categories:');
        a.label('• Underweight: < 18.5');
        a.label('• Normal: 18.5 - 24.9');
        a.label('• Overweight: 25 - 29.9');
        a.label('• Obese: ≥ 30');

        a.separator();
        a.label('⚕️ This is for informational purposes only');
      });
    });

    function buildUI() {
      a.vbox(() => {
        a.label('📊 BMI Calculator 📊');
        a.separator();

        // Unit toggle
        a.hbox(() => {
          a.button(useMetric ? '✓ Metric' : 'Metric', { onClick: () => {
            useMetric = true;
            updateHeightDisplay();
            updateWeightDisplay();
            win.setContent(() => buildUI());
          } });

          a.button(!useMetric ? '✓ Imperial' : 'Imperial', { onClick: () => {
            useMetric = false;
            updateHeightDisplay();
            updateWeightDisplay();
            win.setContent(() => buildUI());
          } });
        });

        a.separator();

        // Height slider
        heightLabel = a.label(`Height: ${heightCm} cm`);
        updateHeightDisplay();

        a.slider(100, 250, heightCm, (value) => {
          heightCm = Math.round(value);
          updateHeightDisplay();
          calculateBMI();
        });

        a.separator();

        // Weight slider
        weightLabel = a.label(`Weight: ${weightKg} kg`);
        updateWeightDisplay();

        a.slider(30, 200, weightKg, (value) => {
          weightKg = Math.round(value);
          updateWeightDisplay();
          calculateBMI();
        });

        a.separator();

        // Results
        a.label('═══════════════════');
        bmiLabel = a.label('BMI: --');
        categoryLabel = a.label('--');
        rangeLabel = a.label('');
        a.label('═══════════════════');

        a.separator();

        // BMI Categories reference
        a.label('BMI Categories:');
        a.label('• Underweight: < 18.5');
        a.label('• Normal: 18.5 - 24.9');
        a.label('• Overweight: 25 - 29.9');
        a.label('• Obese: ≥ 30');

        a.separator();
        a.label('⚕️ This is for informational purposes only');
      });
    }

    // Initial calculation
    calculateBMI();
    win.show();
  });
});
