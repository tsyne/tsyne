// MDI (Multiple Document Interface) Demo
// Demonstrates InnerWindow container for window-within-canvas patterns

import { app, resolveTransport, InnerWindow  } from 'tsyne';

app(resolveTransport(), { title: 'MDI Demo' }, (a) => {
  a.window({ title: 'MDI Demo - Multiple Document Interface', width: 800, height: 600 }, (win) => {
    // Track open inner windows
    const innerWindows: InnerWindow[] = [];
    let windowCount = 0;

    const createNewDocument = () => {
      windowCount++;
      const docNum = windowCount;

      const innerWin = a.innerWindow(`Document ${docNum}`, () => {
        a.vbox(() => {
          a.label(`This is document #${docNum}`);
          a.separator();
          a.multilineentry(`Type content for document ${docNum} here...`);
          a.hbox(() => {
            a.button('Save').onClick(() => {
// console.log(`Saving document ${docNum}...`);
            });
            a.button('Close').onClick(() => {
              innerWin.close();
            });
          });
        });
      }, () => {
        // onClose callback
// console.log(`Document ${docNum} closed`);
        const idx = innerWindows.indexOf(innerWin);
        if (idx >= 0) {
          innerWindows.splice(idx, 1);
        }
      });

      innerWindows.push(innerWin);
    };

    win.setContent(() => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.toolbar([
              a.toolbarAction('New Document', createNewDocument),
              { type: 'separator' },
              a.toolbarAction('Close All', () => {
                // Close all inner windows
                for (const iw of [...innerWindows]) {
                  iw.close();
                }
                innerWindows.length = 0;
              }),
            ]);
            a.separator();
          });
        },
        center: () => {
          // Container for inner windows - using max layout to stack them
          a.max(() => {
            // Initial documents
            createNewDocument();
            createNewDocument();
          });
        },
        bottom: () => {
          a.label('MDI Demo - Click "New Document" to create inner windows');
        }
      });
    });
    win.show();
  });
});
