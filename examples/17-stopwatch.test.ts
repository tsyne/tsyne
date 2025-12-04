// Test for Stopwatch example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Stopwatch Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial time at 00:00.00', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Stopwatch', width: 350, height: 450 }, (win) => {
        let timeLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('⏱️ Stopwatch ⏱️');
            app.separator();

            timeLabel = app.label('00:00.00');

            app.separator();

            app.hbox(() => {
              app.button('Start', () => {});
              app.button('Stop', () => {});
              app.button('Lap', () => {});
              app.button('Reset', () => {});
            });

            app.separator();

            app.label('No laps recorded');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial time should be 00:00.00
    await ctx.expect(ctx.getByExactText('00:00.00')).toBeVisible();
    await ctx.expect(ctx.getByExactText('No laps recorded')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '17-stopwatch.png');
      await ctx.getByExactText('No laps recorded').within(500).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should start and stop timer', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Stopwatch', width: 350, height: 450 }, (win) => {
        let startTime = 0;
        let elapsedTime = 0;
        let timerInterval: NodeJS.Timeout | null = null;
        let isRunning = false;
        let timeLabel: any;

        function formatTime(ms: number): string {
          const totalSeconds = Math.floor(ms / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          const milliseconds = Math.floor((ms % 1000) / 10);

          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        }

        function updateDisplay() {
          const currentTime = isRunning
            ? elapsedTime + (Date.now() - startTime)
            : elapsedTime;

          if (timeLabel) {
            timeLabel.setText(formatTime(currentTime));
          }
        }

        function start() {
          if (!isRunning) {
            isRunning = true;
            startTime = Date.now();
            timerInterval = setInterval(updateDisplay, 10);
          }
        }

        function stop() {
          if (isRunning) {
            isRunning = false;
            elapsedTime += Date.now() - startTime;
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            updateDisplay();
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('⏱️ Stopwatch ⏱️');
            timeLabel = app.label('00:00.00');

            app.hbox(() => {
              app.button('Start', start);
              app.button('Stop', stop);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click start
    await ctx.getByExactText('Start').click();
    await ctx.wait(500); // Wait half a second

    // Click stop
    await ctx.getByExactText('Stop').click();

    // Time should have advanced from 00:00.00 - wait for UI to settle
    const labels = await ctx.getAllByType('label');
    let foundNonZeroTime = false;
    for (const label of labels) {
      const text = await label.getText();
      if (text && text.match(/\d{2}:\d{2}\.\d{2}/) && text !== '00:00.00') {
        foundNonZeroTime = true;
        break;
      }
    }
    expect(foundNonZeroTime).toBe(true);
  });

  test('should reset timer', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Stopwatch', width: 350, height: 450 }, (win) => {
        let startTime = 0;
        let elapsedTime = 1000; // Start at 1 second
        let timerInterval: NodeJS.Timeout | null = null;
        let isRunning = false;
        let laps: string[] = [];
        let timeLabel: any;

        function formatTime(ms: number): string {
          const totalSeconds = Math.floor(ms / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          const milliseconds = Math.floor((ms % 1000) / 10);

          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        }

        function updateDisplay() {
          const currentTime = isRunning
            ? elapsedTime + (Date.now() - startTime)
            : elapsedTime;

          if (timeLabel) {
            timeLabel.setText(formatTime(currentTime));
          }
        }

        function stop() {
          if (isRunning) {
            isRunning = false;
            elapsedTime += Date.now() - startTime;
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            updateDisplay();
          }
        }

        function reset() {
          stop();
          elapsedTime = 0;
          laps = [];
          updateDisplay();
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('⏱️ Stopwatch ⏱️');
            timeLabel = app.label(formatTime(elapsedTime));

            app.hbox(() => {
              app.button('Reset', reset);
            });
          });
        });

        updateDisplay();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show non-zero time initially
    await ctx.expect(ctx.getByExactText('00:01.00')).toBeVisible();

    // Click reset
    await ctx.getByExactText('Reset').click();

    // Should be back to zero
    await ctx.getByExactText('00:00.00').within(100).shouldExist();
  });
});
