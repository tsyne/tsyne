/**
 * Download Manager Demo
 *
 * Demonstrates the progress dialog feature with simulated file downloads.
 * Shows both determinate and infinite progress dialogs.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, separator, ProgressDialog  } from '../core/src';

interface Download {
  name: string;
  size: number; // in MB
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'cancelled';
}

let statusLabel: any;
let downloadListLabel: any;
let downloads: Download[] = [];

function formatSize(mb: number): string {
  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

function updateDownloadList() {
  if (downloads.length === 0) {
    downloadListLabel.setText('No downloads in queue');
    return;
  }

  const lines = downloads.map((d, i) => {
    const statusIcon = {
      'pending': '[  ]',
      'downloading': '[>>]',
      'completed': '[OK]',
      'cancelled': '[X]'
    }[d.status];
    const progressStr = d.status === 'completed' ? '100%' : `${d.progress}%`;
    return `${i + 1}. ${statusIcon} ${d.name} (${formatSize(d.size)}) - ${progressStr}`;
  });

  downloadListLabel.setText(lines.join('\n'));
}

async function simulateDownload(
  download: Download,
  progressDialog: ProgressDialog,
  onComplete: () => void
) {
  const totalSteps = 20;
  const stepTime = Math.max(50, Math.min(200, download.size)); // 50-200ms per step based on size

  for (let step = 1; step <= totalSteps; step++) {
    // Check if cancelled (we'd need to track this externally)
    if (download.status === 'cancelled') {
      await progressDialog.hide();
      return;
    }

    download.progress = Math.round((step / totalSteps) * 100);
    await progressDialog.setValue(step / totalSteps);
    updateDownloadList();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, stepTime));
  }

  download.status = 'completed';
  download.progress = 100;
  updateDownloadList();
  await progressDialog.hide();
  onComplete();
}

app(resolveTransport(), { title: 'Download Manager' }, () => {
  window({ title: 'Download Manager', width: 500, height: 500 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Download Manager Demo');
        label('Demonstrates progress dialogs with simulated downloads');
        separator();

        // Status display
        statusLabel = label('Ready to download');
        separator();

        // Download queue display
        label('Download Queue:');
        downloadListLabel = label('No downloads in queue');
        separator();

        // Add download buttons
        label('Add Downloads:');

        hbox(() => {
          button('Small File (10 MB)').onClick(() => {
            downloads.push({
              name: 'small-file.zip',
              size: 10,
              progress: 0,
              status: 'pending'
            });
            updateDownloadList();
            statusLabel.setText('Added small-file.zip to queue');
          });

          button('Medium File (100 MB)').onClick(() => {
            downloads.push({
              name: 'medium-file.zip',
              size: 100,
              progress: 0,
              status: 'pending'
            });
            updateDownloadList();
            statusLabel.setText('Added medium-file.zip to queue');
          });
        });

        hbox(() => {
          button('Large File (500 MB)').onClick(() => {
            downloads.push({
              name: 'large-file.iso',
              size: 500,
              progress: 0,
              status: 'pending'
            });
            updateDownloadList();
            statusLabel.setText('Added large-file.iso to queue');
          });

          button('Huge File (2 GB)').onClick(() => {
            downloads.push({
              name: 'huge-file.iso',
              size: 2000,
              progress: 0,
              status: 'pending'
            });
            updateDownloadList();
            statusLabel.setText('Added huge-file.iso to queue');
          });
        });

        separator();

        // Download action buttons
        hbox(() => {
          button('Start Next Download').onClick(async () => {
            const pending = downloads.find(d => d.status === 'pending');
            if (!pending) {
              await win.showInfo('No Downloads', 'No pending downloads in queue');
              return;
            }

            pending.status = 'downloading';
            statusLabel.setText(`Downloading: ${pending.name}`);
            updateDownloadList();

            const progressDialog = await win.showProgress(
              'Downloading',
              `Downloading ${pending.name} (${formatSize(pending.size)})...`,
              {
                onCancelled: () => {
                  pending.status = 'cancelled';
                  statusLabel.setText(`Cancelled: ${pending.name}`);
                  updateDownloadList();
                }
              }
            );

            await simulateDownload(pending, progressDialog, () => {
              statusLabel.setText(`Completed: ${pending.name}`);
            });
          });

          button('Download All').onClick(async () => {
            const pendingDownloads = downloads.filter(d => d.status === 'pending');
            if (pendingDownloads.length === 0) {
              await win.showInfo('No Downloads', 'No pending downloads in queue');
              return;
            }

            for (const download of pendingDownloads) {
              download.status = 'downloading';
              statusLabel.setText(`Downloading: ${download.name}`);
              updateDownloadList();

              const progressDialog = await win.showProgress(
                'Downloading',
                `Downloading ${download.name} (${formatSize(download.size)})...`,
                {
                  onCancelled: () => {
                    download.status = 'cancelled';
                    statusLabel.setText(`Cancelled: ${download.name}`);
                    updateDownloadList();
                  }
                }
              );

              await simulateDownload(download, progressDialog, () => {
                statusLabel.setText(`Completed: ${download.name}`);
              });

              // If cancelled, stop the batch
              if (download.status === 'cancelled') {
                break;
              }
            }

            const completed = downloads.filter(d => d.status === 'completed').length;
            const cancelled = downloads.filter(d => d.status === 'cancelled').length;
            statusLabel.setText(`Batch complete: ${completed} completed, ${cancelled} cancelled`);
          });
        });

        separator();

        // Infinite progress demo
        button('Show Infinite Progress (3s)').onClick(async () => {
          statusLabel.setText('Processing...');

          const progressDialog = await win.showProgress(
            'Processing',
            'Please wait while we process your request...',
            {
              infinite: true,
              onCancelled: () => {
                statusLabel.setText('Processing cancelled');
              }
            }
          );

          // Simulate a 3-second operation
          await new Promise(resolve => setTimeout(resolve, 3000));

          await progressDialog.hide();
          statusLabel.setText('Processing complete!');
        });

        separator();

        // Clear downloads
        button('Clear Queue').onClick(() => {
          downloads = [];
          updateDownloadList();
          statusLabel.setText('Download queue cleared');
        });
      });
    });

    win.show();
  });
});
