/**
 * Settings App
 *
 * System settings app with toggles for Wi-Fi, Bluetooth, theme, and more.
 * Uses SettingsService for system preferences.
 *
 * @tsyne-app:name Settings
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
 * @tsyne-app:category system
 * @tsyne-app:builder createSettingsApp
 * @tsyne-app:args app,settings
 * @tsyne-app:count single
 */

import { app, resolveTransport  } from 'tsyne';
import type { App, Window, Label, Slider } from 'tsyne';
import { ISettingsService, MockSettingsService } from './services';

/**
 * Settings UI class
 */
class SettingsUI {
  private window: Window | null = null;
  private brightnessLabel: Label | null = null;
  private volumeLabel: Label | null = null;

  constructor(
    private a: App,
    private settings: ISettingsService
  ) {}

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  private handleWifiToggle(enabled: boolean): void {
    this.settings.setWifiEnabled(enabled);
  }

  private handleBluetoothToggle(enabled: boolean): void {
    this.settings.setBluetoothEnabled(enabled);
  }

  private handleThemeChange(theme: string): void {
    this.settings.setTheme(theme as 'light' | 'dark' | 'system');
    // In a real app, this would also update the app's theme
    this.a.setTheme(theme === 'dark' ? 'dark' : 'light');
  }

  private handleBrightnessChange(value: number): void {
    this.settings.setBrightness(value);
    if (this.brightnessLabel) {
      this.brightnessLabel.setText(`${value}%`);
    }
  }

  private handleVolumeChange(value: number): void {
    this.settings.setVolume(value);
    if (this.volumeLabel) {
      this.volumeLabel.setText(`${value}%`);
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      this.a.label('Settings');

      this.a.separator();

      // Network section
      this.a.label('Network');

      this.a.hbox(() => {
        this.a.label('Wi-Fi');
        this.a.spacer();
        const wifiCheckbox = this.a.checkbox('', (checked: boolean) => {
          this.handleWifiToggle(checked);
        }).withId('toggle-wifi');
        wifiCheckbox.setChecked(this.settings.isWifiEnabled());
      });

      this.a.hbox(() => {
        this.a.label('Bluetooth');
        this.a.spacer();
        const btCheckbox = this.a.checkbox('', (checked: boolean) => {
          this.handleBluetoothToggle(checked);
        }).withId('toggle-bluetooth');
        btCheckbox.setChecked(this.settings.isBluetoothEnabled());
      });

      this.a.separator();

      // Display section
      this.a.label('Display');

      this.a.hbox(() => {
        this.a.label('Theme');
        this.a.spacer();
        const themeSelect = this.a.select(['system', 'light', 'dark'], (value: string) => {
          this.handleThemeChange(value);
        }).withId('select-theme');
        themeSelect.setSelected(this.settings.getTheme());
      });

      this.a.hbox(() => {
        this.a.label('Brightness');
        this.a.spacer();
        this.brightnessLabel = this.a.label(`${this.settings.getBrightness()}%`).withId('brightness-value');
      });
      this.a.slider(0, 100, this.settings.getBrightness(), (value) => {
        this.handleBrightnessChange(value);
      }).withId('slider-brightness');

      this.a.separator();

      // Sound section
      this.a.label('Sound');

      this.a.hbox(() => {
        this.a.label('Volume');
        this.a.spacer();
        this.volumeLabel = this.a.label(`${this.settings.getVolume()}%`).withId('volume-value');
      });
      this.a.slider(0, 100, this.settings.getVolume(), (value) => {
        this.handleVolumeChange(value);
      }).withId('slider-volume');

      this.a.separator();

      // About section
      this.a.label('About');

      this.a.hbox(() => {
        this.a.label('Phone OS');
        this.a.spacer();
        this.a.label('Tsyne Phone v1.0');
      });

      this.a.hbox(() => {
        this.a.label('Build');
        this.a.spacer();
        this.a.label('2024.12.06');
      });

      this.a.spacer();
    });
  }

  // Public methods for testing
  getWifiEnabled(): boolean {
    return this.settings.isWifiEnabled();
  }

  getBluetoothEnabled(): boolean {
    return this.settings.isBluetoothEnabled();
  }

  getTheme(): string {
    return this.settings.getTheme();
  }

  getBrightness(): number {
    return this.settings.getBrightness();
  }

  getVolume(): number {
    return this.settings.getVolume();
  }
}

/**
 * Create the settings app
 * @param a - App instance
 * @param settings - Settings service
 */
export function createSettingsApp(
  a: App,
  settings: ISettingsService
): SettingsUI {
  const ui = new SettingsUI(a, settings);

  a.window({ title: 'Settings' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Settings' }, (a: App) => {
    const settings = new MockSettingsService();
    createSettingsApp(a, settings);
  });
}
