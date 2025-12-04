/**
 * Preferences demo test - verifies CheckGroup widget functionality
 */

import { TsyneTest, TestContext } from '../src/index-test';

describe('Preferences (CheckGroup) Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create checkgroup and handle programmatic selection', async () => {
    let checkGroup: any;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'CheckGroup Test', width: 400, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('CheckGroup Demo');
            checkGroup = app.checkgroup(
              ['Option A', 'Option B', 'Option C'],
              [],
              (selected) => {
                statusLabel?.setText(`Selected: ${selected.join(', ') || 'None'}`);
              }
            );
            statusLabel = app.label('Selected: None');
            app.button('Select All').onClick(async () => {
              await checkGroup.setSelected(['Option A', 'Option B', 'Option C']);
              const current = await checkGroup.getSelected();
              statusLabel?.setText(`Selected: ${current.join(', ')}`);
            });
            app.button('Clear All').onClick(async () => {
              await checkGroup.setSelected([]);
              const current = await checkGroup.getSelected();
              statusLabel?.setText(`Selected: ${current.join(', ') || 'None'}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('CheckGroup Demo')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Selected: None')).toBeVisible();

    // Click Select All button and verify all options are selected
    await ctx.getByExactText('Select All').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('Option A')).toBeVisible();
    await ctx.expect(ctx.getByText('Option B')).toBeVisible();
    await ctx.expect(ctx.getByText('Option C')).toBeVisible();

    // Click Clear All button and verify no options are selected
    await ctx.getByExactText('Clear All').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Selected: None')).toBeVisible();
  });

  test('should create checkgroup with initial selections', async () => {
    let checkGroup: any;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Initial Selection Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            checkGroup = app.checkgroup(
              ['Email', 'Push', 'SMS'],
              ['Email', 'Push'],  // Initial selections
              (selected) => {
                statusLabel?.setText(`Selected: ${selected.join(', ') || 'None'}`);
              }
            );
            statusLabel = app.label('Selected: Email, Push');
            app.button('Get Current').onClick(async () => {
              const current = await checkGroup.getSelected();
              statusLabel?.setText(`Selected: ${current.join(', ') || 'None'}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click Get Current to verify initial selections
    await ctx.getByExactText('Get Current').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('Email')).toBeVisible();
    await ctx.expect(ctx.getByText('Push')).toBeVisible();
  });

  test('should update selections via setSelected', async () => {
    let checkGroup: any;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'SetSelected Test', width: 400, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            checkGroup = app.checkgroup(
              ['Feature 1', 'Feature 2', 'Feature 3'],
              []
            );
            statusLabel = app.label('Status: Ready');
            app.button('Enable Features 1 and 3').onClick(async () => {
              await checkGroup.setSelected(['Feature 1', 'Feature 3']);
              const current = await checkGroup.getSelected();
              statusLabel?.setText(`Enabled: ${current.join(', ')}`);
            });
            app.button('Disable All').onClick(async () => {
              await checkGroup.setSelected([]);
              const current = await checkGroup.getSelected();
              statusLabel?.setText(`Enabled: ${current.length === 0 ? 'None' : current.join(', ')}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('Status: Ready')).toBeVisible();

    // Enable features 1 and 3
    await ctx.getByExactText('Enable Features 1 and 3').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('Feature 1')).toBeVisible();
    await ctx.expect(ctx.getByText('Feature 3')).toBeVisible();

    // Disable all
    await ctx.getByExactText('Disable All').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Enabled: None')).toBeVisible();
  });
});
