/**
 * Loading States Demo
 *
 * Demonstrates the ProgressBarInfinite and Activity widgets for showing
 * indeterminate progress during async operations.
 */

import { app, resolveTransport, Activity  } from '../core/src';

app(resolveTransport(), { title: 'Loading States Demo' }, (a) => {
  a.window({ title: 'Loading States', width: 500, height: 550 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Loading States Demo');
        a.label('Shows indeterminate progress for operations with unknown duration.');
        a.label('');

        // ProgressBarInfinite Section
        a.label('ProgressBarInfinite Demo:', undefined, 'leading', undefined, { bold: true });
        a.separator();

        // Network request simulation
        a.label('Network Request:');
        const networkProgress = a.progressbarInfinite();
        const networkStatus = a.label('Status: Idle');
        a.label('');

        a.hbox(() => {
          a.button('Start Request').onClick(async () => {
            await networkProgress.start();
            await networkStatus.setText('Status: Loading...');
          });

          a.button('Stop Request').onClick(async () => {
            await networkProgress.stop();
            await networkStatus.setText('Status: Stopped');
          });

          a.button('Check Status').onClick(async () => {
            const running = await networkProgress.isRunning();
            await networkStatus.setText(`Status: ${running ? 'Running' : 'Stopped'}`);
          });
        });

        a.separator();

        // File processing simulation
        a.label('File Processing:');
        const fileProgress = a.progressbarInfinite();
        const fileStatus = a.label('Ready to process files');
        a.label('');

        a.hbox(() => {
          a.button('Process Files').onClick(async () => {
            await fileProgress.start();
            await fileStatus.setText('Processing files...');

            // Simulate async work
            setTimeout(async () => {
              await fileProgress.stop();
              await fileStatus.setText('Files processed!');
            }, 3000);
          });
        });

        a.separator();

        // Activity Widget Section
        a.label('Activity Widget Demo:', undefined, 'leading', undefined, { bold: true });
        a.separator();

        // Track activity widgets and their states
        let loadingActivity: Activity;
        let uploadActivity: Activity;

        // Example 1: Simple loading spinner
        a.card('Data Loading', 'Simulate fetching data from a server', () => {
          a.vbox(() => {
            a.hbox(() => {
              loadingActivity = a.activity();
              a.label('Loading data...');
            });
            a.hbox(() => {
              a.button('Start Loading').onClick(async () => {
                await loadingActivity.start();
              });
              a.button('Stop Loading').onClick(async () => {
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
            a.button('Upload File').onClick(async () => {
              await uploadActivity.start();
              // Simulate upload delay
              setTimeout(async () => {
                await uploadActivity.stop();
              }, 3000);
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
