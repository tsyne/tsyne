// @tsyne-app:name Calculator
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="12" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>
// @tsyne-app:category utilities

import { app, styles, FontStyle, App, Window, Label } from '../src';
// In production: import { app, styles, FontStyle, App, Window, Label } from 'tsyne';

// Calculator example demonstrating Tsyne's pseudo-declarative DSL
// Pattern described at https://paulhammant.com/2024/02/14/that-ruby-and-groovy-language-feature/

// Define calculator styles
styles({
  label: {
    text_align: 'right',
    font_style: FontStyle.BOLD,
    font_size: 32  // 2x bigger for display
  },
  button: {
    font_size: 28  // 2x bigger for buttons
  }
});

// Calculator state
let display: Label | undefined;
let currentValue = "0";
let operator: string | null = null;
let previousValue = "0";
let shouldResetDisplay = false;

function updateDisplay(value: string) {
  currentValue = value;
  if (display) {
    display.setText(value);
  }
}

function handleNumber(num: string) {
  if (shouldResetDisplay) {
    updateDisplay(num);
    shouldResetDisplay = false;
  } else {
    const newValue = currentValue === "0" ? num : currentValue + num;
    updateDisplay(newValue);
  }
}

function handleOperator(op: string) {
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
  updateDisplay(isFinite(result) ? result.toString() : "Error");
  operator = null;
  shouldResetDisplay = true;
}

function clear() {
  currentValue = "0";
  previousValue = "0";
  operator = null;
  shouldResetDisplay = false;
  updateDisplay("0");
}

// Build the calculator UI (exported for testing)
export function buildCalculator(a: App) {
  a.window({ title: "Calculator" }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Display
        display = a.label("0").withId('calc-display');

        // Number pad and operators - 4x4 grid for even button sizing
        a.grid(4, () => {
          [..."789"].forEach(n => a.button(n).onClick(() => handleNumber(n)));
          a.button("÷").onClick(() => handleOperator("/"));
          [..."456"].forEach(n => a.button(n).onClick(() => handleNumber(n)));
          a.button("×").onClick(() => handleOperator("*"));
          [..."123"].forEach(n => a.button(n).onClick(() => handleNumber(n)));
          a.button("-").onClick(() => handleOperator("-"));
          a.button("0").onClick(() => handleNumber("0"));
          a.button("Clr").onClick(() => clear());
          a.button("=").onClick(() => calculate());
          a.button("+").onClick(() => handleOperator("+"));
        });
      });
    });
  });
}

// Skip auto-run when imported by test framework (Jest sets NODE_ENV=test)
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  // Run the calculator - executes when loaded by designer or run directly
  app({ title: "Tsyne Calculator" }, buildCalculator);
}
