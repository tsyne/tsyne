// Test for Password Generator example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Password Generator Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial message before generation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Password Generator', width: 450, height: 500 }, (win) => {
        let length = 12;
        let useUppercase = true;
        let useLowercase = true;
        let useNumbers = true;
        let useSymbols = false;
        let passwordLabel: any;

        function generatePassword() {
          const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const lowercase = 'abcdefghijklmnopqrstuvwxyz';
          const numbers = '0123456789';
          const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

          let chars = '';
          if (useUppercase) chars += uppercase;
          if (useLowercase) chars += lowercase;
          if (useNumbers) chars += numbers;
          if (useSymbols) chars += symbols;

          if (chars.length === 0) {
            if (passwordLabel) passwordLabel.setText('❌ Select at least one character type');
            return;
          }

          let password = '';
          for (let i = 0; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
          }

          if (passwordLabel) passwordLabel.setText(password);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('🔐 Password Generator 🔐');
            app.separator();

            app.label('Generated Password:');
            passwordLabel = app.label('Click Generate to create password');

            app.separator();

            const lengthLabel = app.label('Length: 12 characters');
            app.slider(4, 32, 12, (value) => {
              length = Math.round(value);
              lengthLabel.setText(`Length: ${length} characters`);
            });

            app.separator();

            app.label('Include:');
            app.checkbox('Uppercase (A-Z)', (checked) => {
              useUppercase = checked;
            });
            app.checkbox('Lowercase (a-z)', (checked) => {
              useLowercase = checked;
            });
            app.checkbox('Numbers (0-9)', (checked) => {
              useNumbers = checked;
            });
            app.checkbox('Symbols (!@#$...)', (checked) => {
              useSymbols = checked;
            });

            app.separator();

            app.button('🎲 Generate Password', () => {
              generatePassword();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial message
    await ctx.expect(ctx.getByExactText('Click Generate to create password')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '16-password-generator.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should generate password when button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Password Generator', width: 450, height: 500 }, (win) => {
        let length = 12;
        let useUppercase = true;
        let useLowercase = true;
        let useNumbers = true;
        let useSymbols = false;
        let passwordLabel: any;

        function generatePassword() {
          const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const lowercase = 'abcdefghijklmnopqrstuvwxyz';
          const numbers = '0123456789';
          const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

          let chars = '';
          if (useUppercase) chars += uppercase;
          if (useLowercase) chars += lowercase;
          if (useNumbers) chars += numbers;
          if (useSymbols) chars += symbols;

          if (chars.length === 0) {
            if (passwordLabel) passwordLabel.setText('❌ Select at least one character type');
            return;
          }

          // For testing, generate a predictable password
          let password = '';
          for (let i = 0; i < length; i++) {
            password += chars[i % chars.length];
          }

          if (passwordLabel) passwordLabel.setText(password);
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('🔐 Password Generator 🔐');
            passwordLabel = app.label('Click Generate to create password');

            app.button('🎲 Generate Password', () => {
              generatePassword();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click generate button
    await ctx.getByExactText('🎲 Generate Password').click();
    await ctx.wait(200);

    // Password should be generated (not the initial message)
    const labels = await ctx.getAllByType('label');
    let hasPassword = false;
    for (const label of labels) {
      const text = await label.getText();
      if (text && text !== 'Click Generate to create password' && text !== '🔐 Password Generator 🔐' && text.length >= 12) {
        hasPassword = true;
        break;
      }
    }
    expect(hasPassword).toBe(true);
  });

  test('should show error when no character types selected', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Password Generator', width: 450, height: 500 }, (win) => {
        let length = 12;
        let useUppercase = false;
        let useLowercase = false;
        let useNumbers = false;
        let useSymbols = false;
        let passwordLabel: any;

        function generatePassword() {
          const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const lowercase = 'abcdefghijklmnopqrstuvwxyz';
          const numbers = '0123456789';
          const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

          let chars = '';
          if (useUppercase) chars += uppercase;
          if (useLowercase) chars += lowercase;
          if (useNumbers) chars += numbers;
          if (useSymbols) chars += symbols;

          if (chars.length === 0) {
            if (passwordLabel) passwordLabel.setText('❌ Select at least one character type');
            return;
          }

          let password = '';
          for (let i = 0; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
          }

          if (passwordLabel) passwordLabel.setText(password);
        }

        win.setContent(() => {
          app.vbox(() => {
            passwordLabel = app.label('Ready');

            app.button('🎲 Generate Password', () => {
              generatePassword();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click generate with no options selected
    await ctx.getByExactText('🎲 Generate Password').click();
    await ctx.wait(200);

    // Should show error message
    await ctx.expect(ctx.getByExactText('❌ Select at least one character type')).toBeVisible();
  });
});
