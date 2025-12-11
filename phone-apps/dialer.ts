/**
 * Phone Dialer App
 *
 * A phone dialer with numeric keypad, call display, and recent calls.
 * Uses TelephonyService for call operations and ContactsService for caller ID.
 *
 * @tsyne-app:name Phone
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createDialerApp
 * @tsyne-app:args app,telephony,contacts
 * @tsyne-app:count single
 */

import { app, styles, FontStyle } from '../../../../../core/src';
import type { App } from '../core/src/app';
import type { Window } from '../core/src/window';
import type { Label } from '../core/src/widgets/display';
import {
  ITelephonyService,
  IContactsService,
  MockTelephonyService,
  MockContactsService,
  CallLogEntry,
} from './services';

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
 * Dialer UI class
 */
class DialerUI {
  private display: Label | null = null;
  private statusLabel: Label | null = null;
  private currentNumber = '';
  private window: Window | null = null;

  constructor(
    private a: App,
    private telephony: ITelephonyService,
    private contacts: IContactsService
  ) {}

  private updateDisplay(): void {
    if (this.display) {
      this.display.setText(this.currentNumber || 'Enter number');
    }
  }

  private handleDigit(digit: string): void {
    if (this.telephony.isInCall()) return;
    this.currentNumber += digit;
    this.updateDisplay();
  }

  private handleBackspace(): void {
    if (this.telephony.isInCall()) return;
    this.currentNumber = this.currentNumber.slice(0, -1);
    this.updateDisplay();
  }

  private handleClear(): void {
    if (this.telephony.isInCall()) return;
    this.currentNumber = '';
    this.updateDisplay();
  }

  private async handleCall(): Promise<void> {
    if (!this.currentNumber) return;

    if (this.telephony.isInCall()) {
      await this.telephony.hangup();
      this.updateStatus('Call ended');
    } else {
      const success = await this.telephony.dial(this.currentNumber);
      if (success) {
        const contact = this.contacts.search(this.currentNumber)[0];
        const name = contact?.name || this.currentNumber;
        this.updateStatus(`Calling ${name}...`);
      } else {
        this.updateStatus('Call failed');
      }
    }
  }

  private updateStatus(message: string): void {
    if (this.statusLabel) {
      this.statusLabel.setText(message);
    }
  }

  private formatCallTime(entry: CallLogEntry): string {
    const now = new Date();
    const diff = now.getTime() - entry.timestamp.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);

    if (hours < 1) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return entry.timestamp.toLocaleDateString();
  }

  private getCallIcon(type: CallLogEntry['type']): string {
    switch (type) {
      case 'incoming': return 'v';
      case 'outgoing': return '^';
      case 'missed': return 'x';
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Display area
      this.a.padded(() => {
        this.display = this.a.label('Enter number').withId('dialer-display');
      });

      // Status
      this.statusLabel = this.a.label('').withId('dialer-status');

      this.a.separator();

      // Numeric keypad - 4x3 grid
      this.a.grid(3, () => {
        ['1', '2', '3'].forEach(d => this.a.button(d).onClick(() => this.handleDigit(d)).withId(`key-${d}`));
        ['4', '5', '6'].forEach(d => this.a.button(d).onClick(() => this.handleDigit(d)).withId(`key-${d}`));
        ['7', '8', '9'].forEach(d => this.a.button(d).onClick(() => this.handleDigit(d)).withId(`key-${d}`));
        this.a.button('*').onClick(() => this.handleDigit('*')).withId('key-star');
        this.a.button('0').onClick(() => this.handleDigit('0')).withId('key-0');
        this.a.button('#').onClick(() => this.handleDigit('#')).withId('key-hash');
      });

      // Action buttons
      this.a.hbox(() => {
        this.a.button('Clear').onClick(() => this.handleClear()).withId('btn-clear');
        this.a.button('Call').onClick(() => this.handleCall()).withId('btn-call');
        this.a.button('Del').onClick(() => this.handleBackspace()).withId('btn-del');
      });

      this.a.separator();

      // Recent calls section
      this.a.label('Recent Calls');

      this.a.scroll(() => {
        this.a.vbox(() => {
          const callLog = this.telephony.getCallLog().slice(0, 10);

          if (callLog.length === 0) {
            this.a.label('No recent calls');
          } else {
            callLog.forEach((entry, index) => {
              const contact = this.contacts.search(entry.number)[0];
              const displayName = contact?.name || entry.number;
              const icon = this.getCallIcon(entry.type);
              const time = this.formatCallTime(entry);

              this.a.hbox(() => {
                this.a.label(`${icon} ${displayName}`).withId(`call-${index}-name`);
                this.a.spacer();
                this.a.label(time).withId(`call-${index}-time`);
                this.a.button('Call').onClick(() => {
                  this.currentNumber = entry.number;
                  this.updateDisplay();
                }).withId(`call-${index}-btn`);
              });
            });
          }
        });
      });
    });
  }

  // Public methods for testing
  getCurrentNumber(): string {
    return this.currentNumber;
  }

  setNumber(number: string): void {
    this.currentNumber = number;
    this.updateDisplay();
  }
}

/**
 * Create the dialer app
 * @param a - App instance
 * @param telephony - Telephony service for call operations
 * @param contacts - Contacts service for caller ID
 */
export function createDialerApp(
  a: App,
  telephony: ITelephonyService,
  contacts: IContactsService
): DialerUI {
  const ui = new DialerUI(a, telephony, contacts);

  a.window({ title: 'Phone' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Phone' }, (a: App) => {
    const telephony = new MockTelephonyService();
    const contacts = new MockContactsService();
    createDialerApp(a, telephony, contacts);
  });
}
