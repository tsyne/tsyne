/**
 * Alarms App
 *
 * Manage alarms - add, toggle, and delete.
 *
 * @tsyne-app:name Alarms
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="currentColor">
 *   <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <path d="M12 9v4l2 2" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <path d="M5 3L2 6" stroke="currentColor" stroke-width="2"/>
 *   <path d="M19 3l3 3" stroke="currentColor" stroke-width="2"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:builder createAlarmsApp
 * @tsyne-app:args app,clock,notifications,lifecycle
 * @tsyne-app:count single
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import {
  IClockService,
  INotificationService,
  IAppLifecycle,
  MockClockService,
  MockNotificationService,
  StandaloneAppLifecycle,
  Alarm,
} from '../services';

/**
 * Alarms UI class - manages alarms
 */
export class AlarmsUI {
  private window: Window | null = null;

  constructor(
    private a: App,
    private clock: IClockService,
    private notifications: INotificationService
  ) {}

  public stop(): void {
    // No intervals to clean up for alarms
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  private async handleAddAlarm(): Promise<void> {
    if (!this.window) return;

    const result = await this.window.showForm('New Alarm', [
      { name: 'time', label: 'Time (HH:MM)', type: 'entry', value: '07:00' },
      { name: 'label', label: 'Label', type: 'entry', value: 'Alarm' },
    ]);

    if (result.submitted && result.values.time) {
      this.clock.addAlarm({
        time: result.values.time as string,
        label: result.values.label as string || 'Alarm',
        enabled: true,
        days: [],
      });
      this.refreshUI();
    }
  }

  private handleToggleAlarm(alarm: Alarm): void {
    this.clock.toggleAlarm(alarm.id);
    this.refreshUI();
  }

  private handleDeleteAlarm(alarm: Alarm): void {
    this.clock.removeAlarm(alarm.id);
    this.refreshUI();
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.border({
      top: () => {
        this.a.vbox(() => {
          this.a.hbox(() => {
            this.a.label('Alarms');
            this.a.spacer();
            this.a.button('+').onClick(() => this.handleAddAlarm()).withId('btn-add-alarm');
          });
          this.a.separator();
        });
      },
      center: () => {
        const alarms = this.clock.getAlarms();

        if (alarms.length === 0) {
          this.a.label('No alarms set').withId('no-alarms-label');
        } else {
          this.a.scroll(() => {
            this.a.vbox(() => {
              alarms.forEach((alarm, index) => {
                this.a.hbox(() => {
                  this.a.checkbox('', () => this.handleToggleAlarm(alarm)).withId(`alarm-${index}-toggle`).setChecked(alarm.enabled);
                  this.a.vbox(() => {
                    this.a.label(alarm.time).withId(`alarm-${index}-time`);
                    this.a.label(alarm.label).withId(`alarm-${index}-label`);
                  });
                  this.a.spacer();
                  this.a.button('Del').onClick(() => this.handleDeleteAlarm(alarm)).withId(`alarm-${index}-delete`);
                });
              });
            });
          });
        }
      },
    });
  }
}

/**
 * Create the alarms app
 */
export function createAlarmsApp(
  a: App,
  clock: IClockService,
  notifications: INotificationService,
  lifecycle: IAppLifecycle
): AlarmsUI {
  const ui = new AlarmsUI(a, clock, notifications);

  a.window({ title: 'Alarms', width: 300, height: 400 }, (win: Window) => {
    win.setCloseIntercept(() => {
      ui.stop();
      lifecycle.requestClose();
      return true;
    });

    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Alarms' }, (a: App) => {
    const clock = new MockClockService();
    const notifications = new MockNotificationService();
    const lifecycle = new StandaloneAppLifecycle(() => a.quit());
    createAlarmsApp(a, clock, notifications, lifecycle);
  });
}
