/**
 * Power Menu App
 *
 * Provides shutdown, reboot, and lock screen functionality.
 * Works with systemd/elogind on Linux (postmarketOS, etc.)
 *
 * @tsyne-app:name Power
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
 * @tsyne-app:category system
 * @tsyne-app:builder createPowerMenuApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 * @tsyne-app:platforms phone,tablet
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type PowerAction = 'lock' | 'suspend' | 'reboot' | 'shutdown';

interface PowerOption {
  label: string;
  action: PowerAction;
  icon: string;
  description: string;
  dangerous: boolean;
}

const POWER_OPTIONS: PowerOption[] = [
  {
    label: 'Lock Screen',
    action: 'lock',
    icon: '🔒',
    description: 'Lock the screen',
    dangerous: false,
  },
  {
    label: 'Suspend',
    action: 'suspend',
    icon: '💤',
    description: 'Suspend to RAM',
    dangerous: false,
  },
  {
    label: 'Reboot',
    action: 'reboot',
    icon: '🔄',
    description: 'Restart the device',
    dangerous: true,
  },
  {
    label: 'Shutdown',
    action: 'shutdown',
    icon: '⏻',
    description: 'Power off the device',
    dangerous: true,
  },
];

/**
 * Execute a power action using loginctl/systemctl
 */
async function executePowerAction(action: PowerAction): Promise<{ success: boolean; error?: string }> {
  // Commands to try in order of preference
  // Phosh/GNOME session methods first, then loginctl, then systemctl, then raw commands
  const commands: Record<PowerAction, string[]> = {
    lock: [
      'dbus-send --type=method_call --dest=org.gnome.ScreenSaver /org/gnome/ScreenSaver org.gnome.ScreenSaver.Lock',
      'loginctl lock-session',
      'gnome-screensaver-command -l',
    ],
    suspend: [
      'loginctl suspend',
      'systemctl suspend',
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.Suspend boolean:true',
    ],
    reboot: [
      'dbus-send --session --type=method_call --dest=org.gnome.SessionManager /org/gnome/SessionManager org.gnome.SessionManager.Reboot',
      'loginctl reboot',
      'systemctl reboot',
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.Reboot boolean:true',
      'reboot',
    ],
    shutdown: [
      'dbus-send --session --type=method_call --dest=org.gnome.SessionManager /org/gnome/SessionManager org.gnome.SessionManager.Shutdown',
      'loginctl poweroff',
      'systemctl poweroff',
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.PowerOff boolean:true',
      'poweroff',
    ],
  };

  const cmds = commands[action];

  for (const cmd of cmds) {
    try {
      await execAsync(cmd);
      return { success: true };
    } catch (e) {
      // Try next command
      continue;
    }
  }

  return {
    success: false,
    error: `Failed to ${action}. None of the available commands worked.`
  };
}

/**
 * Power Menu UI
 */
class PowerMenuUI {
  private window: Window | null = null;

  constructor(private a: App) {}

  buildUI(win: Window): void {
    this.window = win;
    this.buildMainView();
  }

  private buildMainView(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.a.vbox(() => {
        // Header
        this.a.hbox(() => {
          this.a.spacer();
          this.a.label('Power Menu');
          this.a.spacer();
        });

        this.a.separator();
        this.a.spacer();

        // Power options grid (2x2)
        this.a.vbox(() => {
          // First row: Lock, Suspend
          this.a.hbox(() => {
            this.buildPowerButton(POWER_OPTIONS[0]); // Lock
            this.a.spacer();
            this.buildPowerButton(POWER_OPTIONS[1]); // Suspend
          });

          this.a.spacer();

          // Second row: Reboot, Shutdown
          this.a.hbox(() => {
            this.buildPowerButton(POWER_OPTIONS[2]); // Reboot
            this.a.spacer();
            this.buildPowerButton(POWER_OPTIONS[3]); // Shutdown
          });
        });

        this.a.spacer();
      });
    });
  }

  private buildPowerButton(option: PowerOption): void {
    this.a.vbox(() => {
      this.a.button(`${option.icon} ${option.label}`)
        .onClick(() => this.handleAction(option))
        .withId(`btn-${option.action}`);
      this.a.label(option.description);
    });
  }

  private async handleAction(option: PowerOption): Promise<void> {
    if (!this.window) return;

    // Confirm dangerous actions
    if (option.dangerous) {
      const confirmed = await this.window.showConfirm(
        option.label,
        `Are you sure you want to ${option.action}?`
      );
      if (!confirmed) return;
    }

    // Execute the action
    const result = await executePowerAction(option.action);

    if (!result.success && result.error) {
      await this.window.showAlert('Error', result.error);
    }
    // If successful, the action will take effect (screen locks, device reboots, etc.)
  }
}

/**
 * Create the power menu app
 */
export function createPowerMenuApp(a: App): void {
  const ui = new PowerMenuUI(a);

  a.window({ title: 'Power', width: 300, height: 350 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Power Menu' }, (a: App) => {
    createPowerMenuApp(a);
  });
}
