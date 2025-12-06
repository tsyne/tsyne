/**
 * Clock App
 *
 * A clock app with tabs for time display, alarms, timer, and stopwatch.
 * Uses ClockService for time/alarms and NotificationService for alerts.
 *
 * @tsyne-app:name Clock
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createClockApp
 * @tsyne-app:args app,clock,notifications
 * @tsyne-app:count single
 */

import { app, styles, FontStyle } from '../src';
import type { App } from '../src/app';
import type { Window } from '../src/window';
import type { Label } from '../src/widgets/display';
import type { CanvasLine } from '../src/widgets/canvas';
import {
  IClockService,
  INotificationService,
  MockClockService,
  MockNotificationService,
  Alarm,
} from './services';

// Define clock styles
styles({
  'clock-display': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 48,
  },
  'clock-date': {
    text_align: 'center',
    font_size: 18,
  },
});

/**
 * Clock UI class
 */
// Analog clock constants
const CLOCK_SIZE = 200;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const CLOCK_RADIUS = 90;

class ClockUI {
  private timeLabel: Label | null = null;
  private dateLabel: Label | null = null;
  private timerLabel: Label | null = null;
  private stopwatchLabel: Label | null = null;
  private window: Window | null = null;

  // Analog clock hands
  private hourHand: CanvasLine | null = null;
  private minuteHand: CanvasLine | null = null;
  private secondHand: CanvasLine | null = null;

  // Timer state
  private timerSeconds = 0;
  private timerRunning = false;
  private timerInterval: NodeJS.Timeout | null = null;

  // Stopwatch state
  private stopwatchMs = 0;
  private stopwatchRunning = false;
  private stopwatchInterval: NodeJS.Timeout | null = null;
  private laps: number[] = [];

  constructor(
    private a: App,
    private clock: IClockService,
    private notifications: INotificationService
  ) {
    // Start the clock update loop
    this.startClockUpdate();
  }

  private startClockUpdate(): void {
    setInterval(() => {
      this.updateTimeDisplay();
    }, 1000);
  }

  private updateTimeDisplay(): void {
    const now = this.clock.getCurrentTime();

    if (this.timeLabel) {
      this.timeLabel.setText(now.toLocaleTimeString());
    }
    if (this.dateLabel) {
      this.dateLabel.setText(now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
    }

    // Update analog clock hands
    this.updateAnalogClock(now);
  }

  private updateAnalogClock(now: Date): void {
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calculate angles (0 = 12 o'clock, clockwise)
    const secondAngle = (seconds / 60) * 2 * Math.PI - Math.PI / 2;
    const minuteAngle = ((minutes + seconds / 60) / 60) * 2 * Math.PI - Math.PI / 2;
    const hourAngle = ((hours + minutes / 60) / 12) * 2 * Math.PI - Math.PI / 2;

    // Calculate hand endpoints
    const secondLength = CLOCK_RADIUS * 0.85;
    const minuteLength = CLOCK_RADIUS * 0.75;
    const hourLength = CLOCK_RADIUS * 0.5;

    // Update second hand
    if (this.secondHand) {
      this.secondHand.update({
        x2: CLOCK_CENTER + Math.cos(secondAngle) * secondLength,
        y2: CLOCK_CENTER + Math.sin(secondAngle) * secondLength,
      });
    }

    // Update minute hand
    if (this.minuteHand) {
      this.minuteHand.update({
        x2: CLOCK_CENTER + Math.cos(minuteAngle) * minuteLength,
        y2: CLOCK_CENTER + Math.sin(minuteAngle) * minuteLength,
      });
    }

    // Update hour hand
    if (this.hourHand) {
      this.hourHand.update({
        x2: CLOCK_CENTER + Math.cos(hourAngle) * hourLength,
        y2: CLOCK_CENTER + Math.sin(hourAngle) * hourLength,
      });
    }
  }

  // Timer methods
  private formatTimerTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private updateTimerDisplay(): void {
    if (this.timerLabel) {
      this.timerLabel.setText(this.formatTimerTime(this.timerSeconds));
    }
  }

  private startTimer(): void {
    if (this.timerRunning || this.timerSeconds <= 0) return;
    this.timerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();
      if (this.timerSeconds <= 0) {
        this.stopTimer();
        this.notifications.send('Timer', 'Time is up!');
      }
    }, 1000);
  }

  private stopTimer(): void {
    this.timerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private resetTimer(): void {
    this.stopTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
  }

  private addTimerMinutes(mins: number): void {
    if (this.timerRunning) return;
    this.timerSeconds += mins * 60;
    this.updateTimerDisplay();
  }

  // Stopwatch methods
  private formatStopwatchTime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  }

