// Test for feedback-form example
import { TsyneTest, TestContext } from '../src/index-test';
import { dialog } from '../src';

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

            app.button('Send', async () => {
              const message = await messageEntry.getText();
              const mood = await moodSelect.getSelected();

              dialog.showInformation(
                win,
                'Feedback Received',
                `Mood: ${mood}\n\nMessage: ${message}`
              );
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

            app.button('Send', async () => {
              const message = await messageEntry.getText();
              const mood = await moodSelect.getSelected();

              dialog.showInformation(
                win,
                'Feedback Received',
                `Mood: ${mood}\n\nMessage: ${message}`
              );
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

    // Select mood (Happy is default/first)
    await moodSelect.setSelectedIndex(0);

    // Click Send
    await ctx.getByExactText('Send').click();
    await ctx.wait(100);

    // Dialog should show
    await ctx.expect(ctx.getByText('Feedback Received')).toBeVisible();
  });
});
