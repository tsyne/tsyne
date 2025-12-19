/**
 * Clock App
 *
 * Displays analog and digital clock with current time and date.
 *
 * @tsyne-app:name Clock
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <polyline points="12 6 12 12 18 12" fill="none" stroke="currentColor" stroke-width="2"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:builder createClockApp
 * @tsyne-app:args app,clock,notifications,lifecycle
 * @tsyne-app:count single
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import {
  IClockService,
  INotificationService,
  IAppLifecycle,
  MockClockService,
  MockNotificationService,
  StandaloneAppLifecycle,
} from '../services';
import {
  CLOCK_SIZE,
  CLOCK_CENTER,
  CLOCK_RADIUS,
  calcHourMarkerLine,
  calcHandLine,
  HandBinding,
} from '../clock-shared';

/**
 * Clock UI class - displays analog and digital clock
 */
export class ClockUI {
  private timeLabel: Label | null = null;
  private dateLabel: Label | null = null;
  private window: Window | null = null;

  // Bound clock hands - updated automatically by the clock loop
  private handBindings: HandBinding[] = [];
  private clockUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    private a: App,
    private clock: IClockService,
    private notifications: INotificationService
  ) {
    // Start the clock update loop
    this.startClockUpdate();
  }

  public stop(): void {
    if (this.clockUpdateInterval) {
      clearInterval(this.clockUpdateInterval);
      this.clockUpdateInterval = null;
    }
  }

  private startClockUpdate(): void {
    this.clockUpdateInterval = setInterval(() => {
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

    // Update all bound clock hands
    for (const binding of this.handBindings) {
      binding.line.update(calcHandLine(binding.rotation(), binding.length));
    }
  }

  /**
   * Declarative hand binding - creates a line and binds its position to a rotation function.
   * The rotation function returns 0-1 where 0 = 12 o'clock, 0.5 = 6 o'clock, etc.
   */
  private bindLine(config: {
    length: number;
    strokeColor: string;
    strokeWidth: number;
    rotation: () => number;
  }): void {
    const { x1, y1, x2, y2 } = calcHandLine(config.rotation(), config.length);
    const line = this.a.canvasLine(x1, y1, x2, y2, {
      strokeColor: config.strokeColor,
      strokeWidth: config.strokeWidth,
    });
    this.handBindings.push({
      line,
      length: config.length,
      rotation: config.rotation,
    });
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Analog clock face
      this.a.center(() => {
        this.a.canvasStack(() => {
          // Sizing rectangle (transparent) to give the stack a minimum size
          this.a.canvasRectangle({
            width: CLOCK_SIZE, height: CLOCK_SIZE,
            fillColor: 'transparent',
          });

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
            const { x1, y1, x2, y2 } = calcHourMarkerLine(i);
            this.a.canvasLine(x1, y1, x2, y2, {
              strokeColor: '#333333',
              strokeWidth: i % 3 === 0 ? 3 : 1, // Bold at 12, 3, 6, 9
            });
          }

          // Clock hands - declarative bindings
          this.handBindings = [];

          // Hour hand
          this.bindLine({
            length: CLOCK_RADIUS * 0.5,
            strokeColor: '#333333',
            strokeWidth: 4,
            rotation: () => {
              const t = this.clock.getCurrentTime();
              return (t.getHours() % 12 + t.getMinutes() / 60) / 12;
            },
          });

          // Minute hand
          this.bindLine({
            length: CLOCK_RADIUS * 0.75,
            strokeColor: '#333333',
            strokeWidth: 3,
            rotation: () => {
              const t = this.clock.getCurrentTime();
              return (t.getMinutes() + t.getSeconds() / 60) / 60;
            },
          });

          // Second hand
          this.bindLine({
            length: CLOCK_RADIUS * 0.85,
            strokeColor: '#e74c3c',
            strokeWidth: 1,
            rotation: () => this.clock.getCurrentTime().getSeconds() / 60,
          });

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
  }
}

/**
 * Create the clock app
 */
export function createClockApp(
  a: App,
  clock: IClockService,
  notifications: INotificationService,
  lifecycle: IAppLifecycle
): ClockUI {
  const ui = new ClockUI(a, clock, notifications);

  a.window({ title: 'Clock' }, (win: Window) => {
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
  app({ title: 'Clock' }, (a: App) => {
    const clock = new MockClockService();
    const notifications = new MockNotificationService();
    const lifecycle = new StandaloneAppLifecycle(() => a.quit());
    createClockApp(a, clock, notifications, lifecycle);
  });
}
