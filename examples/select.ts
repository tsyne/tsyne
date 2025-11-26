/**
 * Select (Dropdown) Widget Example
 *
 * Demonstrates the select dropdown widget with multiple dropdowns
 * and dynamic interaction.
 */

import { app, window, vbox, hbox, label, select, button, screenshotIfRequested } from '../src';

let colorSelect: any;
let sizeSelect: any;
let countrySelect: any;
let resultLabel: any;

app({ title: 'Select Demo' }, () => {
  window({ title: 'Select (Dropdown) Example', width: 450, height: 350 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Select (Dropdown) Widget Example');
        label('');

        // Color selector
        label('Choose a color:');
        colorSelect = select(
          ['Red', 'Green', 'Blue', 'Yellow', 'Purple'],
          (selected) => {
            console.log('Color selected:', selected);
            updateResult();
          }
        );

        label('');

        // Size selector
        label('Choose a size:');
        sizeSelect = select(['Small', 'Medium', 'Large', 'Extra Large'], (selected) => {
          console.log('Size selected:', selected);
          updateResult();
        });

        label('');

        // Country selector
        label('Choose your country:');
        countrySelect = select(
          ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France'],
          (selected) => {
            console.log('Country selected:', selected);
            updateResult();
          }
        );

        label('');

        // Result display
        resultLabel = label('Make your selections above');

        label('');

        // Action buttons
        hbox(() => {
          button('Set Defaults', async () => {
            await colorSelect.setSelected('Blue');
            await sizeSelect.setSelected('Medium');
            await countrySelect.setSelected('United States');
            updateResult();
          });

          button('Clear Selections', async () => {
            await colorSelect.setSelected('');
            await sizeSelect.setSelected('');
            await countrySelect.setSelected('');
            resultLabel.setText('Selections cleared');
          });

          button('Get Values', async () => {
            const color = await colorSelect.getSelected();
            const size = await sizeSelect.getSelected();
            const country = await countrySelect.getSelected();

            console.log('Current selections:', { color, size, country });
            updateResult();
          });
        });
      });
    });

    win.show();
    screenshotIfRequested(win);
  });
});

async function updateResult() {
  const color = await colorSelect.getSelected();
  const size = await sizeSelect.getSelected();
  const country = await countrySelect.getSelected();

  if (!color && !size && !country) {
    resultLabel.setText('Make your selections above');
    return;
  }

  const parts: string[] = [];
  if (color) parts.push(`Color: ${color}`);
  if (size) parts.push(`Size: ${size}`);
  if (country) parts.push(`Country: ${country}`);

  resultLabel.setText(`✓ ${parts.join(' | ')}`);
}
