/**
 * Battery Monitor App
 *
 * Displays detailed battery information including charge level,
 * charging status, health, temperature, and estimated time remaining.
 *
 * @tsyne-app:name Battery
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="currentColor">
 *   <rect x="2" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <rect x="20" y="9" width="2" height="6" fill="currentColor"/>
 *   <rect x="4" y="8" width="12" height="8" fill="currentColor" opacity="0.7"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:platforms phone,tablet
 * @tsyne-app:builder createBatteryApp
 * @tsyne-app:args app,battery,lifecycle
 * @tsyne-app:count single
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, Label, ProgressBar } from 'tsyne';
import {
  IBatteryService,
  LinuxBatteryService,
  MockBatteryService,
  BatteryInfo,
} from './battery-service';
import {
  IAppLifecycle,
  StandaloneAppLifecycle,
} from '../services';

/**
 * Battery Monitor UI
 */
export class BatteryUI {
  private window: Window | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  // UI elements
  private percentageLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private healthLabel: Label | null = null;
  private temperatureLabel: Label | null = null;
  private voltageLabel: Label | null = null;
  private currentLabel: Label | null = null;
  private timeRemainingLabel: Label | null = null;
  private capacityLabel: Label | null = null;
  private technologyLabel: Label | null = null;
  private batteryBar: ProgressBar | null = null;

  constructor(
    private a: App,
    private battery: IBatteryService,
    private lifecycle: IAppLifecycle
  ) {
    this.startUpdateLoop();
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private startUpdateLoop(): void {
    // Update every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 5000);
    // Initial update
    this.updateDisplay();
  }

  private async updateDisplay(): Promise<void> {
    const info = await this.battery.getBatteryInfo();

    if (this.percentageLabel) {
      this.percentageLabel.setText(`${info.percentage}%`);
    }

    if (this.batteryBar) {
      this.batteryBar.setValue(info.percentage / 100);
    }

    if (this.statusLabel) {
      const icon = this.getStatusIcon(info);
      this.statusLabel.setText(`${icon} ${info.status}`);
    }

    if (this.healthLabel) {
      this.healthLabel.setText(info.health);
    }

    if (this.temperatureLabel) {
      // Temperature is in tenths of degrees
      const tempC = info.temperature / 10;
      this.temperatureLabel.setText(`${tempC.toFixed(1)}°C`);
    }

    if (this.voltageLabel) {
      // Voltage is in microvolts
      const volts = info.voltageNow / 1000000;
      this.voltageLabel.setText(`${volts.toFixed(3)} V`);
    }

    if (this.currentLabel) {
      // Current is in microamps
      const milliamps = info.currentNow / 1000;
      const sign = info.status === 'Charging' ? '+' : '-';
      this.currentLabel.setText(`${sign}${Math.abs(milliamps).toFixed(0)} mA`);
    }

    if (this.timeRemainingLabel) {
      if (info.timeRemaining > 0) {
        const hours = Math.floor(info.timeRemaining / 60);
        const mins = info.timeRemaining % 60;
        if (hours > 0) {
          this.timeRemainingLabel.setText(`${hours}h ${mins}m remaining`);
        } else {
          this.timeRemainingLabel.setText(`${mins}m remaining`);
        }
      } else if (info.status === 'Full') {
        this.timeRemainingLabel.setText('Fully charged');
      } else if (info.status === 'Charging') {
        this.timeRemainingLabel.setText('Charging...');
      } else {
        this.timeRemainingLabel.setText('--');
      }
    }

    if (this.capacityLabel) {
      // Show battery wear level
      if (info.energyFullDesign > 0) {
        const wearPercent = Math.round((info.energyFull / info.energyFullDesign) * 100);
        const fullWh = info.energyFull / 1000000;
        const designWh = info.energyFullDesign / 1000000;
        this.capacityLabel.setText(`${fullWh.toFixed(1)} / ${designWh.toFixed(1)} Wh (${wearPercent}%)`);
      } else {
        this.capacityLabel.setText('--');
      }
    }

    if (this.technologyLabel) {
      this.technologyLabel.setText(info.technology);
    }
  }

  private getStatusIcon(info: BatteryInfo): string {
    if (info.acConnected) {
      if (info.status === 'Full') return '🔌';
      return '⚡';
    }
    if (info.percentage <= 10) return '🪫';
    if (info.percentage <= 25) return '🔋';
    return '🔋';
  }

  public build(): Window {
    this.window = this.a.window({ title: 'Battery', width: 320, height: 480 });

    this.window.render(({ VBox, HBox, Label, ProgressBar, Spacer }) => {
      return VBox({ padding: 16, spacing: 12 }, [
        // Main percentage display
        VBox({ spacing: 4 }, [
          (() => {
            this.percentageLabel = Label('--', { size: 48, bold: true, alignment: 'center' });
            return this.percentageLabel;
          })(),
          (() => {
            this.batteryBar = ProgressBar(0.75);
            return this.batteryBar;
          })(),
          (() => {
            this.statusLabel = Label('Loading...', { alignment: 'center' });
            return this.statusLabel;
          })(),
        ]),

        Spacer(),

        // Time remaining
        VBox({ spacing: 2 }, [
          Label('Time Remaining', { size: 12, color: '#888888' }),
          (() => {
            this.timeRemainingLabel = Label('--', { size: 18 });
            return this.timeRemainingLabel;
          })(),
        ]),

        // Details section
        Label('Details', { size: 14, bold: true }),

        // Health row
        HBox({ spacing: 8 }, [
          Label('Health:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.healthLabel = Label('--');
            return this.healthLabel;
          })(),
        ]),

        // Temperature row
        HBox({ spacing: 8 }, [
          Label('Temperature:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.temperatureLabel = Label('--');
            return this.temperatureLabel;
          })(),
        ]),

        // Voltage row
        HBox({ spacing: 8 }, [
          Label('Voltage:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.voltageLabel = Label('--');
            return this.voltageLabel;
          })(),
        ]),

        // Current row
        HBox({ spacing: 8 }, [
          Label('Current:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.currentLabel = Label('--');
            return this.currentLabel;
          })(),
        ]),

        // Technology row
        HBox({ spacing: 8 }, [
          Label('Technology:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.technologyLabel = Label('--');
            return this.technologyLabel;
          })(),
        ]),

        // Capacity/wear row
        HBox({ spacing: 8 }, [
          Label('Capacity:', { color: '#888888' }),
          Spacer(),
          (() => {
            this.capacityLabel = Label('--');
            return this.capacityLabel;
          })(),
        ]),

        Spacer(),
      ]);
    });

    return this.window;
  }
}

/**
 * Create battery app with injected dependencies
 */
export function createBatteryApp(
  a: App,
  battery: IBatteryService,
  lifecycle: IAppLifecycle
): BatteryUI {
  const ui = new BatteryUI(a, battery, lifecycle);
  ui.build();
  return ui;
}

// Entry point - only run when executed directly
if (require.main === module) {
  const battery = new LinuxBatteryService();
  const lifecycle = new StandaloneAppLifecycle();

  app(resolveTransport(), { title: 'Battery' }, async (a: App) => {
    createBatteryApp(a, battery, lifecycle);
  });
}
