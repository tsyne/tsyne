/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * postmarketOS Native Dialer App
 *
 * Launches the postmarketOS bundled phone dialer application (gnome-calls or similar).
 * This is a native app that doesn't use Tsyne/Fyne - it delegates to the system dialer.
 *
 * @tsyne-app:name Dialer (Native)
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
 * @tsyne-app:category native
 * @tsyne-app:builder buildNativeDialerApp
 * @tsyne-app:args app
 * @tsyne-app:count one
 */

import type { App } from '../../../core/src';

/**
 * Launch the postmarketOS bundled phone dialer application
 */
export function buildNativeDialerApp(a: App): void {
  // We'll spawn the native dialer app and show a minimal status window
  spawnNativeDialer(a);
}

/**
 * Spawn the native postmarketOS dialer app
 */
async function spawnNativeDialer(a: App): Promise<void> {
  // Dynamically import child_process to avoid issues in non-Node environments
  let spawn: any;
  try {
    // eslint-disable-next-line global-require
    spawn = (await import('child_process')).spawn;
  } catch (err) {
    console.error('Failed to import child_process:', err);
    return;
  }

  // Try common postmarketOS dialer app names
  const dialerCommands = [
    'gnome-calls',       // GNOME Calls (most common on pmOS)
    'calls',             // Generic calls command
    'phosh-dialer',      // Phosh dialer
    'jolla-dialer',      // Jolla dialer (SailfishOS compatibility)
  ];

  let statusLabel: any;

  a.window({ title: 'Dialer (Native)', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.center(() => {
          a.label('☎️ Launching native dialer app...');
        });

        a.separator();

        statusLabel = a.label('');

        a.separator();

        a.center(() => {
          a.button('← Close')
            .onClick(() => {
              win.close();
            });
        });
      });
    });

    win.show();

    // Spawn the dialer app in the background
    let spawned = false;
    for (const cmd of dialerCommands) {
      try {
        const proc = spawn(cmd, {
          detached: true,
          stdio: 'ignore',
        });

        // Unref the child so it doesn't keep the parent process alive
        proc.unref();

        // Listen for process exit
        proc.on('close', () => {
          if (statusLabel) {
            statusLabel.setText('Dialer app closed');
          }
        });

        proc.on('error', (err: Error) => {
          console.log(`Failed to launch ${cmd}: ${err.message}`);
          // Try next command
        });

        spawned = true;

        if (statusLabel) {
          statusLabel.setText(`Started: ${cmd}`);
        }

        console.log(`[native-dialer] Launched: ${cmd}`);
        break;
      } catch (err) {
        console.log(`Failed to spawn ${cmd}:`, err);
        // Try next command
        continue;
      }
    }

    if (!spawned) {
      if (statusLabel) {
        statusLabel.setText('No dialer app found on this system');
      }
      console.error('[native-dialer] No postmarketOS dialer app found');
    }
  });
}

// Standalone execution (for testing)
if (require.main === module) {
  const { app, resolveTransport } = require('../../../core/src/index');
  app(resolveTransport(), { title: 'Dialer (Native)' }, buildNativeDialerApp);
}
