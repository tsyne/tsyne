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

type PowerAction = 'lock' | 'suspend' | 'reboot' | 'shutdown' | 'fastboot';

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
  {
    label: 'Fastboot',
    action: 'fastboot',
    icon: '📲',
    description: 'Reboot to bootloader',
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
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.Suspend boolean:true',
      'loginctl suspend',
      'systemctl suspend',
      'doas pm-suspend',
    ],
    reboot: [
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.Reboot boolean:true',
      'loginctl reboot',
      'systemctl reboot',
      'doas reboot',
      'reboot',
    ],
    shutdown: [
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.PowerOff boolean:true',
      'loginctl poweroff',
      'systemctl poweroff',
      'doas poweroff',
      'poweroff',
    ],
    fastboot: [
      'dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.Reboot boolean:true string:bootloader',
      'loginctl reboot bootloader',
      'doas reboot bootloader',
      'reboot bootloader',
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

    // Build content directly (don't call setContent - that's done by the caller)
    this.a.vbox(() => {
      // Header
      this.a.hbox(() => {
        this.a.spacer();
        this.a.label('Power Menu');
        this.a.spacer();
      });

      this.a.separator();
      this.a.spacer();

      // Power options grid
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

        this.a.spacer();

        // Third row: Fastboot (centered)
        this.a.hbox(() => {
          this.a.spacer();
          this.buildPowerButton(POWER_OPTIONS[4]); // Fastboot
          this.a.spacer();
        });
      });

      this.a.spacer();
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

    // Confirm dangerous actions (if window supports dialogs)
    if (option.dangerous && typeof this.window.showConfirm === 'function') {
      try {
        const confirmed = await this.window.showConfirm(
          option.label,
          `Are you sure you want to ${option.action}?`
        );
        if (!confirmed) return;
      } catch {
        // Dialog not supported (phone mode) - proceed without confirmation
        console.log(`[Power] Confirmation dialog not available, proceeding with ${option.action}`);
      }
    }

    // Execute the action
    console.log(`[Power] Executing ${option.action}...`);
    const result = await executePowerAction(option.action);

    if (!result.success && result.error) {
      console.error(`[Power] ${option.action} failed:`, result.error);
      // Try to show alert if available, otherwise just log
      if (typeof this.window.showAlert === 'function') {
        try {
          await this.window.showAlert('Error', result.error);
        } catch {
          // Alert not supported
        }
      }
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
