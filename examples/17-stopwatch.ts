// @tsyne-app:name Stopwatch
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M12 5V3"/><path d="M10 3h4"/><path d="M18 7l1.5-1.5"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildStopwatch

// Stopwatch - Precise time tracking with lap times
// Demonstrates timers, state management, and dynamic lists

import { app, resolveTransport, App, Window  } from '../core/src';

export function buildStopwatch(a: App) {
  a.window({ title: 'Stopwatch', width: 350, height: 450 }, (win: Window) => {
    let startTime = 0;
    let elapsedTime = 0;
    let timerInterval: NodeJS.Timeout | null = null;
    let isRunning = false;
    let laps: string[] = [];
    let timeLabel: any;
    let lapContainer: any;

    function formatTime(ms: number): string {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const milliseconds = Math.floor((ms % 1000) / 10);

      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    function updateDisplay() {
      const currentTime = isRunning
        ? elapsedTime + (Date.now() - startTime)
        : elapsedTime;

      if (timeLabel) {
        timeLabel.setText(formatTime(currentTime));
      }
    }

    function start() {
      if (!isRunning) {
        isRunning = true;
        startTime = Date.now();
        timerInterval = setInterval(updateDisplay, 10);
      }
    }

    function stop() {
      if (isRunning) {
        isRunning = false;
        elapsedTime += Date.now() - startTime;
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        updateDisplay();
      }
    }

    function reset() {
      stop();
      elapsedTime = 0;
      laps = [];
      updateDisplay();
      rebuildLaps();
    }

    function lap() {
      if (isRunning) {
        const currentTime = elapsedTime + (Date.now() - startTime);
        laps.unshift(`Lap ${laps.length + 1}: ${formatTime(currentTime)}`);
        rebuildLaps();
      }
    }

    function rebuildLaps() {
      if (!lapContainer) return;

      // Clear existing lap display - we'll rebuild it
      // In a more advanced version, we could use ModelBoundList for this
      win.setContent(() => {
        a.vbox(() => {
          a.label('⏱️ Stopwatch ⏱️');
          a.separator();

          // Time display
          timeLabel = a.label(formatTime(elapsedTime));

          a.separator();

          // Control buttons
          a.hbox(() => {
            a.button('Start').onClick(start);
            a.button('Stop').onClick(stop);
            a.button('Lap').onClick(lap);
            a.button('Reset').onClick(reset);
          });

          a.separator();

          // Lap times
          if (laps.length > 0) {
            a.label('Lap Times:');
            a.scroll(() => {
              lapContainer = a.vbox(() => {
                laps.forEach((lapTime) => {
                  a.label(lapTime);
                });
              });
            });
          } else {
            lapContainer = a.label('No laps recorded');
          }
        });
      });
    }

    win.setContent(() => {
      a.vbox(() => {
        a.label('⏱️ Stopwatch ⏱️');
        a.separator();

        // Time display
        timeLabel = a.label('00:00.00');

        a.separator();

        // Control buttons
        a.hbox(() => {
          a.button('Start').onClick(start);
          a.button('Stop').onClick(stop);
          a.button('Lap').onClick(lap);
          a.button('Reset').onClick(reset);
        });

        a.separator();

        // Lap times
        lapContainer = a.label('No laps recorded');
      });
    });

    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app(resolveTransport(), { title: 'Stopwatch' }, buildStopwatch);
}
