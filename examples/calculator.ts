import { app, styles, FontStyle } from '../src';
// In production: import { app, styles, FontStyle } from 'tsyne';

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
let display: any;
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
export function buildCalculator(a: any) {
  a.window({ title: "Calculator" }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Display
        display = a.label("0");

        // Number pad and operators - 4x4 grid for even button sizing
        a.grid(4, () => {
          [..."789"].forEach(n => a.button(n, () => handleNumber(n)));
          a.button("÷", () => handleOperator("/"));
          [..."456"].forEach(n => a.button(n, () => handleNumber(n)));
          a.button("×", () => handleOperator("*"));
          [..."123"].forEach(n => a.button(n, () => handleNumber(n)));
          a.button("-", () => handleOperator("-"));
          a.button("0", () => handleNumber("0"));
          a.button("Clr", () => clear());
          a.button("=", () => calculate());
          a.button("+", () => handleOperator("+"));
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
