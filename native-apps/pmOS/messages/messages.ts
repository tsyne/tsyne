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
 * postmarketOS Native Messages App
 *
 * Launches the postmarketOS bundled SMS/messaging application (Chatty, GNOME Messages, or similar).
 * This is a native app that doesn't use Tsyne/Fyne - it delegates to the system messaging app.
 *
 * @tsyne-app:name Messages (Native)
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12h-8v-2h8v2zm0-3h-8V9h8v2zm0-3H4V6h14v2z"/></svg>
 * @tsyne-app:category native
 * @tsyne-app:builder buildNativeMessagesApp
 * @tsyne-app:args app
 * @tsyne-app:count one
 */

import type { App } from 'tsyne';

/**
 * Launch the postmarketOS bundled SMS/messaging application
 */
export function buildNativeMessagesApp(a: App): void {
  // We'll spawn the native messages app and show a minimal status window
  spawnNativeMessages(a);
}

/**
 * Spawn the native postmarketOS messaging app
 */
async function spawnNativeMessages(a: App): Promise<void> {
  // Dynamically import child_process to avoid issues in non-Node environments
  let spawn: any;
  try {
    // eslint-disable-next-line global-require
    spawn = (await import('child_process')).spawn;
  } catch (err) {
    console.error('Failed to import child_process:', err);
    return;
  }

  // Try common postmarketOS messaging app names
  const messagingCommands = [
    'chatty',            // Chatty (most popular on pmOS)
    'gnome-messages',    // GNOME Messages
    'messages',          // Generic messages command
    'geary',             // Geary mail+messaging
    'conversations',     // Conversations
  ];

  let statusLabel: any;

  a.window({ title: 'Messages (Native)', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.center(() => {
          a.label('💬 Launching native messages app...');
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

    // Spawn the messaging app in the background
    let spawned = false;
    for (const cmd of messagingCommands) {
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
            statusLabel.setText('Messages app closed');
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

        console.log(`[native-messages] Launched: ${cmd}`);
        break;
      } catch (err) {
        console.log(`Failed to spawn ${cmd}:`, err);
        // Try next command
        continue;
      }
    }

    if (!spawned) {
      if (statusLabel) {
        statusLabel.setText('No messaging app found on this system');
      }
      console.error('[native-messages] No postmarketOS messaging app found');
    }
  });
}

// Standalone execution (for testing)
if (require.main === module) {
  const { app, resolveTransport } = require('../../../core/src/index');
  app(resolveTransport(), { title: 'Messages (Native)' }, buildNativeMessagesApp);
}
