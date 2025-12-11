// Demo: Gradient Comparison - Linear vs Radial
// Shows the difference between linear and radial gradients

import { app } from '../core/src';

app({ title: 'Gradient Demo' }, (a) => {
  a.window({ title: 'Linear vs Radial Gradients', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Gradient Comparison');

        // Linear Gradients Section
        a.label('Linear Gradients:');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Horizontal (0 deg)');
            a.canvasLinearGradient({
              startColor: '#e74c3c',
              endColor: '#3498db',
              angle: 0,
              width: 150,
              height: 100
            });
          });

          a.vbox(() => {
            a.label('Vertical (90 deg)');
            a.canvasLinearGradient({
              startColor: '#27ae60',
              endColor: '#9b59b6',
              angle: 90,
              width: 150,
              height: 100
            });
          });

          a.vbox(() => {
            a.label('Diagonal (45 deg)');
            a.canvasLinearGradient({
              startColor: '#f1c40f',
              endColor: '#e67e22',
              angle: 45,
              width: 150,
              height: 100
            });
          });
        });

        // Radial Gradients Section
        a.label('Radial Gradients:');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Centered');
            a.canvasRadialGradient({
              startColor: '#ffffff',
              endColor: '#e74c3c',
              width: 150,
              height: 100
            });
          });

          a.vbox(() => {
            a.label('Offset Left');
            a.canvasRadialGradient({
              startColor: '#ffffff',
              endColor: '#3498db',
              centerOffsetX: -0.3,
              centerOffsetY: 0,
              width: 150,
              height: 100
            });
          });

          a.vbox(() => {
            a.label('Offset Top-Right');
            a.canvasRadialGradient({
              startColor: '#f1c40f',
              endColor: '#9b59b6',
              centerOffsetX: 0.3,
              centerOffsetY: -0.3,
              width: 150,
              height: 100
            });
          });
        });

        // Gradient Buttons
        a.label('Gradients as Backgrounds:');
        a.hbox(() => {
          a.canvasRadialGradient({
            startColor: '#34495e',
            endColor: '#2c3e50',
            width: 200,
            height: 50
          });
        });
      });
    });
    win.show();
  });
});
