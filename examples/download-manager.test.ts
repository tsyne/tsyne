// Test for download manager example (progress dialog)
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Download Manager Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should show progress dialog and update progress', async () => {
    let progressDialog: any = null;
    let progressValue = 0;
    let cancelled = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Progress Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Progress Dialog Test');

            app.button('Show Progress', async () => {
              progressDialog = await win.showProgress(
                'Processing',
                'Processing your request...',
                {
                  onCancelled: () => {
                    cancelled = true;
                  }
                }
              );

              // Simulate progress updates
              for (let i = 1; i <= 5; i++) {
                progressValue = i * 20;
                await progressDialog.setValue(progressValue / 100);
                await new Promise(resolve => setTimeout(resolve, 100));
              }

              await progressDialog.hide();
            });

            app.button('Show Infinite Progress', async () => {
              progressDialog = await win.showProgress(
                'Loading',
                'Please wait...',
                {
                  infinite: true,
                  onCancelled: () => {
                    cancelled = true;
                  }
                }
              );

              // Wait 500ms then hide
              await new Promise(resolve => setTimeout(resolve, 500));
              await progressDialog.hide();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check initial UI
    await ctx.expect(ctx.getByExactText('Progress Dialog Test')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Progress')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Infinite Progress')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'download-manager.png');
      await ctx.getByExactText('Show Infinite Progress').within(200).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should handle progress dialog lifecycle', async () => {
    let dialogShown = false;
    let dialogHidden = false;
    let progressDialog: any = null;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Lifecycle Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Dialog Lifecycle Test');

            app.button('Start', async () => {
              progressDialog = await win.showProgress(
                'Working',
                'Doing work...',
                {}
              );
              dialogShown = true;

              // Update progress
              await progressDialog.setValue(0.5);
              await new Promise(resolve => setTimeout(resolve, 200));

              // Hide dialog
              await progressDialog.hide();
              dialogHidden = true;
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Dialog Lifecycle Test')).toBeVisible();

    // Click start button
    await ctx.getByExactText('Start').click();

    // Wait for dialog to complete
    await ctx.wait(500);

    // Dialog should have been shown and hidden
    expect(dialogShown).toBe(true);
    expect(dialogHidden).toBe(true);
  });

  test('should add downloads to queue', async () => {
    let downloadQueue: string[] = [];
    let queueLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Queue Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Download Queue Test');

            queueLabel = app.label('Queue: empty');

            app.button('Add Small', () => {
              downloadQueue.push('small.zip');
              queueLabel.setText(`Queue: ${downloadQueue.join(', ')}`);
            });

            app.button('Add Large', () => {
              downloadQueue.push('large.iso');
              queueLabel.setText(`Queue: ${downloadQueue.join(', ')}`);
            });

            app.button('Clear', () => {
              downloadQueue = [];
              queueLabel.setText('Queue: empty');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial queue should be empty
    await ctx.expect(ctx.getByText('Queue: empty')).toBeVisible();

    // Add small file
    await ctx.getByExactText('Add Small').click();
    await ctx.getByText('Queue: small.zip').within(100).shouldExist();

    // Add large file
    await ctx.getByExactText('Add Large').click();
    await ctx.getByText('Queue: small.zip, large.iso').within(100).shouldExist();

    // Clear queue
    await ctx.getByExactText('Clear').click();
    await ctx.getByText('Queue: empty').within(100).shouldExist();
  });
});
