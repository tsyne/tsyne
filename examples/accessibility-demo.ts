import { app, window, vbox, button, label, enableAccessibility, disableAccessibility, getAccessibilityManager } from '../core/src';
// In production: import { app, window, vbox, button, label, enableAccessibility, disableAccessibility, getAccessibilityManager } from 'tsyne';

/**
 * Simple Accessibility Demo
 * Shows basic TTS functionality with enable/disable control
 */

let statusLabel: any;
let manager: any;

function announceMessage(message: string) {
  if (manager?.isEnabled()) {
    manager.announce(message);
  }
}

function toggleAccessibility() {
  if (!manager) return;

  manager.toggle();

  const status = manager.isEnabled() ? "ENABLED" : "DISABLED";
  if (statusLabel) {
    statusLabel.setText(`Accessibility: ${status}`);
  }

  announceMessage(manager.isEnabled() ? "Accessibility enabled" : "Accessibility disabled");
}

export function buildAccessibilityDemo(a: any) {
  a.window({ title: "Accessibility Demo" }, () => {
    a.vbox(() => {
      // Status display
      statusLabel = a.label("Accessibility: DISABLED")
        .withId('status');

      // Toggle button
      a.button("Toggle Accessibility").onClick(() => toggleAccessibility())
        .withId('toggleBtn')
        .accessibility({
          label: "Toggle Accessibility",
          description: "Turn text-to-speech on or off",
          role: "button"
        });

      // Example buttons with announcements
      a.button("Say Hello").onClick(() => announceMessage("Hello from Tsyne!"))
        .withId('helloBtn')
        .accessibility({
          label: "Say Hello Button",
          description: "Announces a greeting",
          role: "button"
        });

      a.button("Say Goodbye").onClick(() => announceMessage("Goodbye! Have a great day!"))
        .withId('goodbyeBtn')
        .accessibility({
          label: "Say Goodbye Button",
          description: "Announces a farewell",
          role: "button"
        });

      a.button("Announce Time").onClick(() => {
        const time = new Date().toLocaleTimeString();
        announceMessage(`The current time is ${time}`);
      })
        .withId('timeBtn')
        .accessibility({
          label: "Announce Time Button",
          description: "Speaks the current time",
          role: "button"
        });
    });
  });
}

// Run directly when executed as main script
if (require.main === module) {
  const myApp = app({ title: "Accessibility Demo" }, buildAccessibilityDemo);

  // Get the accessibility manager
  manager = getAccessibilityManager((myApp as any).ctx);

  console.log("\n=== Accessibility Demo ===");
  console.log("1. Click 'Toggle Accessibility' to enable TTS");
  console.log("2. Click any button to hear announcements");
  console.log("3. All announcements appear in the console too");
  console.log("==========================\n");
}