  private updateStopwatchDisplay(): void {
    if (this.stopwatchLabel) {
      this.stopwatchLabel.setText(this.formatStopwatchTime(this.stopwatchMs));
    }
  }

  private startStopwatch(): void {
    if (this.stopwatchRunning) return;
    this.stopwatchRunning = true;
    const startTime = Date.now() - this.stopwatchMs;
    this.stopwatchInterval = setInterval(() => {
      this.stopwatchMs = Date.now() - startTime;
      this.updateStopwatchDisplay();
    }, 10);
  }

  private stopStopwatch(): void {
    this.stopwatchRunning = false;
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }
  }

  private resetStopwatch(): void {
    this.stopStopwatch();
    this.stopwatchMs = 0;
    this.laps = [];
    this.updateStopwatchDisplay();
    this.refreshUI();
  }

  private recordLap(): void {
    if (!this.stopwatchRunning) return;
    this.laps.push(this.stopwatchMs);
    this.refreshUI();
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  // Alarm methods
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

    this.a.tabs(() => {
      // Clock tab
      this.a.tab('Clock', () => {
        this.a.vbox(() => {
          // Analog clock face
          this.a.center(() => {
            this.a.stack(() => {
              // Clock face circle
              this.a.canvasCircle({
                x: 0, y: 0,
                x2: CLOCK_SIZE, y2: CLOCK_SIZE,
                fillColor: '#f5f5f5',
                strokeColor: '#333333',
                strokeWidth: 3,
              });

              // Hour markers
              for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
                const innerRadius = CLOCK_RADIUS * 0.85;
                const outerRadius = CLOCK_RADIUS * 0.95;
                const x1 = CLOCK_CENTER + Math.cos(angle) * innerRadius;
                const y1 = CLOCK_CENTER + Math.sin(angle) * innerRadius;
                const x2 = CLOCK_CENTER + Math.cos(angle) * outerRadius;
                const y2 = CLOCK_CENTER + Math.sin(angle) * outerRadius;
                this.a.canvasLine(x1, y1, x2, y2, {
                  strokeColor: '#333333',
                  strokeWidth: i % 3 === 0 ? 3 : 1, // Bold at 12, 3, 6, 9
                });
              }

              // Clock hands (initialized pointing up, will be updated)
              const now = this.clock.getCurrentTime();
              const hours = now.getHours() % 12;
              const minutes = now.getMinutes();
              const seconds = now.getSeconds();

              const secondAngle = (seconds / 60) * 2 * Math.PI - Math.PI / 2;
              const minuteAngle = ((minutes + seconds / 60) / 60) * 2 * Math.PI - Math.PI / 2;
              const hourAngle = ((hours + minutes / 60) / 12) * 2 * Math.PI - Math.PI / 2;

              // Hour hand
              this.hourHand = this.a.canvasLine(
                CLOCK_CENTER, CLOCK_CENTER,
                CLOCK_CENTER + Math.cos(hourAngle) * CLOCK_RADIUS * 0.5,
                CLOCK_CENTER + Math.sin(hourAngle) * CLOCK_RADIUS * 0.5,
                { strokeColor: '#333333', strokeWidth: 4 }
              );

              // Minute hand
              this.minuteHand = this.a.canvasLine(
                CLOCK_CENTER, CLOCK_CENTER,
                CLOCK_CENTER + Math.cos(minuteAngle) * CLOCK_RADIUS * 0.75,
                CLOCK_CENTER + Math.sin(minuteAngle) * CLOCK_RADIUS * 0.75,
                { strokeColor: '#333333', strokeWidth: 3 }
              );

              // Second hand
              this.secondHand = this.a.canvasLine(
                CLOCK_CENTER, CLOCK_CENTER,
                CLOCK_CENTER + Math.cos(secondAngle) * CLOCK_RADIUS * 0.85,
                CLOCK_CENTER + Math.sin(secondAngle) * CLOCK_RADIUS * 0.85,
                { strokeColor: '#e74c3c', strokeWidth: 1 }
              );

              // Center dot
              this.a.canvasCircle({
                x: CLOCK_CENTER - 5, y: CLOCK_CENTER - 5,
                x2: CLOCK_CENTER + 5, y2: CLOCK_CENTER + 5,
                fillColor: '#333333',
              });
            });
          });

          this.a.separator();

          // Digital time display
          this.timeLabel = this.a.label(this.clock.getCurrentTime().toLocaleTimeString()).withId('time-display');
          this.dateLabel = this.a.label('').withId('date-display');
          this.updateTimeDisplay();
          this.a.label(`Timezone: ${this.clock.getTimezone()}`);
        });
      });

      // Alarms tab
      this.a.tab('Alarms', () => {
        this.a.vbox(() => {
          this.a.hbox(() => {
            this.a.label('Alarms');
            this.a.spacer();
            this.a.button('+').onClick(() => this.handleAddAlarm()).withId('btn-add-alarm');
          });

          this.a.separator();

          this.a.scroll(() => {
            this.a.vbox(() => {
              const alarms = this.clock.getAlarms();

              if (alarms.length === 0) {
                this.a.label('No alarms set');
              } else {
                alarms.forEach((alarm, index) => {
                  this.a.hbox(() => {
                    this.a.checkbox('', alarm.enabled, () => this.handleToggleAlarm(alarm)).withId(`alarm-${index}-toggle`);
                    this.a.vbox(() => {
                      this.a.label(alarm.time).withId(`alarm-${index}-time`);
                      this.a.label(alarm.label).withId(`alarm-${index}-label`);
                    });
                    this.a.spacer();
                    this.a.button('Del').onClick(() => this.handleDeleteAlarm(alarm)).withId(`alarm-${index}-delete`);
                  });
                });
              }
            });
          });
        });
      });

      // Timer tab
      this.a.tab('Timer', () => {
        this.a.vbox(() => {
          this.a.spacer();
          this.timerLabel = this.a.label(this.formatTimerTime(this.timerSeconds)).withId('timer-display');
          this.a.spacer();

          // Quick add buttons
          this.a.hbox(() => {
            this.a.button('+1m').onClick(() => this.addTimerMinutes(1)).withId('timer-add-1');
            this.a.button('+5m').onClick(() => this.addTimerMinutes(5)).withId('timer-add-5');
            this.a.button('+10m').onClick(() => this.addTimerMinutes(10)).withId('timer-add-10');
          });

          this.a.separator();

          // Control buttons
          this.a.hbox(() => {
            this.a.button('Start').onClick(() => this.startTimer()).withId('timer-start');
            this.a.button('Stop').onClick(() => this.stopTimer()).withId('timer-stop');
            this.a.button('Reset').onClick(() => this.resetTimer()).withId('timer-reset');
          });
        });
      });

      // Stopwatch tab
      this.a.tab('Stopwatch', () => {
        this.a.vbox(() => {
          this.a.spacer();
          this.stopwatchLabel = this.a.label(this.formatStopwatchTime(this.stopwatchMs)).withId('stopwatch-display');
          this.a.spacer();

          // Control buttons
          this.a.hbox(() => {
            this.a.button('Start').onClick(() => this.startStopwatch()).withId('stopwatch-start');
            this.a.button('Stop').onClick(() => this.stopStopwatch()).withId('stopwatch-stop');
            this.a.button('Lap').onClick(() => this.recordLap()).withId('stopwatch-lap');
            this.a.button('Reset').onClick(() => this.resetStopwatch()).withId('stopwatch-reset');
          });

          this.a.separator();

          // Laps
          if (this.laps.length > 0) {
            this.a.label('Laps');
            this.a.scroll(() => {
              this.a.vbox(() => {
                this.laps.slice().reverse().forEach((lapMs, index) => {
                  const lapNum = this.laps.length - index;
                  this.a.hbox(() => {
                    this.a.label(`Lap ${lapNum}`);
                    this.a.spacer();
                    this.a.label(this.formatStopwatchTime(lapMs));
                  });
                });
              });
            });
          }
        });
      });
    });
  }

  // Public methods for testing
  getTimerSeconds(): number {
    return this.timerSeconds;
  }

  getStopwatchMs(): number {
    return this.stopwatchMs;
  }

  getLaps(): number[] {
    return [...this.laps];
  }
}

/**
 * Create the clock app
 * @param a - App instance
 * @param clock - Clock service for time and alarms
 * @param notifications - Notification service for timer alerts
 */
export function createClockApp(
  a: App,
  clock: IClockService,
  notifications: INotificationService
): ClockUI {
  const ui = new ClockUI(a, clock, notifications);

  a.window({ title: 'Clock', width: 320, height: 560 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Clock' }, (a: App) => {
    const clock = new MockClockService();
    const notifications = new MockNotificationService();
    createClockApp(a, clock, notifications);
  });
}
