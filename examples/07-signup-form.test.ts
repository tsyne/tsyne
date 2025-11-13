// Test for signup-form example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Signup Form Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display signup form with all fields', async () => {
    let signupButton: any;

    const testApp = await tsyneTest.createApp((app) => {
      let usernameEntry: any;
      let passwordEntry: any;
      let termsCheckbox: any;
      let agreeChecked = false;

      app.window({ title: 'Form', width: 400, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Create Account');

            usernameEntry = app.entry('Enter username', undefined, 200);
            passwordEntry = app.passwordentry('Enter password');

            termsCheckbox = app.checkbox('I fully agree', async (checked: boolean) => {
              agreeChecked = checked;
              if (checked) {
                await signupButton.enable();
              } else {
                await signupButton.disable();
              }
            });

            signupButton = app.button('Sign up', async () => {
              const username = await usernameEntry.getText();
              if (username && agreeChecked) {
                console.log(`Welcome ${username}!`);
              }
            });
          });
        });

        (async () => {
          await signupButton.disable();
        })();

        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check form elements are visible
    await ctx.expect(ctx.getByExactText('Create Account')).toBeVisible();
    await ctx.expect(ctx.getByExactText('I fully agree')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Sign up')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '07-signup-form.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should enable and disable button', async () => {
    let signupButton: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Form', width: 400, height: 350 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            signupButton = app.button('Sign up', async () => {
              console.log('You rock!');
            });
          });
        });

        (async () => {
          await signupButton.disable();
        })();

        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Button should initially be disabled
    const initialEnabled = await signupButton.isEnabled();
    expect(initialEnabled).toBe(false);

    // Enable the button directly
    await signupButton.enable();
    await ctx.wait(100);

    // Button should now be enabled
    const afterEnabled = await signupButton.isEnabled();
    expect(afterEnabled).toBe(true);
  });
});
