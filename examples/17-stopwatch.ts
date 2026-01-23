// @tsyne-app:name Stopwatch
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M4.5 10h1.5M4 11v2M6.5 11v2M4 14.5v2M6.5 14.5v2M4.5 17h1.5"/><path d="M8 10h1.5M7.5 11v2M9.5 11v2M7.5 14.5v2M9.5 14.5v2M8 17h1.5"/><circle cx="11" cy="12" r="0.4" fill="currentColor"/><circle cx="11" cy="15.5" r="0.4" fill="currentColor"/><path d="M12.5 10h1.5M12 11v2M14.5 11v2M12 14.5v2M14.5 14.5v2M12.5 17h1.5"/><path d="M16 10h1.5M15.5 11v2M18 11v2M15.5 14.5v2M18 14.5v2M16 17h1.5"/></g><circle cx="19" cy="4" r="1.5"/><path d="M19 2v1"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildStopwatch

// Stopwatch - Precise time tracking with lap times
// Demonstrates timers, state management, and dynamic lists

import { app, resolveTransport, App, Window  } from 'tsyne';

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

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Stopwatch' }, buildStopwatch);
}
