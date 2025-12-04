// Test for Tip Calculator example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Tip Calculator Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should calculate tip correctly for $50 bill at 15%', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Tip Calculator', width: 400, height: 400 }, (win) => {
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
          app.vbox(() => {
            app.label('💵 Tip Calculator 💵');
            app.separator();

            app.label('Bill Amount:');
            app.entry(
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

            app.separator();

            app.label('Tip Percentage:');
            app.radiogroup(['10%', '15%', '18%', '20%', '25%'], '15%', (selected) => {
              const percentageMap: { [key: string]: number } = { '10%': 10, '15%': 15, '18%': 18, '20%': 20, '25%': 25 };
              tipPercent = percentageMap[selected] || 15;
              calculate();
            });

            app.separator();

            app.label('Split Between:');
            app.hbox(() => {
              app.button('-').onClick(() => {
                if (numPeople > 1) {
                  numPeople--;
                  peopleLabel.setText(`${numPeople} ${numPeople === 1 ? 'person' : 'people'}`);
                  calculate();
                }
              });

              const peopleLabel = app.label('1 person');

              app.button('+').onClick(() => {
                numPeople++;
                peopleLabel.setText(`${numPeople} people`);
                calculate();
              });
            });

            app.separator();

            app.label('═════════════════════');
            tipLabel = app.label('Tip Amount: $0.00');
            totalLabel = app.label('Total: $0.00');
            perPersonLabel = app.label('Per Person: $0.00');
            app.label('═════════════════════');

            app.separator();

            app.button('Clear').onClick(() => {
              billAmount = 0;
              tipPercent = 15;
              numPeople = 1;
              calculate();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter bill amount
    const entry = ctx.getByPlaceholder('Enter amount');
    await entry.type('50');
    await entry.submit(); // Trigger the onSubmit callback
    await ctx.wait(200);

    // Should calculate 15% tip on $50
    await ctx.expect(ctx.getByExactText('Tip Amount: $7.50')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Total: $57.50')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Per Person: $57.50')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '15-tip-calculator.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should split bill among multiple people', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Tip Calculator', width: 400, height: 400 }, (win) => {
        let billAmount = 100;
        let tipPercent = 20;
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
          app.vbox(() => {
            app.label('💵 Tip Calculator 💵');

            app.hbox(() => {
              app.button('-').onClick(() => {
                if (numPeople > 1) {
                  numPeople--;
                  peopleLabel.setText(`${numPeople} ${numPeople === 1 ? 'person' : 'people'}`);
                  calculate();
                }
              });

              const peopleLabel = app.label('1 person');

              app.button('+').onClick(() => {
                numPeople++;
                peopleLabel.setText(`${numPeople} people`);
                calculate();
              });
            });

            tipLabel = app.label('Tip Amount: $20.00');
            totalLabel = app.label('Total: $120.00');
            perPersonLabel = app.label('Per Person: $120.00');
          });
        });

        // Initial calculation
        calculate();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click + to add person
    await ctx.getByExactText('+').click();
    await ctx.wait(100);

    // Should show 2 people
    await ctx.expect(ctx.getByExactText('2 people')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Per Person: $60.00')).toBeVisible();

    // Add another person
    await ctx.getByExactText('+').click();
    await ctx.wait(100);

    // Should show 3 people
    await ctx.expect(ctx.getByExactText('3 people')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Per Person: $40.00')).toBeVisible();

    // Remove a person
    await ctx.getByExactText('-').click();
    await ctx.wait(100);

    // Back to 2 people
    await ctx.expect(ctx.getByExactText('2 people')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Per Person: $60.00')).toBeVisible();
  });

  test('should handle different tip percentages', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Tip Calculator', width: 400, height: 400 }, (win) => {
        let billAmount = 100;
        let tipPercent = 15;
        let numPeople = 1;
        let tipLabel: any;

        function calculate() {
          const tip = billAmount * (tipPercent / 100);
          if (tipLabel) tipLabel.setText(`Tip Amount: $${tip.toFixed(2)}`);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.radiogroup(['10%', '15%', '18%', '20%', '25%'], '15%', (selected) => {
              const percentageMap: { [key: string]: number } = { '10%': 10, '15%': 15, '18%': 18, '20%': 20, '25%': 25 };
              tipPercent = percentageMap[selected] || 15;
              calculate();
            });

            tipLabel = app.label('Tip Amount: $15.00');
          });
        });

        calculate();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial should be 15% ($15)
    await ctx.expect(ctx.getByExactText('Tip Amount: $15.00')).toBeVisible();
  });
});
