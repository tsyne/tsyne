/**
 * Loading States Demo
 *
 * Demonstrates the ProgressBarInfinite widget for showing
 * indeterminate progress during async operations.
 */

import { app } from '../src';

app({ title: 'Loading States Demo' }, (a) => {
  a.window({ title: 'Loading States', width: 500, height: 450 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('ProgressBarInfinite Demo');
        a.label('Shows indeterminate progress for operations with unknown duration.');
        a.label('');

        // Network request simulation
        a.label('Network Request:');
        const networkProgress = a.progressbarInfinite();
        const networkStatus = a.label('Status: Idle');
        a.label('');

        a.hbox(() => {
          a.button('Start Request', async () => {
            await networkProgress.start();
            await networkStatus.setText('Status: Loading...');
          });

          a.button('Stop Request', async () => {
            await networkProgress.stop();
            await networkStatus.setText('Status: Stopped');
          });

          a.button('Check Status', async () => {
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
          a.button('Process Files', async () => {
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

        // Database sync simulation
        a.label('Database Sync:');
        const dbProgress = a.progressbarInfinite();
        const dbStatus = a.label('Database idle');
        a.label('');

        a.hbox(() => {
          a.button('Sync Now', async () => {
            await dbProgress.start();
            await dbStatus.setText('Syncing with server...');

            // Simulate sync duration
            setTimeout(async () => {
              await dbProgress.stop();
              await dbStatus.setText('Sync complete!');
            }, 2000);
          });
        });

        a.separator();

        // Combined operations
        a.label('Multiple Operations:');
        a.label('');

        a.hbox(() => {
          a.button('Start All', async () => {
            await networkProgress.start();
            await fileProgress.start();
            await dbProgress.start();
            await networkStatus.setText('Status: Running');
            await fileStatus.setText('Processing...');
            await dbStatus.setText('Syncing...');
          });

          a.button('Stop All', async () => {
            await networkProgress.stop();
            await fileProgress.stop();
            await dbProgress.stop();
            await networkStatus.setText('Status: Stopped');
            await fileStatus.setText('Stopped');
            await dbStatus.setText('Stopped');
          });
        });
      });
    });

    win.show();
  });
});
