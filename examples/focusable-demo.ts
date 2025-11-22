import { app } from '../src';

/**
 * Focusable Demo - Demonstrates the fyne.Focusable interface (required for Keyable)
 *
 * Shows: onFocusChange(), focus()
 * Use case: Focus tracking / form navigation indicator
 */

app({ title: "Focusable Demo" }, (a) => {
  a.window({ title: "Focusable Demo - Focus Tracker", width: 550, height: 500 }, () => {
    // State tracking
    let currentFocus: string | null = null;
    let focusHistory: string[] = [];
    let focusCount = 0;

    let statusLabel: any;
    let historyLabel: any;
    let statsLabel: any;
    const buttonLabels: { [key: string]: any } = {};

    a.vbox(() => {
      a.label("=== Focusable Interface Demo ===");
      a.label("Click buttons to change focus - watch focus tracking!");
      a.separator();

      // Status display
      statusLabel = a.label("Focus: None");
      historyLabel = a.label("Focus history: (empty)");
      statsLabel = a.label("Focus changes: 0");

      a.separator();
      a.label("Form Fields (click to focus):");

      // Simulated form fields as buttons
      const fields = ['Username', 'Email', 'Password', 'Confirm'];

      fields.forEach((field, index) => {
        const btn = a.button(`[${index + 1}] ${field}`, () => {
          console.log(`${field} button clicked`);
        });

        buttonLabels[field] = btn;

        btn.onFocusChange((event) => {
          if (event.focused) {
            // This button gained focus
            currentFocus = field;
            focusCount++;

            // Add to history (keep last 10)
            focusHistory.push(field);
            if (focusHistory.length > 10) {
              focusHistory.shift();
            }

            // Update displays
            statusLabel.setText(`Focus: ${field} (field ${index + 1} of ${fields.length})`);
            historyLabel.setText(`Focus history: ${focusHistory.join(' -> ')}`);
            statsLabel.setText(`Focus changes: ${focusCount}`);

            // Update button text to show focus state
            btn.setText(`[${index + 1}] ${field} *FOCUSED*`);

            console.log(`Focus gained: ${field}`);
          } else {
            // This button lost focus
            btn.setText(`[${index + 1}] ${field}`);
            console.log(`Focus lost: ${field}`);
          }
        });
      });

      a.separator();
      a.label("Focus Navigation Buttons:");

      a.hbox(() => {
        // Programmatic focus buttons
        fields.forEach((field) => {
          a.button(`Focus ${field}`, async () => {
            const btn = buttonLabels[field];
            if (btn) {
              await btn.focus();
              console.log(`Programmatically focused: ${field}`);
            }
          });
        });
      });

      a.separator();
      a.label("Focus Ring Demo:");

      // Visual focus ring simulation
      a.hbox(() => {
        for (let i = 1; i <= 4; i++) {
          const ringBtn = a.button(`Tab ${i}`, () => {
            console.log(`Tab ${i} activated`);
          });

          ringBtn.onFocusChange((event) => {
            if (event.focused) {
              ringBtn.setText(`[Tab ${i}]`); // Simulated focus ring with brackets
              statusLabel.setText(`Tab ${i} focused`);
            } else {
              ringBtn.setText(`Tab ${i}`);
            }
          });
        }
      });

      a.separator();
      a.label("Focus Chain Game:");
      a.label("Try to focus all buttons in order: A -> B -> C -> D");

      let gameProgress: string[] = [];
      let gameLabel: any;
      const targetSequence = ['A', 'B', 'C', 'D'];

      gameLabel = a.label("Progress: (none)");

      a.hbox(() => {
        targetSequence.forEach((letter) => {
          const gameBtn = a.button(letter, () => {
            console.log(`Game button ${letter} clicked`);
          });

          gameBtn.onFocusChange((event) => {
            if (event.focused) {
              gameProgress.push(letter);

              // Check if correct sequence
              const isCorrect = gameProgress.every((l, idx) => l === targetSequence[idx]);

              if (!isCorrect) {
                gameLabel.setText("Progress: Wrong order! Start again...");
                gameProgress = [];
              } else if (gameProgress.length === targetSequence.length) {
                gameLabel.setText("Progress: A -> B -> C -> D - YOU WIN!");
                console.log("Focus game won!");
              } else {
                gameLabel.setText(`Progress: ${gameProgress.join(' -> ')}`);
              }
            }
          });
        });
      });

      a.separator();

      // Reset button
      a.button("Reset Demo", () => {
        currentFocus = null;
        focusHistory = [];
        focusCount = 0;
        gameProgress = [];

        statusLabel.setText("Focus: None");
        historyLabel.setText("Focus history: (empty)");
        statsLabel.setText("Focus changes: 0");
        gameLabel.setText("Progress: (none)");

        // Reset form field buttons
        fields.forEach((field, index) => {
          buttonLabels[field].setText(`[${index + 1}] ${field}`);
        });

        console.log("Focus demo reset");
      });

      a.separator();
      a.label("Instructions:");
      a.label("• Click buttons to focus them");
      a.label("• Use Tab key to navigate focus");
      a.label("• Watch the focus history build up");
      a.label("• Try the focus chain game!");
    });
  });
});

console.log("\n=== Focusable Demo ===");
console.log("Demonstrates: fyne.Focusable interface");
console.log("Methods: onFocusChange(), focus()");
console.log("========================\n");
