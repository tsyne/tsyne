/**
 * Tsyne Phone Modem Simulator
 *
 * A phone simulator environment for phone apps with hardware logging.
 * Features:
 * - Portrait phone interface with app grid
 * - "Modem Console" window showing human-readable hardware interactions
 * - Apps use LoggingServices that report what they'd do to real phone hardware
 * - Injects telephony, SMS, contacts, clock, notifications, storage, settings services
 *
 * Run with: ./scripts/tsyne src/phone-modem-simulator.ts
 */

import { App } from 'tsyne';
import { Window } from 'tsyne';
import { Label } from 'tsyne';
import { parseAppMetadata, loadAppBuilder, AppMetadata } from 'tsyne';
import { ALL_APPS } from '../launchers/all-apps';
import { SandboxedApp } from 'tsyne';
import * as path from 'path';

// Import logging services
import {
  modemLog,
  ModemLogEntry,
  createLoggingServices,
  LoggingTelephonyService,
  LoggingSMSService,
  LoggingContactsService,
  LoggingClockService,
  LoggingNotificationService,
  LoggingSettingsService,
  LoggingStorageService,
} from './logging-services';

// Phone configuration
const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 667;
const ICON_COLS = 4;
const ICON_SIZE = 70;

interface PhoneApp {
  metadata: AppMetadata;
  win: Window | null;
}

class PhoneModemSimulator {
  private a: App;
  private mainWin: Window | null = null;
  private modemWin: Window | null = null;
  private apps: PhoneApp[] = [];
  private modemLogLabel: Label | null = null;
  private modemLogLines: string[] = [];
  private services: ReturnType<typeof createLoggingServices>;
  private statusLabel: Label | null = null;

  constructor(app: App) {
    this.a = app;
    this.services = createLoggingServices();

    // Subscribe to modem log
    modemLog.subscribe((entry) => this.handleModemLog(entry));
  }

  private handleModemLog(entry: ModemLogEntry): void {
    const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
    const arrow = entry.direction === 'TX' ? '→' : entry.direction === 'RX' ? '←' : '•';
    const line = `[${time}] ${arrow} ${entry.subsystem}: ${entry.message}`;

    this.modemLogLines.push(line);
    if (this.modemLogLines.length > 50) {
      this.modemLogLines.shift();
    }

    if (this.modemLogLabel) {
      this.modemLogLabel.setText(this.modemLogLines.join('\n'));
    }
  }

  async init(): Promise<void> {
    // Load metadata from all registered apps (filter to phone-apps only)
    for (const filePath of ALL_APPS) {
      if (!filePath.includes('phone-apps')) continue;
      try {
        const metadata = parseAppMetadata(filePath);
        if (metadata) {
          this.apps.push({ metadata, win: null });
        }
      } catch {
        // Silently skip apps that fail to load
      }
    }

    console.log(`PhoneTop: Found ${this.apps.length} phone apps`);
  }

  build(): void {
    // Main phone window
    this.a.window({ title: 'Tsyne Phone', width: PHONE_WIDTH, height: PHONE_HEIGHT }, (win) => {
      this.mainWin = win;

      win.setContent(() => {
        this.a.vbox(() => {
          // Status bar
          this.a.hbox(() => {
            this.a.label('📶 Mock Mobile');
            this.a.spacer();
            this.statusLabel = this.a.label(this.getCurrentTime());
            this.a.spacer();
            this.a.label('🔋 100%');
          });

          this.a.separator();

          // App grid
          this.a.scroll(() => {
            this.a.grid(ICON_COLS, () => {
              for (const app of this.apps) {
                this.a.vbox(() => {
                  // App icon button
                  this.a.button(this.getAppEmoji(app.metadata.name))
                    .onClick(() => this.launchApp(app))
                    .withId(`app-${app.metadata.name.toLowerCase().replace(/\s+/g, '-')}`);

                  // App name label
                  this.a.label(app.metadata.name);
                });
              }
            });
          });

          this.a.spacer();

          // Bottom dock
          this.a.separator();
          this.a.hbox(() => {
            this.a.button('📞').onClick(() => this.launchAppByName('Phone'));
            this.a.button('💬').onClick(() => this.launchAppByName('Messages'));
            this.a.button('⚙️').onClick(() => this.launchAppByName('Settings'));
            this.a.button('📋').onClick(() => this.showModemConsole());
          });
        });
      });

      win.show();
    });

    // Start clock update
    setInterval(() => {
      if (this.statusLabel) {
        this.statusLabel.setText(this.getCurrentTime());
      }
    }, 1000);

    // Show modem console by default
    this.showModemConsole();
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private getAppEmoji(name: string): string {
    const emojiMap: Record<string, string> = {
      'phone': '📞',
      'dialer': '📞',
      'contacts': '👥',
      'messages': '💬',
      'clock': '🕐',
      'notes': '📝',
      'settings': '⚙️',
      'calculator': '🧮',
      'calendar': '📅',
      'camera': '📷',
      'gallery': '🖼️',
      'music': '🎵',
      'weather': '🌤️',
    };

    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (lower.includes(key)) return emoji;
    }
    return '📱';
  }

