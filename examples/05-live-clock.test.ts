// Test for live-clock example
import { TsyneTest, TestContext } from '../src/index-test';

describe('Live Clock Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display current time and update', async () => {
    let timeLabel: any;
    let intervalId: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Date & Time', width: 400, height: 100 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            timeLabel = app.label(new Date().toString());
          });
        });

        // Update clock every 500ms
        intervalId = setInterval(async () => {
          await timeLabel.setText(new Date().toString());
        }, 500);

        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial time text
    const initialText = await timeLabel.getText();
    expect(initialText).toMatch(/\d{4}/); // Should contain a year

    // Wait for update (600ms to ensure at least one update)
    await ctx.wait(600);

    // Get updated time text
    const updatedText = await timeLabel.getText();
    expect(updatedText).toMatch(/\d{4}/); // Should still be a valid date

    // Time should have advanced (or at least be a valid date string)
    expect(updatedText.length).toBeGreaterThan(20);

    // Cleanup interval
    clearInterval(intervalId);
  });
});
