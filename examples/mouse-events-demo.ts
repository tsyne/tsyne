import { app, resolveTransport  } from 'tsyne';

/**
 * Demonstrates the four mouse event methods:
 * - .onMouseIn()
 * - .onMouseMoved()
 * - .onMouseOut()
 * - .onMouse({...})
 */

app(resolveTransport(), { title: "Mouse Events Demo" }, (a) => {
  a.window({ title: "Mouse Events Demo", width: 500, height: 400 }, () => {
    a.vbox(() => {
      a.label("=== Mouse Events Demo ===");
      a.separator();

      a.label("Hover over the buttons below and watch the console:");

      // Example 1: Individual event methods
      a.button("Individual Events").onClick(() => console.log("Clicked!"))
        .onMouseIn((e) => {
          console.log(`[Individual] Mouse IN at (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`);
        })
        .onMouseMoved((e) => {
          console.log(`[Individual] Mouse MOVED to (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`);
        })
        .onMouseOut(() => {
          console.log('[Individual] Mouse OUT');
        });

      a.separator();

      // Example 2: Combined .onMouse() method
      a.button("Combined Events").onClick(() => console.log("Clicked!"))
        .onMouse({
          in: (e) => console.log(`[Combined] IN at (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`),
          moved: (e) => console.log(`[Combined] MOVED to (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`),
          out: () => console.log('[Combined] OUT')
        });

      a.separator();

      // Example 3: Selective - only onMouseIn and onMouseOut
      a.button("Enter/Exit Only").onClick(() => console.log("Clicked!"))
        .onMouse({
          in: () => console.log('[Selective] Mouse entered'),
          out: () => console.log('[Selective] Mouse exited')
          // Note: no 'moved' handler
        });

      a.separator();

      // Example 4: With accessibility
      a.button("With Accessibility").onClick(() => console.log("Clicked!"))
        .onMouseIn((e) => console.log(`[Accessible] IN at (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`))
        .onMouseOut(() => console.log('[Accessible] OUT'))
        .accessibility({
          label: 'Accessible Button',
          description: 'This button has both custom mouse events and accessibility',
          hint: 'Hover to see mouse events and accessibility announcements'
        });

      a.separator();
      a.label("Instructions:");
      a.label("• Move your mouse over the buttons");
      a.label("• Watch the console for event logs");
      a.label("• Notice position coordinates in onMouseIn and onMouseMoved");
    });
  });
});

console.log("\n=== Mouse Events Demo ===");
console.log("Hover over the buttons to see mouse events in action");
console.log("Events demonstrated:");
console.log("✓ onMouseIn(callback) - Mouse enters");
console.log("✓ onMouseMoved(callback) - Mouse moves within");
console.log("✓ onMouseOut(callback) - Mouse exits");
console.log("✓ onMouse({in, moved, out}) - Combined");
console.log("========================\n");
