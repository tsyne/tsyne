/**
 * Version Mismatch Dialog
 *
 * Shows a GUI dialog when an app's version requirements don't match
 * the installed Tsyne version. Used for standalone/packaged apps.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, spacer } from './index';
import { VersionValidation } from './app-version';
import { TSYNE_VERSION } from './version';

export interface VersionDialogResult {
  action: 'update' | 'run-anyway' | 'cancel';
}

/**
 * Show a version mismatch dialog
 *
 * Returns the user's choice:
 * - 'update': User wants to update Tsyne
 * - 'run-anyway': User wants to run despite mismatch
 * - 'cancel': User cancelled
 */
export async function showVersionMismatchDialog(
  validation: VersionValidation
): Promise<VersionDialogResult> {
  return new Promise((resolve) => {
    const requirement = validation.requirement;
    const requiredRange = requirement.range ||
      (requirement.minVersion ? `>=${requirement.minVersion}` : '') +
      (requirement.maxVersion ? ` <${requirement.maxVersion}` : '');

    let resolved = false;
    const doResolve = (result: VersionDialogResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    app(resolveTransport(), { title: 'Version Mismatch' }, () => {
      window({ title: 'Version Mismatch', width: 400, height: 200 }, (win) => {
        vbox(() => {
          label('Version Mismatch', 'title');
          label(`This app was built for Tsyne ${requiredRange}`);
          label(`Your system has Tsyne ${TSYNE_VERSION}`);
          spacer();
          hbox(() => {
            spacer();
            button('Download Update').onClick(() => {
              win.close();
              doResolve({ action: 'update' });
            });
            button('Run Anyway').onClick(() => {
              win.close();
              doResolve({ action: 'run-anyway' });
            });
            button('Cancel').onClick(() => {
              win.close();
              doResolve({ action: 'cancel' });
            });
          });
        });
      });
    });
  });
}

/**
 * Open the Tsyne download page in the default browser
 */
export function openUpdatePage(): void {
  const { exec } = require('child_process');
  const url = 'https://github.com/anthropics/tsyne/releases';

  const platform = process.platform;
  let command: string;

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command);
}
