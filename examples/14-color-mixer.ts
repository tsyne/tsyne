// Color Mixer - Interactive RGB color mixing with sliders
// Demonstrates sliders, dynamic updates, and color visualization

import { app, resolveTransport  } from '../core/src';

app(resolveTransport(), { title: 'Color Mixer' }, (a) => {
  a.window({ title: 'RGB Color Mixer', width: 400, height: 300 }, (win) => {
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
      a.vbox(() => {
        a.label('Mix Your Color');
        a.separator();

        // Color preview area
        colorDisplay = a.label('   █████████   \n   █████████   \n   █████████   ');

        hexLabel = a.label(`Hex: #808080`);
        rgbLabel = a.label(`RGB: rgb(128, 128, 128)`);

        a.separator();

        // Red slider
        a.label('Red: 128');
        const redLabel = a.label('Red: 128');
        a.slider(0, 255, 128, (value) => {
          red = Math.round(value);
          redLabel.setText(`Red: ${red}`);
          updateColor();
        });

        // Green slider
        const greenLabel = a.label('Green: 128');
        a.slider(0, 255, 128, (value) => {
          green = Math.round(value);
          greenLabel.setText(`Green: ${green}`);
          updateColor();
        });

        // Blue slider
        const blueLabel = a.label('Blue: 128');
        a.slider(0, 255, 128, (value) => {
          blue = Math.round(value);
          blueLabel.setText(`Blue: ${blue}`);
          updateColor();
        });

        a.separator();

        a.hbox(() => {
          a.button('Random Color').onClick(() => {
            red = Math.floor(Math.random() * 256);
            green = Math.floor(Math.random() * 256);
            blue = Math.floor(Math.random() * 256);
            redLabel.setText(`Red: ${red}`);
            greenLabel.setText(`Green: ${green}`);
            blueLabel.setText(`Blue: ${blue}`);
            updateColor();
          });

          a.button('Reset').onClick(() => {
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
