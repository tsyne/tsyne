/**
 * Slider Widget Example
 *
 * Demonstrates the slider widget with multiple sliders for
 * different value ranges and use cases.
 */

import { app, window, vbox, hbox, label, slider, button, screenshotIfRequested } from '../src';

let volumeSlider: any;
let brightnessSlider: any;
let temperatureSlider: any;
let volumeLabel: any;
let brightnessLabel: any;
let temperatureLabel: any;

app({ title: 'Slider Demo' }, () => {
  window({ title: 'Slider Example', width: 450, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Slider Widget Example');
        label('');

        // Volume slider (0-100)
        label('Volume Control:');
        volumeLabel = label('Volume: 50%');
        volumeSlider = slider(0, 100, 50, (value) => {
          volumeLabel.setText(`Volume: ${Math.round(value)}%`);
// console.log('Volume:', value);
        });

        label('');

        // Brightness slider (0-100)
        label('Brightness Control:');
        brightnessLabel = label('Brightness: 75%');
        brightnessSlider = slider(0, 100, 75, (value) => {
          brightnessLabel.setText(`Brightness: ${Math.round(value)}%`);
// console.log('Brightness:', value);
        });

        label('');

        // Temperature slider (-20 to 40 Celsius)
        label('Temperature Setting:');
        temperatureLabel = label('Temperature: 20.0°C');
        temperatureSlider = slider(-20, 40, 20, (value) => {
          temperatureLabel.setText(`Temperature: ${value.toFixed(1)}°C`);
// console.log('Temperature:', value);
        });

        label('');

        // Control buttons
        hbox(() => {
          button('Set Defaults', async () => {
            await volumeSlider.setValue(50);
            await brightnessSlider.setValue(75);
            await temperatureSlider.setValue(20);
            volumeLabel.setText('Volume: 50%');
            brightnessLabel.setText('Brightness: 75%');
            temperatureLabel.setText('Temperature: 20.0°C');
          });

          button('Mute/Dark', async () => {
            await volumeSlider.setValue(0);
            await brightnessSlider.setValue(0);
            volumeLabel.setText('Volume: 0%');
            brightnessLabel.setText('Brightness: 0%');
          });

          button('Max', async () => {
            await volumeSlider.setValue(100);
            await brightnessSlider.setValue(100);
            volumeLabel.setText('Volume: 100%');
            brightnessLabel.setText('Brightness: 100%');
          });
        });

        label('');

        hbox(() => {
          button('Get Values', async () => {
            const volume = await volumeSlider.getValue();
            const brightness = await brightnessSlider.getValue();
            const temperature = await temperatureSlider.getValue();

// console.log('Current values:', {
              volume: Math.round(volume),
              brightness: Math.round(brightness),
              temperature: temperature.toFixed(1)
            });

            alert(
              `Volume: ${Math.round(volume)}%\n` +
              `Brightness: ${Math.round(brightness)}%\n` +
              `Temperature: ${temperature.toFixed(1)}°C`
            );
          });
        });
      });
    });

    win.show();
    screenshotIfRequested(win);
  });
});

// Helper function to simulate an alert (since we don't have dialogs yet)
function alert(message: string) {
// console.log('ALERT:', message);
}
