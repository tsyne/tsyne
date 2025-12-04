// Test for feedback-form example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Feedback Form Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display feedback form with all elements', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      let messageEntry: any;
      let moodSelect: any;

      app.window({ title: 'Feedback', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('How are you feeling?');

            moodSelect = app.select(['Happy', 'Normal', 'Confused'], (selected: string) => {
              // Selection changed
            });

            app.label('Tell us more:');
            messageEntry = app.multilineentry('Type your feedback here...');

            app.button('Send').onClick(async () => {
              const message = await messageEntry.getText();
              const mood = await moodSelect.getSelected();

              console.log(`Feedback Received - Mood: ${mood}, Message: ${message}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check that all elements are present
    await ctx.expect(ctx.getByExactText('How are you feeling?')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Tell us more:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Send')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '04-feedback-form.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should submit feedback', async () => {
    let messageEntry: any;
    let moodSelect: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Feedback', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('How are you feeling?');

            moodSelect = app.select(['Happy', 'Normal', 'Confused'], (selected: string) => {
              // Selection changed
            });

            app.label('Tell us more:');
            messageEntry = app.multilineentry('Type your feedback here...');

            app.button('Send').onClick(async () => {
              const message = await messageEntry.getText();
              const mood = await moodSelect.getSelected();

              console.log(`Feedback Received - Mood: ${mood}, Message: ${message}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set message
    await messageEntry.setText('Great app!');

    // Select mood
    await moodSelect.setSelected('Happy');

    // Click Send
    await ctx.getByExactText('Send').click();
    await ctx.wait(100);

    // Note: Dialog functionality not yet implemented, so we just verify the button can be clicked
  });
});
