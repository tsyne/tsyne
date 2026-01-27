// @tsyne-app:name Dice Roller
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder buildDiceRoller
// @tsyne-app:args app,window

// Dice Roller - Roll multiple dice with different sides
// Demonstrates select widgets, dynamic results, and visual feedback

import { app, resolveTransport, App, ITsyneWindow } from 'tsyne';

export function buildDiceRoller(a: App, win?: ITsyneWindow | null) {
  const buildUI = (w: ITsyneWindow) => {
    let numDice = 2;
    let numSides = 6;
    let results: number[] = [];
    let resultLabel: any;
    let totalLabel: any;
    let historyContainer: any;
    let history: string[] = [];

    const diceArt: { [key: number]: string[] } = {
      1: ['┌─────┐', '│     │', '│  ●  │', '│     │', '└─────┘'],
      2: ['┌─────┐', '│ ●   │', '│     │', '│   ● │', '└─────┘'],
      3: ['┌─────┐', '│ ●   │', '│  ●  │', '│   ● │', '└─────┘'],
      4: ['┌─────┐', '│ ● ● │', '│     │', '│ ● ● │', '└─────┘'],
      5: ['┌─────┐', '│ ● ● │', '│  ●  │', '│ ● ● │', '└─────┘'],
      6: ['┌─────┐', '│ ● ● │', '│ ● ● │', '│ ● ● │', '└─────┘'],
    };

    function rollDice() {
      results = [];
      for (let i = 0; i < numDice; i++) {
        results.push(Math.floor(Math.random() * numSides) + 1);
      }

      const total = results.reduce((a, b) => a + b, 0);
      const resultsText = results.join(', ');

      // Add to history
      history.unshift(`${numDice}d${numSides}: [${resultsText}] = ${total}`);
      if (history.length > 10) history.pop(); // Keep last 10 rolls

      // Update displays
      if (resultLabel) {
        const displayText = results.map(r => r.toString()).join('  ');
        resultLabel.setText(`Results: ${displayText}`);
      }

      if (totalLabel) {
        totalLabel.setText(`Total: ${total}`);
      }

      // Rebuild to show updated history
      rebuildUI();
    }

    function rebuildUI() {
      w.setContent(() => {
        a.vbox(() => {
          a.label('Dice Roller');
          a.separator();

          // Number of dice selector
          a.label('Number of Dice:');
          a.select(
            ['1', '2', '3', '4', '5', '6', '8', '10'],
            1, // Default to 2 dice
            (selected) => {
              const nums = [1, 2, 3, 4, 5, 6, 8, 10];
              numDice = nums[selected];
            }
          );

          a.separator();

          // Dice type selector
          a.label('Dice Type:');
          a.radiogroup(
            ['d4 (4-sided)', 'd6 (6-sided)', 'd8 (8-sided)', 'd10 (10-sided)', 'd12 (12-sided)', 'd20 (20-sided)', 'd100 (100-sided)'],
            1, // Default to d6
            (selected) => {
              const sides = [4, 6, 8, 10, 12, 20, 100];
              numSides = sides[selected];
            }
          );

          a.separator();

          // Roll button
          a.button('ROLL DICE').onClick(rollDice);

          a.separator();

          // Results display
          if (results.length > 0) {
            resultLabel = a.label(`Results: ${results.join('  ')}`);
            totalLabel = a.label(`Total: ${results.reduce((a, b) => a + b, 0)}`);
          } else {
            resultLabel = a.label('Click Roll to start!');
            totalLabel = a.label('');
          }

          a.separator();

          // Roll history
          if (history.length > 0) {
            a.label('Recent Rolls:');
            a.scroll(() => {
              historyContainer = a.vbox(() => {
                history.forEach((roll) => {
                  a.label(roll);
                });
              });
            });
          }
        });
      });
    }

    // Initial UI
    rebuildUI();
    w.show();
  };

  if (win) {
    // PhoneTop/embedded mode - window injected
    buildUI(win);
  } else {
    // Standalone mode - create own window
    a.window({ title: 'Dice Roller', width: 400, height: 500 }, (w) => {
      buildUI(w);
    });
  }
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Dice Roller' }, (a: App) => {
    buildDiceRoller(a);
  });
}
