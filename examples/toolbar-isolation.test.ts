/**
 * Isolated tests to demonstrate toolbar button visibility issues in TsyneTest
 *
 * These tests show that:
 * 1. Regular buttons work fine
 * 2. Toolbar buttons cannot be found by the test framework
 *
 * Run with: npx jest examples/toolbar-isolation.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { App, Window } from '../core/src';

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
            app.button('Button 1').onClick(() => {});
            app.button('Button 2').onClick(() => {});
            app.button('Button 3').onClick(() => {});
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

  test('FIXED: Toolbar buttons are now clickable by ID', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Toolbar Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.vbox(() => {
            app.toolbar([
              app.toolbarAction('Open').withId('open-btn'),
              app.toolbarAction('Save').withId('save-btn'),
              { type: 'separator' },
              app.toolbarAction('Close').withId('close-btn')
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

    // Toolbar buttons are not "visible" in the traditional sense,
    // but they can be clicked by their custom ID.
    await ctx.getById('open-btn').click();
    await ctx.getById('save-btn').click();
    await ctx.getById('close-btn').click();
  });

  test('FIXED: Toolbar in border.top is now clickable by ID', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Border Toolbar Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.toolbar([
                app.toolbarAction('Action 1').withId('action1-btn'),
                app.toolbarAction('Action 2').withId('action2-btn')
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

    // Toolbar buttons can be clicked by their custom ID.
    await ctx.getById('action1-btn').click();
    await ctx.getById('action2-btn').click();
  });

  test('CONTROL: Regular buttons in border.top ARE visible', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Border Regular Buttons Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.hbox(() => {
                app.button('Regular Button 1').onClick(() => {});
                app.button('Regular Button 2').onClick(() => {});
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

  test('MIXED: Toolbar + regular buttons show contrast and are clickable', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Mixed Test', width: 400 }, (win: Window) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Before toolbar');
            app.toolbar([
              app.toolbarAction('Toolbar Button').withId('mixed-toolbar-btn')
            ]);
            app.label('After toolbar');
            app.button('Regular Button Below').onClick(() => {});
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

    // Toolbar button is clickable by ID
    await ctx.getById('mixed-toolbar-btn').click();
  });
});
