/**
 * Gradient Picker - Gradient editor demo using canvas.LinearGradient
 *
 * Demonstrates:
 * - canvas.LinearGradient for gradient fills
 * - Dynamic gradient updates
 * - Angle and color adjustments
 */

import { app, CanvasLinearGradient } from '../src/index';

app({ title: 'Gradient Picker' }, (a) => {
  let gradient: CanvasLinearGradient;
  let startColor = '#FF0000';
  let endColor = '#0000FF';
  let angle = 0;

  const colors = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'Orange', hex: '#FF8800' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Purple', hex: '#8800FF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
  ];

  a.window({ title: 'Gradient Picker', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.hbox(() => {
            a.label('Gradient Picker', undefined, undefined, undefined, { bold: true });
            a.separator();
            a.label(`Angle: ${angle}°`);
          });
        },
        left: () => {
          a.vbox(() => {
            a.label('Start Color', undefined, 'center', undefined, { bold: true });
            a.separator();
            colors.forEach(color => {
              a.button(color.name, async () => {
                startColor = color.hex;
                await gradient.update({ startColor });
              });
            });
          });
        },
        right: () => {
          a.vbox(() => {
            a.label('End Color', undefined, 'center', undefined, { bold: true });
            a.separator();
            colors.forEach(color => {
              a.button(color.name, async () => {
                endColor = color.hex;
                await gradient.update({ endColor });
              });
            });
          });
        },
        center: () => {
          a.vbox(() => {
            // Main gradient display
            gradient = a.canvasLinearGradient({
              startColor,
              endColor,
              angle,
              width: 400,
              height: 300
            });

            a.separator();
            a.label('Angle Presets', undefined, 'center', undefined, { bold: true });
            a.hbox(() => {
              a.button('0°', async () => { angle = 0; await gradient.update({ angle: 0 }); });
              a.button('45°', async () => { angle = 45; await gradient.update({ angle: 45 }); });
              a.button('90°', async () => { angle = 90; await gradient.update({ angle: 90 }); });
              a.button('135°', async () => { angle = 135; await gradient.update({ angle: 135 }); });
              a.button('180°', async () => { angle = 180; await gradient.update({ angle: 180 }); });
              a.button('270°', async () => { angle = 270; await gradient.update({ angle: 270 }); });
            });

            a.separator();
            a.label('Preset Gradients', undefined, 'center', undefined, { bold: true });
            a.hbox(() => {
              a.button('Sunset', async () => {
                startColor = '#FF4500';
                endColor = '#FFD700';
                angle = 180;
                await gradient.update({ startColor, endColor, angle });
              });
              a.button('Ocean', async () => {
                startColor = '#0077BE';
                endColor = '#00CED1';
                angle = 90;
                await gradient.update({ startColor, endColor, angle });
              });
              a.button('Forest', async () => {
                startColor = '#228B22';
                endColor = '#90EE90';
                angle = 45;
                await gradient.update({ startColor, endColor, angle });
              });
              a.button('Night', async () => {
                startColor = '#191970';
                endColor = '#000000';
                angle = 270;
                await gradient.update({ startColor, endColor, angle });
              });
              a.button('Fire', async () => {
                startColor = '#FF0000';
                endColor = '#FFFF00';
                angle = 0;
                await gradient.update({ startColor, endColor, angle });
              });
            });
          });
        },
        bottom: () => {
          a.label('Select start and end colors, then adjust the angle to create custom gradients');
        }
      });
    });
    win.show();
  });
});
