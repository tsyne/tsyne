/**
 * Tests for CompletionEntry widget - autocomplete entry from fyne.io/x
 * Tests creation, options management, and completion popup control
 */
import { TsyneTest, TestContext } from '../index-test';

describe('CompletionEntry Widget', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  test('creates completionEntry with placeholder', async () => {
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.completionEntry(['Option 1', 'Option 2', 'Option 3'], 'Search...')
              .withId('searchEntry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getById('searchEntry')).toBeVisible();
  });

  test('completionEntry receives text changes via onChanged callback', async () => {
    let lastChangedText = '';

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry OnChanged Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.completionEntry(
              [],
              'Type here...',
              (text) => { lastChangedText = text; }
            ).withId('entry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await ctx.getById('entry').type('hello');
    // Wait for callback to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(lastChangedText).toBe('hello');
  });

  test('completionEntry receives onSubmitted callback on enter', async () => {
    let submittedText = '';

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry OnSubmitted Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.completionEntry(
              [],
              'Type and press Enter...',
              undefined,
              (text) => { submittedText = text; }
            ).withId('entry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await ctx.getById('entry').type('test input');
    await ctx.getById('entry').submit();
    // Wait for callback to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(submittedText).toBe('test input');
  });

  test('completionEntry can set and get text', async () => {
    let entryRef: Awaited<ReturnType<typeof import('../widgets/inputs_selection').CompletionEntry.prototype.setText>> extends Promise<infer T> ? T : never;

    tsyneTest = new TsyneTest({ headed: false });
    const capturedEntry = { ref: null as any };

    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry SetText Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry.ref = a.completionEntry([], 'Placeholder').withId('entry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Set text programmatically
    await capturedEntry.ref.setText('Programmatic text');

    // Get text and verify
    const text = await capturedEntry.ref.getText();
    expect(text).toBe('Programmatic text');
  });

  test('completionEntry can update options dynamically', async () => {
    const capturedEntry = { ref: null as any };

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry Options Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry.ref = a.completionEntry(
              ['Apple', 'Apricot', 'Banana'],
              'Search fruits...'
            ).withId('fruitSearch');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Dynamically update options (simulating filter)
    await capturedEntry.ref.setOptions(['Cherry', 'Coconut', 'Cranberry']);
    // This should work without error
  });

  test('completionEntry show/hide completion popup', async () => {
    const capturedEntry = { ref: null as any };

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry Popup Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry.ref = a.completionEntry(
              ['London', 'Paris', 'Tokyo', 'New York'],
              'Search cities...'
            ).withId('citySearch');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Show completion popup
    await capturedEntry.ref.showCompletion();

    // Hide completion popup
    await capturedEntry.ref.hideCompletion();

    // Both operations should complete without error
  });

  test('completionEntry typical autocomplete workflow', async () => {
    const allCities = ['London', 'Liverpool', 'Leeds', 'Paris', 'Perth', 'Portland', 'Tokyo', 'Toronto'];
    const capturedEntry = { ref: null as any };
    const filteredResults: string[] = [];

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'CompletionEntry Workflow Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            capturedEntry.ref = a.completionEntry(
              [],
              'Search cities...',
              async (text) => {
                // Filter cities based on input
                const filtered = allCities.filter(c =>
                  c.toLowerCase().startsWith(text.toLowerCase())
                );
                filteredResults.length = 0;
                filteredResults.push(...filtered);

                // Update options
                await capturedEntry.ref.setOptions(filtered);

                // Show/hide completion based on results
                if (filtered.length > 0 && text.length >= 2) {
                  await capturedEntry.ref.showCompletion();
                } else {
                  await capturedEntry.ref.hideCompletion();
                }
              }
            ).withId('citySearch');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Type "Lo" - should filter to "London"
    await ctx.getById('citySearch').type('Lo');
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(filteredResults).toContain('London');
    expect(filteredResults).not.toContain('Paris');

    // Type "P" - should filter to Paris, Perth, Portland
    await capturedEntry.ref.setText('');
    await ctx.getById('citySearch').type('P');
    await new Promise(resolve => setTimeout(resolve, 150));

    // With only 1 character, results may be updated but popup hidden
    expect(filteredResults.length).toBeGreaterThan(0);
  });
});
