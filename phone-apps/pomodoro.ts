/**
 * Pomodoro Timer App
 *
 * A productivity timer implementing the Pomodoro Technique:
 * - 25 minute work (focus) sessions
 * - 5 minute short breaks
 * - 15 minute long breaks after 4 sessions
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Pomodoro
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 6v6l4.5 2.5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildPomodoroApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 */

import type { App, Window, Label, Button } from 'tsyne';

type SessionType = 'work' | 'break' | 'longBreak';

interface PomodoroState {
  sessionType: SessionType;
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  isRunning: boolean;
  sessionsCompleted: number;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
}

/**
 * Pomodoro Timer UI and Logic
 */
class PomodoroUI {
  private state: PomodoroState = {
    sessionType: 'work',
    timeRemaining: 25 * 60,
    totalTime: 25 * 60,
    isRunning: false,
    sessionsCompleted: 0,
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
  };

  private window: Window | null = null;
  private displayLabel: Label | null = null;
  private sessionLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private startButton: Button | null = null;
  private resetButton: Button | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private a: App) {
    this.loadSettings();
  }

  private loadSettings(): void {
    const workMin = this.a.getPreferenceInt('pomodoro_work', 25);
    const breakMin = this.a.getPreferenceInt('pomodoro_break', 5);
    const longBreakMin = this.a.getPreferenceInt('pomodoro_long_break', 15);

    this.state.workMinutes = workMin;
    this.state.breakMinutes = breakMin;
    this.state.longBreakMinutes = longBreakMin;
    this.resetToNextSession();
  }

  private saveSettings(): void {
    this.a.setPreference('pomodoro_work', this.state.workMinutes.toString());
    this.a.setPreference('pomodoro_break', this.state.breakMinutes.toString());
    this.a.setPreference('pomodoro_long_break', this.state.longBreakMinutes.toString());
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private tick(): void {
    if (!this.state.isRunning) {
      return;
    }

    this.state.timeRemaining--;

    if (this.state.timeRemaining <= 0) {
      this.sessionComplete();
    } else {
      this.updateDisplay();
    }
  }

  private sessionComplete(): void {
    this.stop();

    // Show notification
    if (this.window) {
      const message =
        this.state.sessionType === 'work'
          ? 'Work session complete! Take a break.'
          : 'Break complete! Ready to focus?';

      this.a.sendNotification('Pomodoro', message);
    }

    // Move to next session
    if (this.state.sessionType === 'work') {
      this.state.sessionsCompleted++;

      // After 4 work sessions, take a long break
      if (this.state.sessionsCompleted % 4 === 0) {
        this.state.sessionType = 'longBreak';
        this.state.totalTime = this.state.longBreakMinutes * 60;
      } else {
        this.state.sessionType = 'break';
        this.state.totalTime = this.state.breakMinutes * 60;
      }
    } else {
      // Break complete, back to work
      this.state.sessionType = 'work';
      this.state.totalTime = this.state.workMinutes * 60;
    }

    this.state.timeRemaining = this.state.totalTime;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (this.displayLabel) {
      this.displayLabel.setText(this.formatTime(this.state.timeRemaining));
    }

    if (this.sessionLabel) {
      const sessionText =
        this.state.sessionType === 'work'
          ? 'Focus Session'
          : this.state.sessionType === 'break'
            ? 'Short Break'
            : 'Long Break';
      this.sessionLabel.setText(sessionText);
    }

    if (this.statusLabel) {
      const status = this.state.isRunning ? 'Running' : 'Paused';
      this.statusLabel.setText(`${status} • ${this.state.sessionsCompleted} sessions`);
    }

    if (this.startButton) {
      const btnText = this.state.isRunning ? 'Pause' : 'Start';
      this.startButton.setText(btnText);
    }
  }

  private resetToNextSession(): void {
    const nextTime =
      this.state.sessionType === 'work'
        ? this.state.workMinutes * 60
        : this.state.sessionType === 'break'
          ? this.state.breakMinutes * 60
          : this.state.longBreakMinutes * 60;

    this.state.totalTime = nextTime;
    this.state.timeRemaining = nextTime;
    this.updateDisplay();
  }

  start(): void {
    if (this.state.isRunning) {
      return; // Already running
    }

    this.state.isRunning = true;
    this.updateDisplay();

    // Use setInterval to tick every second
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  stop(): void {
    this.state.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateDisplay();
  }

  reset(): void {
    this.stop();
    this.resetToNextSession();
  }

  skipSession(): void {
    this.sessionComplete();
  }

  toggleSession(): void {
    if (this.state.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title
      this.a.label('Pomodoro Timer').withId('pomodoroTitle');

      this.a.spacer();

      // Session type display
      this.sessionLabel = this.a.label('Focus Session').withId('pomodoroSession');

      // Time display (large)
      this.displayLabel = this.a.label('25:00').withId('pomodoroDisplay');

      // Status
      this.statusLabel = this.a.label('Paused • 0 sessions').withId('pomodoroStatus');

      this.a.spacer();

      // Control buttons
      this.a.hbox(() => {
        this.startButton = this.a.button('Start')
          .onClick(() => this.toggleSession())
          .withId('pomodoroStartBtn');

        this.a.spacer();

        this.a.button('Reset')
          .onClick(() => this.reset())
          .withId('pomodoroResetBtn');

        this.a.button('Skip')
          .onClick(() => this.skipSession())
          .withId('pomodoroSkipBtn');
      });

      this.a.spacer();

      // Settings section
      this.a.label('Settings').withId('pomodoroSettingsTitle');

      // Work duration
      this.a.hbox(() => {
        this.a.label('Work:').withId('pomodoroWorkLabel');
        this.a.spacer();
        this.a.entry(this.state.workMinutes.toString(), (value) => {
          const mins = parseInt(value, 10) || 25;
          if (mins > 0 && mins <= 120) {
            this.state.workMinutes = mins;
            this.saveSettings();
          }
        }, 50).withId('pomodoroWorkInput');
        this.a.label('min').withId('pomodoroWorkUnit');
      });

      // Break duration
      this.a.hbox(() => {
        this.a.label('Break:').withId('pomodoroBreakLabel');
        this.a.spacer();
        this.a.entry(this.state.breakMinutes.toString(), (value) => {
          const mins = parseInt(value, 10) || 5;
          if (mins > 0 && mins <= 60) {
            this.state.breakMinutes = mins;
            this.saveSettings();
          }
        }, 50).withId('pomodoroBreakInput');
        this.a.label('min').withId('pomodoroBreakUnit');
      });

      // Long break duration
      this.a.hbox(() => {
        this.a.label('Long Break:').withId('pomodoroLongBreakLabel');
        this.a.spacer();
        this.a.entry(this.state.longBreakMinutes.toString(), (value) => {
          const mins = parseInt(value, 10) || 15;
          if (mins > 0 && mins <= 120) {
            this.state.longBreakMinutes = mins;
            this.saveSettings();
          }
        }, 50).withId('pomodoroLongBreakInput');
        this.a.label('min').withId('pomodoroLongBreakUnit');
      });
    });

    this.updateDisplay();
  }

  // Public methods for testing
  getState(): Readonly<PomodoroState> {
    return { ...this.state };
  }

  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Create the Pomodoro app
 */
export function buildPomodoroApp(a: App): PomodoroUI {
  const ui = new PomodoroUI(a);

  a.window({ title: 'Pomodoro', width: 400, height: 600 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport  } = require('../core/src');
  app(resolveTransport(), { title: 'Pomodoro' }, (a: App) => {
    buildPomodoroApp(a);
  });
}
