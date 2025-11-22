import { app } from '../src';

/**
 * Mouseable Demo - Demonstrates the desktop.Mouseable interface
 *
 * Shows: onMouseDown, onMouseUp
 * Use case: Drawing pad / click timing game
 */

app({ title: "Mouseable Demo" }, (a) => {
  a.window({ title: "Mouseable Demo - Click Timing", width: 550, height: 550 }, () => {
    // State tracking
    let clickStartTime: number | null = null;
    let totalClicks = 0;
    let longestHold = 0;
    let statusLabel: any;
    let holdTimeLabel: any;
    let statsLabel: any;
    let buttonStates: { [key: string]: boolean } = {};

    a.vbox(() => {
      a.label("=== Mouseable Interface Demo ===");
      a.label("Press and hold buttons - measure your click duration!");
      a.separator();

      // Status display
      statusLabel = a.label("Status: Ready - press a button!");
      holdTimeLabel = a.label("Hold time: 0ms");
      statsLabel = a.label("Stats: 0 clicks | Longest hold: 0ms");

      a.separator();
      a.label("Mouse Button Detection:");

      // Button to detect which mouse button
      const detectBtn = a.button("Click with any mouse button", () => {});

      detectBtn.onMouseDown((event) => {
        const buttonNames = ['Left', 'Middle', 'Right'];
        const buttonName = buttonNames[event.button - 1] || `Button ${event.button}`;
        statusLabel.setText(`Mouse DOWN: ${buttonName} button at (${event.position.x.toFixed(0)}, ${event.position.y.toFixed(0)})`);
        console.log(`MouseDown: Button ${event.button} (${buttonName}) at position (${event.position.x}, ${event.position.y})`);
      });

      detectBtn.onMouseUp((event) => {
        const buttonNames = ['Left', 'Middle', 'Right'];
        const buttonName = buttonNames[event.button - 1] || `Button ${event.button}`;
        statusLabel.setText(`Mouse UP: ${buttonName} button`);
        console.log(`MouseUp: Button ${event.button} (${buttonName})`);
      });

      a.separator();
      a.label("Click & Hold Timer:");

      // Timer button - measures how long you hold
      const timerBtn = a.button("Press and HOLD me!", () => {});

      timerBtn.onMouseDown((event) => {
        clickStartTime = Date.now();
        timerBtn.setText("HOLDING... release to measure!");
        statusLabel.setText("Holding button...");
        console.log(`Timer started at ${clickStartTime}`);
      });

      timerBtn.onMouseUp((event) => {
        if (clickStartTime !== null) {
          const holdDuration = Date.now() - clickStartTime;
          totalClicks++;

          if (holdDuration > longestHold) {
            longestHold = holdDuration;
          }

          timerBtn.setText(`Last hold: ${holdDuration}ms - Try again!`);
          holdTimeLabel.setText(`Hold time: ${holdDuration}ms`);
          statsLabel.setText(`Stats: ${totalClicks} clicks | Longest hold: ${longestHold}ms`);
          statusLabel.setText(`Released after ${holdDuration}ms`);

          console.log(`Timer ended - Hold duration: ${holdDuration}ms`);
          clickStartTime = null;
        }
      });

      a.separator();
      a.label("Drag Simulation (press tracking):");

      // Grid of buttons to simulate drag detection
      a.hbox(() => {
        for (let i = 1; i <= 5; i++) {
          const cellId = `drag_${i}`;
          buttonStates[cellId] = false;

          const dragBtn = a.button(`[${i}]`, () => {});

          dragBtn.onMouseDown((event) => {
            buttonStates[cellId] = true;
            dragBtn.setText(`[${i}]*`);

            // Check how many buttons are currently pressed
            const pressedCount = Object.values(buttonStates).filter(v => v).length;
            statusLabel.setText(`Pressed ${pressedCount} button(s) - simulating drag!`);
            console.log(`Drag cell ${i} pressed - ${pressedCount} total pressed`);
          });

          dragBtn.onMouseUp((event) => {
            buttonStates[cellId] = false;
            dragBtn.setText(`[${i}]`);

            const pressedCount = Object.values(buttonStates).filter(v => v).length;
            if (pressedCount === 0) {
              statusLabel.setText("All buttons released");
            } else {
              statusLabel.setText(`${pressedCount} button(s) still pressed`);
            }
            console.log(`Drag cell ${i} released`);
          });
        }
      });

      a.separator();

      // Reset button
      a.button("Reset Stats", () => {
        totalClicks = 0;
        longestHold = 0;
        clickStartTime = null;
        statsLabel.setText("Stats: 0 clicks | Longest hold: 0ms");
        holdTimeLabel.setText("Hold time: 0ms");
        statusLabel.setText("Stats reset!");
        console.log("Stats reset");
      });

      a.separator();
      a.label("Instructions:");
      a.label("• Click with different mouse buttons to detect");
      a.label("• Hold the timer button to measure duration");
      a.label("• Press multiple drag buttons simultaneously");
    });
  });
});

console.log("\n=== Mouseable Demo ===");
console.log("Demonstrates: desktop.Mouseable interface");
console.log("Methods: onMouseDown(), onMouseUp()");
console.log("========================\n");
