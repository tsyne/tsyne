/**
 * Stopwatch App
 *
 * Stopwatch with analog dial display and lap recording.
 *
 * @tsyne-app:name Stopwatch
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *   <circle cx="12" cy="13" r="8"/>
 *   <path d="M12 9v4l2 2"/>
 *   <path d="M12 5V3"/>
 *   <path d="M10 3h4"/>
 *   <path d="M18 7l1.5-1.5"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:builder createStopwatchApp
 * @tsyne-app:args app,clock,notifications,lifecycle
 * @tsyne-app:count single
 */

import { app, resolveTransport  } from 'tsyne';
import type { App, Window, Label, Button, CanvasLine } from 'tsyne';
import {
  IClockService,
  INotificationService,
  IAppLifecycle,
  MockClockService,
  MockNotificationService,
  StandaloneAppLifecycle,
} from '../services';
import {
  STOPWATCH_SIZE,
  STOPWATCH_CENTER,
  STOPWATCH_RADIUS,
  calcStopwatchHandLine,
  calcSecondMarkerLine,
  formatStopwatchTime,
} from '../clock-shared';

/**
 * Stopwatch UI class - stopwatch with laps
 */
export class StopwatchUI {
  private stopwatchLabel: Label | null = null;
  private window: Window | null = null;

  // Stopwatch hand
  private stopwatchHand: CanvasLine | null = null;
  // Stopwatch start/stop toggle button
  private swStartStopButton: Button | null = null;

  // Stopwatch state
  private stopwatchMs = 0;
  private stopwatchRunning = false;
  private stopwatchInterval: NodeJS.Timeout | null = null;
  private laps: number[] = [];

  constructor(
    private a: App,
    private clock: IClockService,
    private notifications: INotificationService
  ) {}

  public stop(): void {
    this.stopStopwatch();
  }

  private updateStopwatchDisplay(): void {
    if (this.stopwatchLabel) {
      this.stopwatchLabel.setText(formatStopwatchTime(this.stopwatchMs));
    }
    // Update stopwatch hand (rotation = seconds / 60)
    if (this.stopwatchHand) {
      const totalSecs = this.stopwatchMs / 1000;
      const rotation = (totalSecs % 60) / 60; // 0-1 for 60 seconds
      this.stopwatchHand.update(calcStopwatchHandLine(rotation, STOPWATCH_RADIUS * 0.75));
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
    // Update button label
    if (this.swStartStopButton) {
      this.swStartStopButton.setText('Stop');
    }
  }

  private stopStopwatch(): void {
    this.stopwatchRunning = false;
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }
    // Update button label
    if (this.swStartStopButton) {
      this.swStartStopButton.setText('Start');
    }
  }

  private toggleStopwatch(): void {
    if (this.stopwatchRunning) {
      this.stopStopwatch();
    } else {
      this.startStopwatch();
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

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Analog stopwatch dial
      this.a.center(() => {
        this.a.canvasStack(() => {
          // Sizing rectangle (transparent) to give the stack a minimum size
          this.a.canvasRectangle({
            width: STOPWATCH_SIZE, height: STOPWATCH_SIZE,
            fillColor: 'transparent',
          });

          // Dial face
          this.a.canvasCircle({
            x: 0, y: 0,
            x2: STOPWATCH_SIZE, y2: STOPWATCH_SIZE,
            fillColor: '#f5f5f5',
            strokeColor: '#333333',
            strokeWidth: 2,
          });

          // Second markers (60 tick marks)
          for (let i = 0; i < 60; i++) {
            const { x1, y1, x2, y2 } = calcSecondMarkerLine(i);
            this.a.canvasLine(x1, y1, x2, y2, {
              strokeColor: i % 5 === 0 ? '#333333' : '#999999',
              strokeWidth: i % 5 === 0 ? 2 : 1,
            });
          }

          // Stopwatch hand (starts at 12 o'clock)
          const { x1, y1, x2, y2 } = calcStopwatchHandLine(0, STOPWATCH_RADIUS * 0.75);
          this.stopwatchHand = this.a.canvasLine(x1, y1, x2, y2, {
            strokeColor: '#e74c3c',  // Red hand
            strokeWidth: 3,
          });

          // Center dot
          this.a.canvasCircle({
            x: STOPWATCH_CENTER - 5, y: STOPWATCH_CENTER - 5,
            x2: STOPWATCH_CENTER + 5, y2: STOPWATCH_CENTER + 5,
            fillColor: '#333333',
            strokeColor: '#333333',
            strokeWidth: 1,
          });
        });
      });

      // Digital display below dial
      this.stopwatchLabel = this.a.label(formatStopwatchTime(this.stopwatchMs)).withId('stopwatch-display');

      // Control buttons - single Start/Stop toggle + Lap + Reset
      this.a.hbox(() => {
        this.swStartStopButton = this.a.button(this.stopwatchRunning ? 'Stop' : 'Start')
          .onClick(() => this.toggleStopwatch())
          .withId('stopwatch-startstop');
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
                this.a.label(`Lap ${lapNum}`).withId(`lap-${lapNum}-label`);
                this.a.spacer();
                this.a.label(formatStopwatchTime(lapMs)).withId(`lap-${lapNum}-time`);
              });
            });
          });
        });
      }
    });
  }

  // Public methods for testing
  getStopwatchMs(): number {
    return this.stopwatchMs;
  }

  getLaps(): number[] {
    return [...this.laps];
  }

  isRunning(): boolean {
    return this.stopwatchRunning;
  }
}

/**
 * Create the stopwatch app
 */
export function createStopwatchApp(
  a: App,
  clock: IClockService,
  notifications: INotificationService,
  lifecycle: IAppLifecycle
): StopwatchUI {
  const ui = new StopwatchUI(a, clock, notifications);

  // Register cleanup to ensure intervals are cleared when app is cleaned up (e.g., in tests)
  a.registerCleanup(() => ui.stop());

  a.window({ title: 'Stopwatch' }, (win: Window) => {
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
  app(resolveTransport(), { title: 'Stopwatch' }, (a: App) => {
    const clock = new MockClockService();
    const notifications = new MockNotificationService();
    const lifecycle = new StandaloneAppLifecycle(() => a.quit());
    createStopwatchApp(a, clock, notifications, lifecycle);
  });
}
