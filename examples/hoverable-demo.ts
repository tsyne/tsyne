import { app } from '../src';

/**
 * Hoverable Demo - Demonstrates the desktop.Hoverable interface
 *
 * Shows: onMouseIn, onMouseMoved, onMouseOut
 * Use case: Interactive heat map / hover tracking visualization
 */

app({ title: "Hoverable Demo" }, (a) => {
  a.window({ title: "Hoverable Demo - Heat Map", width: 600, height: 500 }, () => {
    // State tracking
    const hoverCounts: { [key: string]: number } = {};
    const lastPositions: { [key: string]: { x: number, y: number } } = {};
    let statusLabel: any;
    let positionLabel: any;

    a.vbox(() => {
      a.label("=== Hoverable Interface Demo ===");
      a.label("Hover over buttons to 'heat them up' - more hovers = hotter!");
      a.separator();

      // Status display
      statusLabel = a.label("Status: Waiting for hover...");
      positionLabel = a.label("Position: (-, -)");

      a.separator();

      // Create a 3x3 grid of hoverable buttons
      a.grid(3, () => {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const cellId = `cell_${row}_${col}`;
            hoverCounts[cellId] = 0;

            const btn = a.button(`Cell ${row},${col}`, () => {
              console.log(`Clicked ${cellId} (hover count: ${hoverCounts[cellId]})`);
            });

            btn.onMouseIn((event) => {
              hoverCounts[cellId]++;
              lastPositions[cellId] = event.position;

              // Update status
              statusLabel.setText(`Status: Entered ${cellId}`);
              positionLabel.setText(`Position: (${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)})`);

              // Update button text to show heat level
              const heat = Math.min(hoverCounts[cellId], 10);
              const heatIndicator = '🔥'.repeat(Math.min(heat, 5)) || '❄️';
              btn.setText(`${heatIndicator} (${hoverCounts[cellId]})`);

              console.log(`[${cellId}] MouseIn at (${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)}) - Total hovers: ${hoverCounts[cellId]}`);
            });

            btn.onMouseMoved((event) => {
              lastPositions[cellId] = event.position;
              positionLabel.setText(`Position: (${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)})`);
            });

            btn.onMouseOut(() => {
              statusLabel.setText(`Status: Exited ${cellId}`);
              console.log(`[${cellId}] MouseOut - Final hover count: ${hoverCounts[cellId]}`);
            });
          }
        }
      });

      a.separator();

      // Reset button
      a.button("Reset Heat Map", () => {
        for (const cellId in hoverCounts) {
          hoverCounts[cellId] = 0;
        }
        statusLabel.setText("Status: Heat map reset!");
        console.log("Heat map reset - all cells cooled down");
      });

      a.separator();
      a.label("Instructions:");
      a.label("• Hover over cells to increase their 'heat'");
      a.label("• Watch the position update as you move");
      a.label("• More hovers = more fire emojis!");
    });
  });
});

console.log("\n=== Hoverable Demo ===");
console.log("Demonstrates: desktop.Hoverable interface");
console.log("Methods: onMouseIn(), onMouseMoved(), onMouseOut()");
console.log("========================\n");
