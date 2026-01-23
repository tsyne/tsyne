// Demo: Modal Overlay using showCustomWithoutButtons
// Shows how to create a non-dismissable loading overlay

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Modal Overlay Demo' }, (a) => {
  a.window({ title: 'Modal Overlay', width: 500, height: 400 }, async (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Modal Overlay Demo');
        a.label('Click the buttons to see different modal overlays.');

        // Loading Overlay Demo
        a.button('Show Loading Overlay (3 sec)').onClick(async () => {
          const dialog = await win.showCustomWithoutButtons(
            'Loading...',
            () => {
              a.vbox(() => {
                a.label('Please wait while we process your request...');
                a.progressBarInfinite();
                a.label('This dialog cannot be dismissed by clicking outside.');
              });
            }
          );

          // Hide after 3 seconds
          setTimeout(async () => {
            await dialog.hide();
            await win.showInfo('Complete', 'Processing completed!');
          }, 3000);
        });

        // Custom Status Overlay Demo
        a.button('Show Status Overlay (5 sec)').onClick(async () => {
          let progressValue = 0;
          let progressBar: ReturnType<typeof a.progressBar>;

          const dialog = await win.showCustomWithoutButtons(
            'Downloading...',
            () => {
              a.vbox(() => {
                a.label('Downloading file...');
                progressBar = a.progressBar(0);
                a.label('0% complete');
              });
            }
          );

          // Simulate progress
          const interval = setInterval(async () => {
            progressValue += 0.2;
            if (progressValue >= 1) {
              clearInterval(interval);
              await dialog.hide();
              await win.showInfo('Download Complete', 'File downloaded successfully!');
            } else {
              await progressBar.setValue(progressValue);
            }
          }, 1000);
        });

        // Confirmation Process Demo
        a.button('Start Multi-Step Process').onClick(async () => {
          const confirmed = await win.showConfirm(
            'Confirm Process',
            'This will start a multi-step process. Continue?'
          );

          if (!confirmed) return;

          // Step 1
          const step1Dialog = await win.showCustomWithoutButtons(
            'Step 1 of 3',
            () => {
              a.vbox(() => {
                a.label('Validating input...');
                a.progressBarInfinite();
              });
            }
          );

          await new Promise(resolve => setTimeout(resolve, 1500));
          await step1Dialog.hide();

          // Step 2
          const step2Dialog = await win.showCustomWithoutButtons(
            'Step 2 of 3',
            () => {
              a.vbox(() => {
                a.label('Processing data...');
                a.progressBarInfinite();
              });
            }
          );

          await new Promise(resolve => setTimeout(resolve, 1500));
          await step2Dialog.hide();

          // Step 3
          const step3Dialog = await win.showCustomWithoutButtons(
            'Step 3 of 3',
            () => {
              a.vbox(() => {
                a.label('Finalizing...');
                a.progressBarInfinite();
              });
            }
          );

          await new Promise(resolve => setTimeout(resolve, 1500));
          await step3Dialog.hide();

          await win.showInfo('Success', 'All steps completed successfully!');
        });
      });
    });
    await win.show();
  });
});
