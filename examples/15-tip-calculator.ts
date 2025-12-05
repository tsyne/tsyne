// @tsyne-app:name Tip Calculator
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 12a3 3 0 100-6 3 3 0 000 6z"/><path d="M6 16h.01"/><path d="M18 16h.01"/><path d="M12 16v2"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildTipCalculator

// Tip Calculator - Calculate tips and split bills
// Demonstrates entry widgets, radio groups, and real-time calculations

import { app, App, Window } from '../src';

export function buildTipCalculator(a: App) {
  a.window({ title: 'Tip Calculator', width: 400, height: 400 }, (win: Window) => {
    let billAmount = 0;
    let tipPercent = 15;
    let numPeople = 1;
    let tipLabel: any;
    let totalLabel: any;
    let perPersonLabel: any;

    function calculate() {
      const tip = billAmount * (tipPercent / 100);
      const total = billAmount + tip;
      const perPerson = total / numPeople;

      if (tipLabel) tipLabel.setText(`Tip Amount: $${tip.toFixed(2)}`);
      if (totalLabel) totalLabel.setText(`Total: $${total.toFixed(2)}`);
      if (perPersonLabel) perPersonLabel.setText(`Per Person: $${perPerson.toFixed(2)}`);
    }

    win.setContent(() => {
      a.vbox(() => {
        a.label('💵 Tip Calculator 💵');
        a.separator();

        // Bill amount input
        a.label('Bill Amount:');
        a.entry(
          'Enter amount',
          async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num) && num >= 0) {
              billAmount = num;
              calculate();
            }
          },
          150
        );

        a.separator();

        // Tip percentage selector
        a.label('Tip Percentage:');
        a.radiogroup(['10%', '15%', '18%', '20%', '25%'], 1, (selected) => {
          const percentages = [10, 15, 18, 20, 25];
          tipPercent = percentages[selected];
          calculate();
        });

        a.separator();

        // Number of people
        a.label('Split Between:');
        a.hbox(() => {
          a.button('-').onClick(() => {
            if (numPeople > 1) {
              numPeople--;
              peopleLabel.setText(`${numPeople} ${numPeople === 1 ? 'person' : 'people'}`);
              calculate();
            }
          });

          const peopleLabel = a.label('1 person');

          a.button('+').onClick(() => {
            numPeople++;
            peopleLabel.setText(`${numPeople} people`);
            calculate();
          });
        });

        a.separator();

        // Results
        a.label('═════════════════════');
        tipLabel = a.label('Tip Amount: $0.00');
        totalLabel = a.label('Total: $0.00');
        perPersonLabel = a.label('Per Person: $0.00');
        a.label('═════════════════════');

        a.separator();

        a.button('Clear').onClick(() => {
          billAmount = 0;
          tipPercent = 15;
          numPeople = 1;
          calculate();
        });
      });
    });

    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Tip Calculator' }, buildTipCalculator);
}
