import { app } from '../src';

/**
 * Cursorable Demo - Demonstrates the desktop.Cursorable interface
 *
 * Shows: setCursor()
 * Use case: UI hint system showing different cursor types for different actions
 */

app({ title: "Cursorable Demo" }, (a) => {
  a.window({ title: "Cursorable Demo - Cursor Gallery", width: 500, height: 500 }, () => {
    let statusLabel: any;

    a.vbox(() => {
      a.label("=== Cursorable Interface Demo ===");
      a.label("Hover over buttons to see different cursor types!");
      a.separator();

      // Status display
      statusLabel = a.label("Current cursor: default");

      a.separator();
      a.label("Standard Cursor Types:");

      // Default cursor
      a.button("Default Cursor", () => {
        console.log("Default cursor button clicked");
      }).setCursor('default')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: default (normal arrow pointer)");
        });

      // Text cursor (I-beam)
      a.button("Text Cursor (I-beam) - for text input", () => {
        console.log("Text cursor button clicked");
      }).setCursor('text')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: text (I-beam for text selection)");
        });

      // Crosshair cursor
      a.button("Crosshair Cursor - for precision", () => {
        console.log("Crosshair cursor button clicked");
      }).setCursor('crosshair')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: crosshair (precision targeting)");
        });

      // Pointer cursor (hand)
      a.button("Pointer Cursor (Hand) - for links", () => {
        console.log("Pointer cursor button clicked");
      }).setCursor('pointer')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: pointer (clickable link/button)");
        });

      // Horizontal resize cursor
      a.button("H-Resize Cursor - horizontal resize", () => {
        console.log("H-Resize cursor button clicked");
      }).setCursor('hResize')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: hResize (drag left/right)");
        });

      // Vertical resize cursor
      a.button("V-Resize Cursor - vertical resize", () => {
        console.log("V-Resize cursor button clicked");
      }).setCursor('vResize')
        .onMouseIn(() => {
          statusLabel.setText("Current cursor: vResize (drag up/down)");
        });

      a.separator();
      a.label("Practical Examples:");

      // Simulated toolbar with contextual cursors
      a.hbox(() => {
        // Text tool
        a.button("T", () => {
          console.log("Text tool selected");
        }).setCursor('text')
          .onMouseIn(() => {
            statusLabel.setText("Text Tool - click to add text");
          });

        // Selection/pointer tool
        a.button("S", () => {
          console.log("Select tool selected");
        }).setCursor('pointer')
          .onMouseIn(() => {
            statusLabel.setText("Select Tool - click to select items");
          });

        // Precision/crosshair tool
        a.button("+", () => {
          console.log("Precision tool selected");
        }).setCursor('crosshair')
          .onMouseIn(() => {
            statusLabel.setText("Precision Tool - for exact positioning");
          });

        // Width resize handle
        a.button("|", () => {
          console.log("Width handle dragged");
        }).setCursor('hResize')
          .onMouseIn(() => {
            statusLabel.setText("Resize Handle - drag to adjust width");
          });

        // Height resize handle
        a.button("=", () => {
          console.log("Height handle dragged");
        }).setCursor('vResize')
          .onMouseIn(() => {
            statusLabel.setText("Resize Handle - drag to adjust height");
          });
      });

      a.separator();
      a.label("Simulated Panel Resizers:");

      a.hbox(() => {
        // Left panel border
        a.button("[ Left Border ]", () => {
          console.log("Resizing left panel");
        }).setCursor('hResize')
          .onMouseIn(() => {
            statusLabel.setText("Drag to resize left panel");
          });

        // Right panel border
        a.button("[ Right Border ]", () => {
          console.log("Resizing right panel");
        }).setCursor('hResize')
          .onMouseIn(() => {
            statusLabel.setText("Drag to resize right panel");
          });
      });

      a.hbox(() => {
        // Top border
        a.button("[ Top Border ]", () => {
          console.log("Resizing top panel");
        }).setCursor('vResize')
          .onMouseIn(() => {
            statusLabel.setText("Drag to resize top panel");
          });

        // Bottom border
        a.button("[ Bottom Border ]", () => {
          console.log("Resizing bottom panel");
        }).setCursor('vResize')
          .onMouseIn(() => {
            statusLabel.setText("Drag to resize bottom panel");
          });
      });

      a.separator();
      a.label("Available cursor types:");
      a.label("• default - Standard arrow pointer");
      a.label("• text - I-beam for text editing");
      a.label("• crosshair - Precision targeting");
      a.label("• pointer - Hand for clickable items");
      a.label("• hResize - Horizontal resize arrows");
      a.label("• vResize - Vertical resize arrows");
    });
  });
});

console.log("\n=== Cursorable Demo ===");
console.log("Demonstrates: desktop.Cursorable interface");
console.log("Method: setCursor()");
console.log("Cursor types: default, text, crosshair, pointer, hResize, vResize");
console.log("========================\n");
