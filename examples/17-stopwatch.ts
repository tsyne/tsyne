// Stopwatch - Precise time tracking with lap times
// Demonstrates timers, state management, and dynamic lists

import { app } from '../src';

app({ title: 'Stopwatch' }, (a) => {
  a.window({ title: 'Stopwatch', width: 350, height: 450 }, (win) => {
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
            a.button('Start', start);
            a.button('Stop', stop);
            a.button('Lap', lap);
            a.button('Reset', reset);
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
          a.button('Start', start);
          a.button('Stop', stop);
          a.button('Lap', lap);
          a.button('Reset', reset);
        });

        a.separator();

        // Lap times
        lapContainer = a.label('No laps recorded');
      });
    });

    win.show();
  });
});
