import { app, resolveTransport, window, vbox, hbox, grid, button, label, styles, FontStyle, enableAccessibility, disableAccessibility, getAccessibilityManager  } from '../core/src';
// In production: import { app, resolveTransport, window, vbox, hbox, grid, button, label, styles, FontStyle, enableAccessibility, disableAccessibility, getAccessibilityManager  } from 'tsyne';

/**
 * Accessible Calculator Example
 * Demonstrates TTS and accessibility features with toggle control
 */

// Define calculator styles
styles({
  label: {
    text_align: 'right',
    font_style: FontStyle.BOLD,
    font_size: 32
  },
  button: {
    font_size: 28
  },
  accessibilityToggle: {
    font_size: 16
  }
});

let display: any;
let currentValue = "0";
let operator: string | null = null;
let previousValue = "0";
let shouldResetDisplay = false;
let accessibilityManager: any;
let toggleButton: any;

function updateDisplay(value: string) {
  currentValue = value;
  if (display) {
    display.setText(value);
  }
  // Announce display value when accessibility is enabled
  if (accessibilityManager?.isEnabled()) {
    accessibilityManager.announce(`Display shows ${value}`);
  }
}

function handleNumber(num: string) {
  // Announce the number press
  if (accessibilityManager?.isEnabled()) {
    accessibilityManager.announce(`${num}`);
  }

  if (shouldResetDisplay) {
    updateDisplay(num);
    shouldResetDisplay = false;
  } else {
    const newValue = currentValue === "0" ? num : currentValue + num;
    updateDisplay(newValue);
  }
}

function handleOperator(op: string, label: string) {
  // Announce the operator
  if (accessibilityManager?.isEnabled()) {
    accessibilityManager.announce(label);
  }

  if (operator && !shouldResetDisplay) {
    calculate();
  }
  previousValue = currentValue;
  operator = op;
  shouldResetDisplay = true;
}

function calculate() {
  const prev = parseFloat(previousValue);
  const current = parseFloat(currentValue);
  if (!operator) return;

  const result = eval(`${prev} ${operator} ${current}`);
  const displayValue = isFinite(result) ? result.toString() : "Error";

  // Announce the result
  if (accessibilityManager?.isEnabled()) {
    if (displayValue === "Error") {
      accessibilityManager.announce("Error: Invalid calculation");
    } else {
      accessibilityManager.announce(`Result is ${displayValue}`);
    }
  }

  updateDisplay(displayValue);
  operator = null;
  shouldResetDisplay = true;
}

function clear() {
  // Announce clear action
  if (accessibilityManager?.isEnabled()) {
    accessibilityManager.announce("Display cleared");
  }

  currentValue = "0";
  previousValue = "0";
  operator = null;
  shouldResetDisplay = false;
  updateDisplay("0");
}

function toggleAccessibility() {
  if (!accessibilityManager) return;

  accessibilityManager.toggle();

  if (toggleButton) {
    const status = accessibilityManager.isEnabled() ? "ON" : "OFF";
    toggleButton.setText(`Accessibility: ${status}`);
  }
}

// Build the accessible calculator UI
export function buildAccessibleCalculator(a: any) {
  a.window({ title: "Accessible Calculator" }, () => {
    a.vbox(() => {
      // Accessibility toggle at the top
      a.hbox(() => {
        toggleButton = a.button("Accessibility: OFF").onClick(() => toggleAccessibility(), "accessibilityToggle")
          .withId('accessibilityToggle')
          .accessibility({
            label: "Accessibility Toggle",
            description: "Enable or disable text-to-speech announcements",
            role: "button",
            hint: "Click to toggle accessibility on or off"
          });
      });

      // Display with accessibility
      display = a.label("0")
        .withId('display')
        .accessibility({
          label: "Calculator Display",
          description: "Shows the current value or result",
          role: "status"
        });

      // Number pad and operators - 4x4 grid
      a.grid(4, () => {
        // Row 1: 7, 8, 9, ÷
        [..."789"].forEach(n =>
          a.button(n).onClick(() => handleNumber(n))
            .withId(`btn${n}`)
            .accessibility({
              label: `Number ${n}`,
              description: `Enter ${n}`,
              role: "button"
            })
        );
        a.button("÷", "divide").onClick(() => handleOperator("/"))
          .withId('btnDivide')
          .accessibility({
            label: "Divide",
            description: "Division operator",
            role: "button"
          });

        // Row 2: 4, 5, 6, ×
        [..."456"].forEach(n =>
          a.button(n).onClick(() => handleNumber(n))
            .withId(`btn${n}`)
            .accessibility({
              label: `Number ${n}`,
              description: `Enter ${n}`,
              role: "button"
            })
        );
        a.button("×", "multiply").onClick(() => handleOperator("*"))
          .withId('btnMultiply')
          .accessibility({
            label: "Multiply",
            description: "Multiplication operator",
            role: "button"
          });

        // Row 3: 1, 2, 3, -
        [..."123"].forEach(n =>
          a.button(n).onClick(() => handleNumber(n))
            .withId(`btn${n}`)
            .accessibility({
              label: `Number ${n}`,
              description: `Enter ${n}`,
              role: "button"
            })
        );
        a.button("-", "subtract").onClick(() => handleOperator("-"))
          .withId('btnSubtract')
          .accessibility({
            label: "Subtract",
            description: "Subtraction operator",
            role: "button"
          });

        // Row 4: 0, Clear, =, +
        a.button("0").onClick(() => handleNumber("0"))
          .withId('btn0')
          .accessibility({
            label: "Number 0",
            description: "Enter 0",
            role: "button"
          });
        a.button("Clr").onClick(() => clear())
          .withId('btnClear')
          .accessibility({
            label: "Clear",
            description: "Clear the calculator display",
            role: "button",
            hint: "Resets all values to zero"
          });
        a.button("=").onClick(() => calculate())
          .withId('btnEquals')
          .accessibility({
            label: "Equals",
            description: "Calculate the result",
            role: "button",
            hint: "Press to see the result"
          });
        a.button("+", "add").onClick(() => handleOperator("+"))
          .withId('btnAdd')
          .accessibility({
            label: "Add",
            description: "Addition operator",
            role: "button"
          });
      });
    });
  });
}

// Run directly when executed as main script
if (require.main === module) {
  const myApp = app(resolveTransport(), { title: "Accessible Calculator" }, buildAccessibleCalculator);

  // Get the accessibility manager and store it globally
  accessibilityManager = getAccessibilityManager((myApp as any).ctx);

  // Announce that the app is ready
// console.log("\n=== Accessible Calculator ===");
// console.log("Click 'Accessibility: OFF' to enable text-to-speech");
// console.log("All button presses and results will be announced");
// console.log("===============================\n");
}
