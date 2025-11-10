/**
 * Input Widgets Example
 *
 * Demonstrates MultiLineEntry, PasswordEntry, Separator, and Hyperlink widgets.
 */

import { app, window, vbox, hbox, label, button, entry, multilineentry, passwordentry, separator, hyperlink } from '../src';

let statusLabel: any;
let multilineEntry: any;
let passwordField: any;
let usernameField: any;

app({ title: 'Input Widgets Demo' }, () => {
  window({ title: 'Input Widgets Example', width: 700, height: 650 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Input Widgets Example');
        label('');

        // Status label
        statusLabel = label('Explore various input widget types');
        label('');

        separator();
        label('');

        // Multi-line entry section
        label('Multi-Line Text Entry:');
        label('Enter multiple lines of text (e.g., notes, comments, descriptions)');
        label('');

        multilineEntry = multilineentry('Enter your notes here...\n\nSupports multiple lines of text.', 'word');

        label('');

        hbox(() => {
          button('Get Text', async () => {
            const text = await multilineEntry.getText();
            const lineCount = text.split('\n').length;
            const charCount = text.length;
            statusLabel.setText(`Text has ${lineCount} lines and ${charCount} characters`);
          });

          button('Set Sample Text', async () => {
            const sampleText = 'Line 1: Sample notes\nLine 2: This demonstrates multi-line entry\nLine 3: You can edit this text\nLine 4: Press Get Text to see line and character counts';
            await multilineEntry.setText(sampleText);
            statusLabel.setText('Sample text set in multi-line entry');
          });

          button('Clear', async () => {
            await multilineEntry.setText('');
            statusLabel.setText('Multi-line entry cleared');
          });
        });

        label('');
        separator();
        label('');

        // Password entry section
        label('Password Entry (Secure Login Form):');
        label('Password characters are masked for security');
        label('');

        label('Username:');
        usernameField = entry('Enter username');
        label('');

        label('Password:');
        passwordField = passwordentry('Enter password');
        label('');

        hbox(() => {
          button('Login', async () => {
            const username = await usernameField.getText();
            const password = await passwordField.getText();

            if (!username || !password) {
              statusLabel.setText('Please enter both username and password');
              return;
            }

            // Simulate login validation
            if (username === 'admin' && password === 'password123') {
              statusLabel.setText(`✓ Login successful! Welcome, ${username}`);
            } else {
              statusLabel.setText('✗ Invalid credentials (try: admin / password123)');
            }
          });

          button('Clear Form', async () => {
            await usernameField.setText('');
            await passwordField.setText('');
            statusLabel.setText('Login form cleared');
          });

          button('Fill Demo', async () => {
            await usernameField.setText('admin');
            await passwordField.setText('password123');
            statusLabel.setText('Demo credentials filled (admin / password123)');
          });
        });

        label('');
        separator();
        label('');

        // Hyperlinks section
        label('Hyperlinks:');
        label('Click links to open them in your default browser');
        label('');

        hbox(() => {
          hyperlink('Visit GitHub', 'https://github.com');
          label('  |  ');
          hyperlink('Fyne Toolkit', 'https://fyne.io');
          label('  |  ');
          hyperlink('TypeScript', 'https://www.typescriptlang.org');
        });

        label('');

        label('Documentation Links:');
        hbox(() => {
          hyperlink('Tsyne Docs', 'https://github.com/your-repo/tsyne');
          label('  •  ');
          hyperlink('Fyne Widgets', 'https://developer.fyne.io/widget/');
          label('  •  ');
          hyperlink('Examples', 'https://github.com/your-repo/tsyne/tree/main/examples');
        });

        label('');
        separator();
        label('');

        // Widget features summary
        label('Widget Features:');
        label('');
        label('MultiLineEntry:');
        label('  • Supports multiple lines of text');
        label('  • Word wrapping (off, word, break)');
        label('  • Scrolls automatically for long content');
        label('  • Perfect for notes, comments, descriptions');
        label('');
        label('PasswordEntry:');
        label('  • Masks password characters for security');
        label('  • Same API as regular Entry');
        label('  • Essential for login forms');
        label('');
        label('Separator:');
        label('  • Visual divider between sections');
        label('  • Improves UI organization');
        label('');
        label('Hyperlink:');
        label('  • Clickable URLs');
        label('  • Opens in default browser');
        label('  • Styled as underlined links');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
