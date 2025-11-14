/**
 * Isolated tests to demonstrate toolbar button visibility issues in TsyneTest
 *
 * These tests show that:
 * 1. Regular buttons work fine
 * 2. Toolbar buttons cannot be found by the test framework
 *
 * Run with: npx jest examples/toolbar-isolation.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { App, Window } from '../src';

describe('Toolbar Button Visibility Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('CONTROL: Regular buttons in vbox are visible', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Regular Buttons Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('Button 1', () => {});
            app.button('Button 2', () => {});
            app.button('Button 3', () => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // These should all pass
    await ctx.expect(ctx.getByText('Button 1')).toBeVisible();
    await ctx.expect(ctx.getByText('Button 2')).toBeVisible();
    await ctx.expect(ctx.getByText('Button 3')).toBeVisible();
  });

  test('ISSUE: Toolbar buttons are NOT visible', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Toolbar Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.vbox(() => {
            app.toolbar([
              { type: 'action', label: 'Open', onAction: () => {} },
              { type: 'action', label: 'Save', onAction: () => {} },
              { type: 'separator' },
              { type: 'action', label: 'Close', onAction: () => {} }
            ]);
            app.label('Content below toolbar');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The label should be visible
    await ctx.expect(ctx.getByText('Content below toolbar')).toBeVisible();

    // But these toolbar buttons will fail to be found
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Save')).toBeVisible();
    await ctx.expect(ctx.getByText('Close')).toBeVisible();
  });

  test('ISSUE: Toolbar in border.top is NOT visible', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Border Toolbar Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.toolbar([
                { type: 'action', label: 'Action 1', onAction: () => {} },
                { type: 'action', label: 'Action 2', onAction: () => {} }
              ]);
            },
            center: () => {
              app.label('Center content');
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Center content should be visible
    await ctx.expect(ctx.getByText('Center content')).toBeVisible();

    // But toolbar buttons will fail
    await ctx.expect(ctx.getByText('Action 1')).toBeVisible();
    await ctx.expect(ctx.getByText('Action 2')).toBeVisible();
  });

  test('CONTROL: Regular buttons in border.top ARE visible', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Border Regular Buttons Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.hbox(() => {
                app.button('Regular Button 1', () => {});
                app.button('Regular Button 2', () => {});
              });
            },
            center: () => {
              app.label('Center content');
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Both center and buttons should be visible
    await ctx.expect(ctx.getByText('Center content')).toBeVisible();
    await ctx.expect(ctx.getByText('Regular Button 1')).toBeVisible();
    await ctx.expect(ctx.getByText('Regular Button 2')).toBeVisible();
  });

  test('MIXED: Toolbar + regular buttons to show contrast', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Mixed Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Before toolbar');
            app.toolbar([
              { type: 'action', label: 'Toolbar Button', onAction: () => {} }
            ]);
            app.label('After toolbar');
            app.button('Regular Button Below', () => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Labels should be visible
    await ctx.expect(ctx.getByText('Before toolbar')).toBeVisible();
    await ctx.expect(ctx.getByText('After toolbar')).toBeVisible();

    // Regular button should be visible
    await ctx.expect(ctx.getByText('Regular Button Below')).toBeVisible();

    // But toolbar button will fail
    await ctx.expect(ctx.getByText('Toolbar Button')).toBeVisible();
  });
});
