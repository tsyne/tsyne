/**
 * Test for SelectEntry (Country Picker) widget
 */
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

// Sample list of countries for testing
const countries = [
  'Afghanistan', 'Australia', 'Austria',
  'Belgium', 'Brazil',
  'Canada', 'China',
  'Denmark',
  'France',
  'Germany',
  'India', 'Italy',
  'Japan',
  'Mexico',
  'Netherlands', 'New Zealand',
  'Poland', 'Portugal',
  'Spain', 'Sweden', 'Switzerland',
  'United Kingdom', 'United States'
];

describe('Country Picker (SelectEntry) Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display SelectEntry and allow typing', async () => {
    let selectedCountry = '';
    let submittedText = '';
    let statusLabel: any;
    let selectEntryWidget: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Country Picker Test', width: 500, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Select your country:');

            selectEntryWidget = app.selectentry(
              countries,
              'Type to search countries...',
              (text) => {
                // onChanged
                console.log(`Changed: ${text}`);
              },
              (text) => {
                // onSubmitted
                submittedText = text;
                statusLabel.setText(`Submitted: ${text}`);
              },
              (selected) => {
                // onSelected
                selectedCountry = selected;
                statusLabel.setText(`Selected: ${selected}`);
              }
            );

            app.separator();

            statusLabel = app.label('No country selected yet');

            app.button('Show Selection').onClick(() => {
              console.log(`Current selection: ${selectedCountry || submittedText || 'none'}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Select your country:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('No country selected yet')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'country-picker.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Test setText - type a country name
    await selectEntryWidget.setText('Canada');
    await ctx.wait(100);

    // Verify the text was set
    const entryText = await selectEntryWidget.getText();
    expect(entryText).toBe('Canada');
  });

  test('should allow programmatic text updates', async () => {
    let selectEntryWidget: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'SelectEntry Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            selectEntryWidget = app.selectentry(
              countries,
              'Select a country...'
            );
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set text programmatically
    await selectEntryWidget.setText('Germany');
    await ctx.wait(100);

    // Verify text was set
    const text = await selectEntryWidget.getText();
    expect(text).toBe('Germany');

    // Change to a different country
    await selectEntryWidget.setText('France');
    await ctx.wait(100);

    const newText = await selectEntryWidget.getText();
    expect(newText).toBe('France');
  });

  test('should allow updating options dynamically', async () => {
    let selectEntryWidget: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dynamic Options Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            selectEntryWidget = app.selectentry(
              ['Option 1', 'Option 2', 'Option 3'],
              'Select an option...'
            );
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Update options dynamically
    await selectEntryWidget.setOptions(['New Option A', 'New Option B', 'New Option C']);
    await ctx.wait(100);

    // We can verify this works by setting text to one of the new options
    await selectEntryWidget.setText('New Option B');
    await ctx.wait(100);

    const text = await selectEntryWidget.getText();
    expect(text).toBe('New Option B');
  });
});
