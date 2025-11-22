// Demonstrates Activity widget - loading/busy spinner for async operations

import { app, Activity } from '../src';

app({ title: 'Loading States Demo' }, (a) => {
  a.window({ title: 'Activity Widget Demo', width: 500, height: 400 }, (win) => {
    // Track activity widgets and their states
    let loadingActivity: Activity;
    let uploadActivity: Activity;
    let searchActivity: Activity;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Activity Widget Demo', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Example 1: Simple loading spinner
        a.card('Data Loading', 'Simulate fetching data from a server', () => {
          a.vbox(() => {
            a.hbox(() => {
              loadingActivity = a.activity();
              a.label('Loading data...');
            });
            a.hbox(() => {
              a.button('Start Loading', async () => {
                await loadingActivity.start();
              });
              a.button('Stop Loading', async () => {
                await loadingActivity.stop();
              });
            });
          });
        });

        // Example 2: File upload simulation
        a.card('File Upload', 'Simulate uploading a file', () => {
          a.vbox(() => {
            a.hbox(() => {
              uploadActivity = a.activity();
              a.label('Upload progress');
            });
            a.button('Upload File', async () => {
              await uploadActivity.start();
              // Simulate upload delay
              setTimeout(async () => {
                await uploadActivity.stop();
              }, 3000);
            });
          });
        });

        // Example 3: Search operation
        a.card('Search Operation', 'Simulate a search with auto-stop', () => {
          a.vbox(() => {
            a.hbox(() => {
              searchActivity = a.activity();
              a.entry('Enter search term...', async (text) => {
                // Start spinner when searching
                await searchActivity.start();
                // Simulate search delay
                setTimeout(async () => {
                  await searchActivity.stop();
                  console.log(`Search completed for: ${text}`);
                }, 1500);
              });
            });
          });
        });

        a.separator();
        a.label('The Activity widget shows an animated spinner.', undefined, 'center');
        a.label('Use start() to begin animation, stop() to end it.', undefined, 'center');
      });
    });
    win.show();
  });
});
