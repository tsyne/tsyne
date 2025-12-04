/**
 * ProgressBar Widget Example
 *
 * Demonstrates determinate and indeterminate progress bars
 * for showing progress and loading states.
 */

import { app, window, vbox, hbox, label, button, progressbar } from '../src';

let downloadProgress: any;
let uploadProgress: any;
let loadingProgress: any;
let statusLabel: any;

// Simulated download progress
let downloadValue = 0;
let uploadValue = 0;

app({ title: 'ProgressBar Demo' }, () => {
  window({ title: 'ProgressBar Example', width: 450, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('ProgressBar Widget Example');
        label('');

        // Download progress (determinate)
        label('Download Progress:');
        downloadProgress = progressbar(0);
        label('');

        // Upload progress (determinate)
        label('Upload Progress:');
        uploadProgress = progressbar(0);
        label('');

        // Loading progress (indeterminate)
        label('Loading... (Indeterminate):');
        loadingProgress = progressbar(undefined, true);
        label('');

        // Status label
        statusLabel = label('Ready to simulate progress');
        label('');

        // Control buttons
        hbox(() => {
          button('Start Download').onClick(async () => {
            statusLabel.setText('Downloading...');
            downloadValue = 0;
            simulateDownload();
          });

          button('Start Upload').onClick(async () => {
            statusLabel.setText('Uploading...');
            uploadValue = 0;
            simulateUpload();
          });
        });

        label('');

        hbox(() => {
          button('Set 50%').onClick(async () => {
            await downloadProgress.setProgress(0.5);
            await uploadProgress.setProgress(0.5);
            statusLabel.setText('Progress set to 50%');
          });

          button('Set 100%').onClick(async () => {
            await downloadProgress.setProgress(1.0);
            await uploadProgress.setProgress(1.0);
            statusLabel.setText('Complete!');
          });

          button('Reset').onClick(async () => {
            await downloadProgress.setProgress(0);
            await uploadProgress.setProgress(0);
            downloadValue = 0;
            uploadValue = 0;
            statusLabel.setText('Reset to 0%');
          });
        });
      });
    });

    win.show();
  });
});

// Simulate download progress
function simulateDownload() {
  if (downloadValue >= 1.0) {
    statusLabel.setText('Download complete!');
    return;
  }

  downloadValue += 0.1;
  downloadProgress.setProgress(downloadValue);

  setTimeout(() => {
    simulateDownload();
  }, 500);
}

// Simulate upload progress
function simulateUpload() {
  if (uploadValue >= 1.0) {
    statusLabel.setText('Upload complete!');
    return;
  }

  uploadValue += 0.05;
  uploadProgress.setProgress(uploadValue);

  setTimeout(() => {
    simulateUpload();
  }, 300);
}
