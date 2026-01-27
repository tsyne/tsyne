/**
 * TsyneTest integration tests for CompletionEntry widget
 * Tests the autocomplete experience similar to the nomad app's city search
 */
import { TsyneTest, TestContext } from '../index-test';

describe('CompletionEntry TsyneTest Integration', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  test('city search autocomplete demo', async () => {
    // Sample cities list (subset of what nomad uses)
    const cities = [
      'London, UK',
      'Liverpool, UK',
      'Leeds, UK',
      'Leicester, UK',
      'Paris, France',
      'Perth, Australia',
      'Portland, USA',
      'Prague, Czech Republic',
      'Tokyo, Japan',
      'Toronto, Canada',
      'Taipei, Taiwan',
      'New York, USA',
      'New Delhi, India',
      'Nice, France',
    ];

    let selectedCity = '';
    let capturedEntry: any = null;

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'City Search Demo', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Search for a city:').withId('searchLabel');

            capturedEntry = a.completionEntry(
              [],
              'Type city name...',
              async (text) => {
                if (text.length < 2) {
                  await capturedEntry.hideCompletion();
                  return;
                }

                // Filter cities that start with the typed text
                const filtered = cities.filter(c =>
                  c.toLowerCase().startsWith(text.toLowerCase())
                );

                await capturedEntry.setOptions(filtered);

                if (filtered.length > 0) {
                  await capturedEntry.showCompletion();
                } else {
                  await capturedEntry.hideCompletion();
                }
              },
              (text) => {
                // On submit, select the city
                const match = cities.find(c =>
                  c.toLowerCase().startsWith(text.toLowerCase())
                );
                if (match) {
                  selectedCity = match;
                }
              }
            ).withId('citySearch');

            a.label('').withId('selectedCityLabel');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Verify the search entry is visible
    await ctx.expect(ctx.getById('searchLabel')).toBeVisible();
    await ctx.expect(ctx.getById('citySearch')).toBeVisible();

    // Type "Lon" - should trigger filtering
    await ctx.getById('citySearch').type('Lon');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Type "To" - should match Tokyo and Toronto
    await capturedEntry.setText('');
    await ctx.getById('citySearch').type('To');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Press enter to submit
    await ctx.getById('citySearch').submit();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have selected Tokyo or Toronto (first match)
    expect(selectedCity).toMatch(/^To/);
  });

  test('completionEntry with empty initial options', async () => {
    let capturedEntry: any = null;
    let onChangedCalled = false;

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Empty Options Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry = a.completionEntry(
              [], // Start with empty options
              'Start typing...',
              () => { onChangedCalled = true; }
            ).withId('emptyEntry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getById('emptyEntry')).toBeVisible();

    // Type something
    await ctx.getById('emptyEntry').type('test');
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onChangedCalled).toBe(true);

    // Add options dynamically
    await capturedEntry.setOptions(['Test 1', 'Test 2', 'Test 3']);
    await capturedEntry.showCompletion();

    // Hide again
    await capturedEntry.hideCompletion();
  });

  test('completionEntry with pre-populated options', async () => {
    const options = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    let capturedEntry: any = null;

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Pre-populated Options Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry = a.completionEntry(
              options,
              'Select a Greek letter...'
            ).withId('greekEntry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getById('greekEntry')).toBeVisible();

    // Show completion with initial options
    await capturedEntry.showCompletion();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Update to filtered options
    await capturedEntry.setOptions(['Alpha']);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Hide completion
    await capturedEntry.hideCompletion();
  });
});
