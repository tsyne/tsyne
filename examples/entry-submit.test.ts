/**
 * TsyneTest for Entry onSubmit functionality
 *
 * This test verifies that Entry widgets can be created with onSubmit callbacks.
 * Full Enter key testing is done in browser tests where actual key presses can be simulated.
 */

import { TsyneTest, TestContext } from 'tsyne';

describe('Entry onSubmit Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create entry with onSubmit callback', async () => {
    let submitted = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Entry Submit Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Entry with onSubmit callback
            app.entry('Type here and press Enter', () => {
              submitted = true;
            });

            // Label to show widget was created
            app.label('Entry widget created');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify entry widget exists
    const entryWidget = ctx.getByType('entry');
    await ctx.expect(entryWidget).toBeVisible();

    // Verify label exists (confirms widget tree was built correctly)
    await ctx.expect(ctx.getByText('Entry widget created')).toBeVisible();
  });

  test('should create entry without onSubmit callback', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Entry No Submit Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Entry without onSubmit callback (backward compatible)
            app.entry('Plain entry');
            app.label('Plain entry works');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify entry widget exists
    const entryWidget = ctx.getByType('entry');
    await ctx.expect(entryWidget).toBeVisible();
  });

  test('should allow typing text in entry', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Entry Type Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.entry('Type here').withId('test-entry');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Type text into entry
    const entryWidget = ctx.getById('test-entry');
    await entryWidget.type('Hello World');

    // Verify text was entered
    await ctx.expect(entryWidget).toHaveText('Hello World');
  });
});
