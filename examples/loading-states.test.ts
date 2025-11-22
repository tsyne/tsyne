// Test for Activity widget (loading spinner)
import { TsyneTest, TestContext } from '../src/index-test';
import { Activity } from '../src';
import * as path from 'path';

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
      const screenshotPath = path.join(__dirname, 'screenshots', 'loading-states.png');
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
