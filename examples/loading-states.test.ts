// Test for loading-states example - ProgressBarInfinite and Activity widgets
import { TsyneTest, TestContext } from '../src/index-test';
import { Activity } from '../src';
import * as path from 'path';

describe('Loading States - ProgressBarInfinite', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should start and stop infinite progress bar', async () => {
    let networkProgress: any;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Loading Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('ProgressBarInfinite Test');
            app.label('');

            app.label('Network Request:');
            networkProgress = app.progressbarInfinite();
            statusLabel = app.label('Status: Idle');
            app.label('');

            app.hbox(() => {
              app.button('Start', async () => {
                await networkProgress.start();
                await statusLabel.setText('Status: Running');
              });

              app.button('Stop', async () => {
                await networkProgress.stop();
                await statusLabel.setText('Status: Stopped');
              });

              app.button('Check', async () => {
                const running = await networkProgress.isRunning();
                await statusLabel.setText(`Status: ${running ? 'Running' : 'Stopped'}`);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Status: Idle')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'loading-states.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Start the progress bar
    await ctx.getByExactText('Start').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Status: Running')).toBeVisible();

    // Check if it's running
    await ctx.getByExactText('Check').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Status: Running')).toBeVisible();

    // Stop the progress bar
    await ctx.getByExactText('Stop').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Status: Stopped')).toBeVisible();

    // Verify it's stopped
    await ctx.getByExactText('Check').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Status: Stopped')).toBeVisible();
  });

  test('should handle auto-stop after simulated work', async () => {
    let fileProgress: any;
    let fileStatus: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Auto-Stop Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('File Processing:');
            fileProgress = app.progressbarInfinite();
            fileStatus = app.label('Ready');
            app.label('');

            app.button('Process', async () => {
              await fileProgress.start();
              await fileStatus.setText('Processing...');

              // Simulate short async work
              setTimeout(async () => {
                await fileProgress.stop();
                await fileStatus.setText('Done!');
              }, 500);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Ready')).toBeVisible();

    // Start processing
    await ctx.getByExactText('Process').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Processing...')).toBeVisible();

    // Wait for auto-stop
    await ctx.wait(600);
    await ctx.expect(ctx.getByExactText('Done!')).toBeVisible();
  });

  test('should support multiple progress bars', async () => {
    let progress1: any;
    let progress2: any;
    let status1: any;
    let status2: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiple Progress', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Progress 1:');
            progress1 = app.progressbarInfinite();
            status1 = app.label('Idle');

            app.label('Progress 2:');
            progress2 = app.progressbarInfinite();
            status2 = app.label('Idle');

            app.hbox(() => {
              app.button('Start Both', async () => {
                await progress1.start();
                await progress2.start();
                await status1.setText('Running');
                await status2.setText('Running');
              });

              app.button('Stop Both', async () => {
                await progress1.stop();
                await progress2.stop();
                await status1.setText('Stopped');
                await status2.setText('Stopped');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start both
    await ctx.getByExactText('Start Both').click();
    await ctx.wait(100);

    // Both should be running - verify at least one 'Running' label exists
    await ctx.expect(ctx.getByExactText('Running')).toBeVisible();

    // Stop both
    await ctx.getByExactText('Stop Both').click();
    await ctx.wait(100);

    // Both should be stopped - verify at least one 'Stopped' label exists
    await ctx.expect(ctx.getByExactText('Stopped')).toBeVisible();
  });
});

describe('Activity Widget', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create activity widget and control start/stop', async () => {
    let activityRef: Activity;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Activity Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Activity Widget Test', undefined, 'center', undefined, { bold: true });
            app.separator();

            app.hbox(() => {
              activityRef = app.activity();
              statusLabel = app.label('Activity created').withId('status');
            });

            app.hbox(() => {
              app.button('Start', async () => {
                await activityRef.start();
                await statusLabel.setText('Activity started');
              }).withId('startBtn');

              app.button('Stop', async () => {
                await activityRef.stop();
                await statusLabel.setText('Activity stopped');
              }).withId('stopBtn');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Activity created')).toBeVisible();

    // Click start button
    await ctx.getByID('startBtn').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Activity started')).toBeVisible();

    // Click stop button
    await ctx.getByID('stopBtn').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Activity stopped')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'activity-widget.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should work with multiple activity widgets', async () => {
    let activity1: Activity;
    let activity2: Activity;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiple Activities', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.hbox(() => {
              activity1 = app.activity();
              app.label('Activity 1');
            });
            app.hbox(() => {
              activity2 = app.activity();
              app.label('Activity 2');
            });
            app.button('Start Both', async () => {
              await activity1.start();
              await activity2.start();
            }).withId('startBoth');
            app.button('Stop Both', async () => {
              await activity1.stop();
              await activity2.stop();
            }).withId('stopBoth');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify activities are visible
    await ctx.expect(ctx.getByExactText('Activity 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Activity 2')).toBeVisible();

    // Start both activities
    await ctx.getByID('startBoth').click();
    await ctx.wait(100);

    // Stop both activities
    await ctx.getByID('stopBoth').click();
    await ctx.wait(100);
  });
});
