/**
 * Timer App
 *
 * Countdown timer with quick-add buttons.
 *
 * @tsyne-app:name Timer
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="currentColor">
 *   <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <path d="M12 9v4" stroke="currentColor" stroke-width="2"/>
 *   <path d="M10 2h4" stroke="currentColor" stroke-width="2"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:builder createTimerApp
 * @tsyne-app:args app,clock,notifications,lifecycle
 * @tsyne-app:count single
 */

import { app, resolveTransport  } from '../../core/src';
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
import { formatTimerTime } from '../clock-shared';

/**
 * Timer UI class - countdown timer
 */
export class TimerUI {
  private timerLabel: Label | null = null;
  private window: Window | null = null;

  // Timer state
  private timerSeconds = 0;
  private timerRunning = false;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(
    private a: App,
    private clock: IClockService,
    private notifications: INotificationService
  ) {}

  public stop(): void {
    this.stopTimer();
  }

  private updateTimerDisplay(): void {
    if (this.timerLabel) {
      this.timerLabel.setText(formatTimerTime(this.timerSeconds));
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

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      this.a.spacer();
      this.timerLabel = this.a.label(formatTimerTime(this.timerSeconds)).withId('timer-display');
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
  }

  // Public methods for testing
  getTimerSeconds(): number {
    return this.timerSeconds;
  }

  isRunning(): boolean {
    return this.timerRunning;
  }
}

/**
 * Create the timer app
 */
export function createTimerApp(
  a: App,
  clock: IClockService,
  notifications: INotificationService,
  lifecycle: IAppLifecycle
): TimerUI {
  const ui = new TimerUI(a, clock, notifications);

  a.window({ title: 'Timer' }, (win: Window) => {
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
  app(resolveTransport(), { title: 'Timer' }, (a: App) => {
    const clock = new MockClockService();
    const notifications = new MockNotificationService();
    const lifecycle = new StandaloneAppLifecycle(() => a.quit());
    createTimerApp(a, clock, notifications, lifecycle);
  });
}
