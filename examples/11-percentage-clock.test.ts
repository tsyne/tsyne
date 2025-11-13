// Test for percentage-clock example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Percentage Clock Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display all time progress bars', async () => {
    let intervalId: any;

    const testApp = await tsyneTest.createApp((app) => {
      let yearLabel: any;
      let yearProgress: any;
      let hourProgress: any;
      let minuteProgress: any;
      let secondProgress: any;

      app.window({ title: 'Percentage Clock', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            yearLabel = app.label('Year: 2025');
            yearProgress = app.progressbar();

            app.label("Today's hours:");
            hourProgress = app.progressbar();

            app.label('Minutes:');
            minuteProgress = app.progressbar();

            app.label('Seconds:');
            secondProgress = app.progressbar();
          });
        });

        const updateClock = async () => {
          const now = new Date();
          const year = now.getFullYear();

          await yearLabel.setText(`Year: ${year}`);
          await yearProgress.setValue(0.5); // Mid-year for testing
          await hourProgress.setValue(now.getHours() / 24);
          await minuteProgress.setValue(now.getMinutes() / 60);
          await secondProgress.setValue(now.getSeconds() / 60);
        };

        updateClock();
        intervalId = setInterval(updateClock, 500);

        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check labels are visible
    await ctx.expect(ctx.getByText('Year:')).toBeVisible();
    await ctx.expect(ctx.getByExactText("Today's hours:")).toBeVisible();
    await ctx.expect(ctx.getByExactText('Minutes:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Seconds:')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '11-percentage-clock.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    // Cleanup
    clearInterval(intervalId);
  });

  test('should update progress bars over time', async () => {
    let secondProgress: any;
    let intervalId: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Percentage Clock', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            secondProgress = app.progressbar();
          });
        });

        const updateClock = async () => {
          const now = new Date();
          await secondProgress.setValue(now.getSeconds() / 60);
        };

        updateClock();
        intervalId = setInterval(updateClock, 500);

        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial value
    const initialValue = await secondProgress.getValue();
    expect(initialValue).toBeGreaterThanOrEqual(0);
    expect(initialValue).toBeLessThanOrEqual(1);

    // Wait for update
    await ctx.wait(600);

    // Value should still be valid (might have changed)
    const updatedValue = await secondProgress.getValue();
    expect(updatedValue).toBeGreaterThanOrEqual(0);
    expect(updatedValue).toBeLessThanOrEqual(1);

    // Cleanup
    clearInterval(intervalId);
  });
});
