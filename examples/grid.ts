/**
 * Grid Layout Example
 *
 * Demonstrates grid layout for organizing widgets in columns,
 * perfect for calculator-style UIs and button grids.
 */

import { app, window, vbox, label, button, grid } from '../src';

let displayLabel: any;
let currentValue = '0';

function updateDisplay(value: string) {
  currentValue = value;
  displayLabel.setText(currentValue);
}

function handleNumber(num: string) {
  if (currentValue === '0') {
    updateDisplay(num);
  } else {
    updateDisplay(currentValue + num);
  }
}

function handleClear() {
  updateDisplay('0');
}

app({ title: 'Grid Layout Demo' }, () => {
  window({ title: 'Grid Layout - Calculator', width: 300, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Grid Layout Example');
        label('');

        // Display
        displayLabel = label(currentValue);
        label('');

        // Calculator grid (3 columns)
        grid(3, () => {
          button('7').onClick(() => handleNumber('7'));
          button('8').onClick(() => handleNumber('8'));
          button('9').onClick(() => handleNumber('9'));

          button('4').onClick(() => handleNumber('4'));
          button('5').onClick(() => handleNumber('5'));
          button('6').onClick(() => handleNumber('6'));

          button('1').onClick(() => handleNumber('1'));
          button('2').onClick(() => handleNumber('2'));
          button('3').onClick(() => handleNumber('3'));

          button('0').onClick(() => handleNumber('0'));
          button('C').onClick(() => handleClear());
          button('=').onClick(() => console.log('Equals:', currentValue));
        });
      });
    });

    win.show();
  });
});
