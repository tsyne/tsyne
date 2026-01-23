/**
 * Clipboard Manager - Clipboard Demo
 *
 * Demonstrates the Clipboard feature:
 * - Read from system clipboard
 * - Write to system clipboard
 * - Clipboard history (in-memory)
 * - Quick paste from history
 */

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Clipboard Manager' }, (a) => {
  const clipboardHistory: string[] = [];
  const maxHistory = 10;
  let historyListLabel: any;
  let currentClipboardLabel: any;
  let mainWindow: any;

  a.window({ title: 'Clipboard Manager', width: 600, height: 500 }, (win) => {
    mainWindow = win;
    let inputEntry: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Clipboard Manager', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Current clipboard content
        a.label('Current Clipboard:', undefined, 'leading', undefined, { bold: true });
        currentClipboardLabel = a.label('(click Refresh to see clipboard)');

        a.hbox(() => {
          a.button('Refresh').onClick(async () => {
            const content = await win.getClipboard();
            currentClipboardLabel.setText(content || '(empty)');

            // Add to history if new
            if (content && !clipboardHistory.includes(content)) {
              clipboardHistory.unshift(content);
              if (clipboardHistory.length > maxHistory) {
                clipboardHistory.pop();
              }
              updateHistoryList();
            }
          });

          a.button('Clear Clipboard').onClick(async () => {
            await win.setClipboard('');
            currentClipboardLabel.setText('(empty)');
          });
        });

        a.separator();

        // Copy text section
        a.label('Copy Text:', undefined, 'leading', undefined, { bold: true });
        a.hbox(() => {
          inputEntry = a.entry('Enter text to copy...');
          a.button('Copy').onClick(async () => {
            const text = await inputEntry.getText();
            if (text) {
              await win.setClipboard(text);
              currentClipboardLabel.setText(text);

              // Add to history
              if (!clipboardHistory.includes(text)) {
                clipboardHistory.unshift(text);
                if (clipboardHistory.length > maxHistory) {
                  clipboardHistory.pop();
                }
                updateHistoryList();
              }

              inputEntry.setText('');
            }
          });
        });

        a.separator();

        // Quick copy buttons
        a.label('Quick Copy:', undefined, 'leading', undefined, { bold: true });
        a.hbox(() => {
          a.button('Date').onClick(async () => {
            const date = new Date().toLocaleDateString();
            await win.setClipboard(date);
            currentClipboardLabel.setText(date);
          });

          a.button('Time').onClick(async () => {
            const time = new Date().toLocaleTimeString();
            await win.setClipboard(time);
            currentClipboardLabel.setText(time);
          });

          a.button('DateTime').onClick(async () => {
            const datetime = new Date().toLocaleString();
            await win.setClipboard(datetime);
            currentClipboardLabel.setText(datetime);
          });

          a.button('UUID').onClick(async () => {
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
            await win.setClipboard(uuid);
            currentClipboardLabel.setText(uuid);
          });
        });

        a.separator();

        // Clipboard history
        a.label('Clipboard History:', undefined, 'leading', undefined, { bold: true });
        a.scroll(() => {
          a.vbox(() => {
            historyListLabel = a.label('(empty history)');
          });
        });

        a.hbox(() => {
          a.button('Clear History').onClick(() => {
            clipboardHistory.length = 0;
            updateHistoryList();
          });
        });
      });
    });

    win.show();
  });

  function updateHistoryList() {
    if (historyListLabel) {
      if (clipboardHistory.length === 0) {
        historyListLabel.setText('(empty history)');
      } else {
        const lines = clipboardHistory.map((item, i) => {
          const preview = item.length > 50 ? item.substring(0, 50) + '...' : item;
          return `${i + 1}. ${preview}`;
        });
        historyListLabel.setText(lines.join('\n'));
      }
    }
  }
});
