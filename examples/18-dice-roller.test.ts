// Test for Dice Roller example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Dice Roller Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI before rolling', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dice Roller', width: 400, height: 500 }, (win) => {
        let numDice = 2;
        let numSides = 6;
        let results: number[] = [];
        let resultLabel: any;

        function rollDice() {
          results = [];
          for (let i = 0; i < numDice; i++) {
            results.push(Math.floor(Math.random() * numSides) + 1);
          }

          const displayText = results.map(r => r.toString()).join('  ');
          if (resultLabel) {
            resultLabel.setText(`Results: ${displayText}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('🎲 Dice Roller 🎲');
            app.separator();

            app.label('Number of Dice:');
            app.select(
              ['1', '2', '3', '4', '5', '6', '8', '10'],
              (selected) => {
                numDice = parseInt(selected, 10) || 1;
              }
            );

            app.separator();

            app.label('Dice Type:');
            app.radiogroup(
              ['d4 (4-sided)', 'd6 (6-sided)', 'd8 (8-sided)', 'd10 (10-sided)', 'd12 (12-sided)', 'd20 (20-sided)', 'd100 (100-sided)'],
              'd6 (6-sided)',
              (selected) => {
                const sideMap: { [key: string]: number } = {
                  'd4 (4-sided)': 4,
                  'd6 (6-sided)': 6,
                  'd8 (8-sided)': 8,
                  'd10 (10-sided)': 10,
                  'd12 (12-sided)': 12,
                  'd20 (20-sided)': 20,
                  'd100 (100-sided)': 100
                };
                numSides = sideMap[selected] || 6;
              }
            );

            app.separator();

            app.button('🎲 ROLL DICE 🎲').onClick(rollDice);

            app.separator();

            if (results.length > 0) {
              resultLabel = app.label(`Results: ${results.join('  ')}`);
            } else {
              resultLabel = app.label('Click Roll to start!');
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial message
    await ctx.expect(ctx.getByExactText('Click Roll to start!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('🎲 ROLL DICE 🎲')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '18-dice-roller.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should roll dice and display results', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dice Roller', width: 400, height: 500 }, (win) => {
        let numDice = 2;
        let numSides = 6;
        let results: number[] = [];
        let resultLabel: any;

        function rollDice() {
          results = [];
          // Use predictable results for testing
          for (let i = 0; i < numDice; i++) {
            results.push(3); // Always roll 3
          }

          const displayText = results.map(r => r.toString()).join('  ');
          if (resultLabel) {
            resultLabel.setText(`Results: ${displayText}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('🎲 Dice Roller 🎲');

            app.button('🎲 ROLL DICE 🎲').onClick(rollDice);

            resultLabel = app.label('Click Roll to start!');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click roll button
    await ctx.getByExactText('🎲 ROLL DICE 🎲').click();
    await ctx.wait(200);

    // Should show results
    await ctx.expect(ctx.getByExactText('Results: 3  3')).toBeVisible();
  });

  test('should display total calculation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dice Roller', width: 400, height: 500 }, (win) => {
        let numDice = 3;
        let numSides = 6;
        let results: number[] = [];
        let resultLabel: any;
        let totalLabel: any;

        function rollDice() {
          results = [2, 4, 6]; // Predictable results

          const total = results.reduce((a, b) => a + b, 0);
          const displayText = results.map(r => r.toString()).join('  ');

          if (resultLabel) {
            resultLabel.setText(`Results: ${displayText}`);
          }
          if (totalLabel) {
            totalLabel.setText(`Total: ${total}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('🎲 Dice Roller 🎲');

            app.button('🎲 ROLL DICE 🎲').onClick(rollDice);

            resultLabel = app.label('Click Roll to start!');
            totalLabel = app.label('');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click roll button
    await ctx.getByExactText('🎲 ROLL DICE 🎲').click();
    await ctx.wait(200);

    // Should show total
    await ctx.expect(ctx.getByExactText('Total: 12')).toBeVisible();
  });
});
