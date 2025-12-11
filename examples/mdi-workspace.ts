// Demo: MDI Workspace using MultipleWindows container
// Shows how to create a desktop-like workspace with floating inner windows

import { app } from '../core/src';

app({ title: 'MDI Workspace Demo' }, (a) => {
  a.window({ title: 'MDI Workspace', width: 800, height: 600 }, (win) => {
    let mdiContainer: ReturnType<typeof a.multipleWindows>;
    let windowCount = 0;

    win.setContent(() => {
      a.vbox(() => {
        // Toolbar
        a.hbox(() => {
          a.button('New Document').onClick(async () => {
            windowCount++;
            mdiContainer.addWindow(
              `Document ${windowCount}`,
              () => {
                a.vbox(() => {
                  a.label(`Content of Document ${windowCount}`);
                  a.entry('Type something here...');
                  a.hbox(() => {
                    a.button('Save').onClick(() => {
                      win.showInfo('Saved', `Document ${windowCount} saved!`);
                    });
                  });
                });
              },
              () => {
// console.log(`Document ${windowCount} closed`);
              }
            );
          });

          a.button('New Image').onClick(async () => {
            windowCount++;
            mdiContainer.addWindow(
              `Image ${windowCount}`,
              () => {
                a.vbox(() => {
                  a.label('Image Viewer');
                  a.canvasRectangle({
                    width: 200,
                    height: 150,
                    fillColor: '#3498db'
                  });
                });
              }
            );
          });

          a.button('New Chart').onClick(async () => {
            windowCount++;
            mdiContainer.addWindow(
              `Chart ${windowCount}`,
              () => {
                a.vbox(() => {
                  a.label('Chart Window');
                  // Show a simple pie chart
                  a.canvasArc({
                    x: 0, y: 0,
                    x2: 100, y2: 100,
                    startAngle: 0,
                    endAngle: Math.PI,
                    fillColor: '#e74c3c'
                  });
                });
              }
            );
          });
        });

        // MDI Container with initial windows
        mdiContainer = a.multipleWindows(() => {
          // Initial document window
          a.innerWindow('Welcome', () => {
            a.vbox(() => {
              a.label('Welcome to MDI Workspace');
              a.label('Click the buttons above to create new windows.');
              a.label('Drag windows to move them, resize from corners.');
            });
          });
        });
      });
    });
    win.show();
  });
});
