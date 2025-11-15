// Password Generator - Generate secure random passwords
// Demonstrates checkboxes, sliders, and string manipulation

import { app } from '../src';

app({ title: 'Password Generator' }, (a) => {
  a.window({ title: 'Password Generator', width: 450, height: 500 }, (win) => {
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
      a.vbox(() => {
        a.label('🔐 Password Generator 🔐');
        a.separator();

        // Password display
        a.label('Generated Password:');
        passwordLabel = a.label('Click Generate to create password');

        a.separator();

        // Length slider
        const lengthLabel = a.label('Length: 12 characters');
        a.slider(4, 32, 12, (value) => {
          length = Math.round(value);
          lengthLabel.setText(`Length: ${length} characters`);
        });

        a.separator();

        // Character type options
        a.label('Include:');

        a.checkbox('Uppercase (A-Z)', useUppercase, (checked) => {
          useUppercase = checked;
        });

        a.checkbox('Lowercase (a-z)', useLowercase, (checked) => {
          useLowercase = checked;
        });

        a.checkbox('Numbers (0-9)', useNumbers, (checked) => {
          useNumbers = checked;
        });

        a.checkbox('Symbols (!@#$...)', useSymbols, (checked) => {
          useSymbols = checked;
        });

        a.separator();

        // Generate button
        a.button('🎲 Generate Password', () => {
          generatePassword();
        });

        a.separator();

        // Strength indicator (simple heuristic)
        a.label('Password Strength Tips:');
        a.label('• 8-11 chars: Weak');
        a.label('• 12-15 chars: Good');
        a.label('• 16+ chars: Strong');
        a.label('• Use all character types for best security');
      });
    });

    win.show();
  });
});