  private launchAppByName(name: string): void {
    const app = this.apps.find(a =>
      a.metadata.name.toLowerCase().includes(name.toLowerCase())
    );
    if (app) {
      this.launchApp(app);
    }
  }

  private async launchApp(phoneApp: PhoneApp): Promise<void> {
    modemLog.log('SYSTEM', 'INFO', `Launching ${phoneApp.metadata.name}...`);

    try {
      const builder = await loadAppBuilder(phoneApp.metadata);
      if (!builder) {
        modemLog.log('SYSTEM', 'INFO', `ERROR: Could not load ${phoneApp.metadata.name}`);
        return;
      }

      // Create sandboxed app
      const sandboxedApp = new SandboxedApp(this.a, phoneApp.metadata.name.toLowerCase());

      // Build argument map with logging services
      const argMap: Record<string, any> = {
        'app': sandboxedApp,
        'telephony': this.services.telephony,
        'contacts': this.services.contacts,
        'clock': this.services.clock,
        'notifications': this.services.notifications,
        'storage': this.services.storage,
        'settings': this.services.settings,
        'sms': this.services.sms,
      };

      const args = phoneApp.metadata.args.map(name => argMap[name]);

      // Call builder
      await builder(...args);

      modemLog.log('SYSTEM', 'INFO', `${phoneApp.metadata.name} launched`);
    } catch (error) {
      modemLog.log('SYSTEM', 'INFO', `ERROR launching ${phoneApp.metadata.name}: ${error}`);
    }
  }

  private showModemConsole(): void {
    if (this.modemWin) {
      // Already open, just show it
      return;
    }

    this.a.window({
      title: 'Modem Console',
      width: 500,
      height: 400,
    }, (win) => {
      this.modemWin = win;

      win.setContent(() => {
        this.a.vbox(() => {
          this.a.hbox(() => {
            this.a.label('📡 Baseband Modem - Human Readable Mode');
            this.a.spacer();
            this.a.button('Clear').onClick(() => {
              modemLog.clear();
              this.modemLogLines = [];
              if (this.modemLogLabel) {
                this.modemLogLabel.setText('(log cleared)');
              }
            });
          });

          this.a.separator();

          this.a.label('Legend: → TX (to hardware)  ← RX (from hardware)  • INFO');

          this.a.separator();

          this.a.scroll(() => {
            this.modemLogLabel = this.a.label(this.modemLogLines.join('\n') || '(waiting for activity...)');
          });
        });
      });

      win.show();
    });
  }
}

/**
 * Build the phone environment
 */
export async function buildPhoneModemSimulator(a: App): Promise<void> {
  const phone = new PhoneModemSimulator(a);
  await phone.init();
  phone.build();
}

export { PhoneModemSimulator };

// Entry point
if (require.main === module) {
  const { app, resolveTransport  } = require('./index');

  app(resolveTransport(), { title: 'Phone Simulator' }, async (a: App) => {
    await buildPhoneModemSimulator(a);
  });
}
