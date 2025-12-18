/**
 * Phone Dialer App
 *
 * A phone dialer with numeric keypad, call display, and recent calls.
 * Uses ModemManager for cellular operations and ContactsService for caller ID.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Phone
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createDialerApp
 * @tsyne-app:args app,modem,contacts
 * @tsyne-app:count single
 */

import { app, styles, FontStyle } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import { IContactsService, MockContactsService } from '../services';
import { IModemManagerService, MockModemManagerService, CallState } from './modemmanager-service';

// Define dialer styles
styles({
  'dialer-display': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 32,
  },
  'dialer-button': {
    font_size: 24,
  },
});

/**
 * Build the dialer UI - Pseudo-declarative style
 * Each call creates its own isolated state (suitable for multiple instances)
 */
export function createDialerApp(a: App, modem: IModemManagerService, contacts: IContactsService): void {
  // Instance-local state
  let display: Label | undefined;
  let statusLabel: Label | undefined;
  let currentNumber = '';
  let isInCall = false;

  function updateDisplay(value: string) {
    currentNumber = value;
    if (display) {
      display.setText(value || 'Enter number');
    }
  }

  function handleDigit(digit: string) {
    if (isInCall) return;
    updateDisplay(currentNumber + digit);
  }

  function handleBackspace() {
    if (isInCall) return;
    updateDisplay(currentNumber.slice(0, -1));
  }

  function handleClear() {
    if (isInCall) return;
    updateDisplay('');
  }

  async function handleCall() {
    if (!currentNumber) return;

    if (isInCall) {
      await modem.hangup();
      isInCall = false;
      if (statusLabel) statusLabel.setText('Call ended');
    } else {
      const success = await modem.dial(currentNumber);
      if (success) {
        isInCall = true;
        const contact = contacts.search(currentNumber)[0];
        const name = contact?.name || currentNumber;
        if (statusLabel) statusLabel.setText(`Calling ${name}...`);
      } else {
        if (statusLabel) statusLabel.setText('Call failed');
      }
    }
  }

  function formatCallTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);

    if (hours < 1) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  }

  function getCallIcon(direction: 'incoming' | 'outgoing'): string {
    return direction === 'incoming' ? 'v' : '^';
  }

  a.window({ title: 'Phone' }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Display area
        a.padded(() => {
          display = a.label('Enter number').withId('dialer-display');
        });

        // Status
        statusLabel = a.label('').withId('dialer-status');

        a.separator();

        // Numeric keypad - 4x3 grid
        a.grid(3, () => {
          [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#'],
          ].forEach(row => {
            row.forEach(digit => {
              const id = digit === '*' ? 'star' : digit === '#' ? 'hash' : digit;
              a.button(digit)
                .onClick(() => handleDigit(digit))
                .withId(`key-${id}`);
            });
          });
        });

        // Action buttons
        a.hbox(() => {
          a.button('Clear').onClick(() => handleClear()).withId('btn-clear');
          a.button('Call').onClick(() => handleCall()).withId('btn-call');
          a.button('Del').onClick(() => handleBackspace()).withId('btn-del');
        });

        a.separator();

        // Recent calls section
        a.label('Recent Calls');

        a.scroll(() => {
          a.vbox(() => {
            const activeCalls = modem.getActiveCalls();

            if (activeCalls.length === 0) {
              a.label('No active calls');
            } else {
              activeCalls.forEach((call, index) => {
                const contact = contacts.search(call.number)[0];
                const displayName = contact?.name || call.number;
                const icon = getCallIcon(call.direction);

                a.hbox(() => {
                  a.label(`${icon} ${displayName} [${call.state}]`).withId(`call-${index}-name`);
                  a.spacer();
                  if (call.startTime) {
                    a.label(formatCallTime(call.startTime)).withId(`call-${index}-time`);
                  }
                });
              });
            }
          });
        });
      });
    });
    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Phone' }, (a: App) => {
    const modem = new MockModemManagerService();
    const contacts = new MockContactsService();
    createDialerApp(a, modem, contacts);
  });
}
