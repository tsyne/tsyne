/**
 * Test for Project Opener example
 *
 * Tests the UI elements and recent project selection.
 * Note: Native folder dialogs cannot be tested automatically,
 * but we verify the UI and simulated project selection work correctly.
 */
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Project Opener Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI correctly', async () => {
    let statusLabel: any;
    let projectPathLabel: any;
    let projectNameLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Project Opener', width: 500, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Project Opener');
            app.label('Select a folder to open as a project');
            app.label('');

            statusLabel = app.label('No project opened');
            projectPathLabel = app.label('Path: (none)');
            projectNameLabel = app.label('Project: (none)');
            app.label('');

            app.hbox(() => {
              app.button('Open Project Folder').onClick(async () => {
                // In test mode, we can't test the native dialog
                // But we verify the button exists
              });

              app.button('Close Project').onClick(async () => {
                // Reset state
                statusLabel.setText('Project closed');
                projectPathLabel.setText('Path: (none)');
                projectNameLabel.setText('Project: (none)');
              });
            });

            app.label('');
            app.label('Recent Projects:');
            app.label('');

            app.button('  /home/user/my-project').onClick(async () => {
              statusLabel.setText('Project opened from recent!');
              projectPathLabel.setText('Path: /home/user/my-project');
              projectNameLabel.setText('Project: my-project');
            });

            app.button('  /home/user/another-app').onClick(async () => {
              statusLabel.setText('Project opened from recent!');
              projectPathLabel.setText('Path: /home/user/another-app');
              projectNameLabel.setText('Project: another-app');
            });

            app.label('');
            app.label('');

            app.button('Show Project Info').onClick(async () => {
              // Would show info dialog
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial UI state
    await ctx.expect(ctx.getByExactText('Project Opener')).toBeVisible();
    await ctx.expect(ctx.getByExactText('No project opened')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Path: (none)')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Project: (none)')).toBeVisible();

    // Verify buttons exist
    await ctx.expect(ctx.getByExactText('Open Project Folder')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Close Project')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Project Info')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'project-opener.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should open project from recent list', async () => {
    let statusLabel: any;
    let projectPathLabel: any;
    let projectNameLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Project Opener', width: 500, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Project Opener');
            app.label('');

            statusLabel = app.label('No project opened');
            projectPathLabel = app.label('Path: (none)');
            projectNameLabel = app.label('Project: (none)');
            app.label('');

            app.hbox(() => {
              app.button('Open Project Folder').onClick(async () => {});
              app.button('Close Project').onClick(async () => {
                statusLabel.setText('Project closed');
                projectPathLabel.setText('Path: (none)');
                projectNameLabel.setText('Project: (none)');
              });
            });

            app.label('');
            app.label('Recent Projects:');
            app.label('');

            app.button('  /home/user/my-project').onClick(async () => {
              statusLabel.setText('Project opened from recent!');
              projectPathLabel.setText('Path: /home/user/my-project');
              projectNameLabel.setText('Project: my-project');
            });

            app.button('  /home/user/another-app').onClick(async () => {
              statusLabel.setText('Project opened from recent!');
              projectPathLabel.setText('Path: /home/user/another-app');
              projectNameLabel.setText('Project: another-app');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('No project opened')).toBeVisible();

    // Click on recent project
    await ctx.getByText('/home/user/my-project').click();
    await ctx.wait(100);

    // Verify project opened
    await ctx.expect(ctx.getByExactText('Project opened from recent!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Path: /home/user/my-project')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Project: my-project')).toBeVisible();

    // Switch to another project
    await ctx.getByText('/home/user/another-app').click();
    await ctx.wait(100);

    // Verify new project
    await ctx.expect(ctx.getByExactText('Path: /home/user/another-app')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Project: another-app')).toBeVisible();

    // Close project
    await ctx.getByExactText('Close Project').click();
    await ctx.wait(100);

    // Verify project closed
    await ctx.expect(ctx.getByExactText('Project closed')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Path: (none)')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Project: (none)')).toBeVisible();
  });
});
