import { app, window, vbox, grid, button, label, styles, FontStyle } from '../src';
// In production: import { app, window, vbox, grid, button, label, styles, FontStyle } from 'tsyne';

// Calculator example demonstrating Tsyne's declarative DSL
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

  // Handle division by zero
  if (operator === '/' && current === 0) {
    updateDisplay("Error");
    operator = null;
    shouldResetDisplay = true;
    return;
  }

  const result = eval(`${prev} ${operator} ${current}`);

  updateDisplay(result.toString());
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
export function buildCalculator(app: any) {
  app.window({ title: "Calculator" }, () => {
    app.vbox(() => {
      // Display
      display = app.label("0");

      // Number pad and operators - 4x4 grid for even button sizing
      app.grid(4, () => {
        app.button("7", () => handleNumber("7"));
        app.button("8", () => handleNumber("8"));
        app.button("9", () => handleNumber("9"));
        app.button("÷", () => handleOperator("/"));
        app.button("4", () => handleNumber("4"));
        app.button("5", () => handleNumber("5"));
        app.button("6", () => handleNumber("6"));
        app.button("×", () => handleOperator("*"));
        app.button("1", () => handleNumber("1"));
        app.button("2", () => handleNumber("2"));
        app.button("3", () => handleNumber("3"));
        app.button("-", () => handleOperator("-"));
        app.button("0", () => handleNumber("0"));
        app.button("Clr", () => clear());
        app.button("=", () => calculate());
        app.button("+", () => handleOperator("+"));
      });
    });
  });
}

// Run directly when executed as main script
if (require.main === module) {
  app({ title: "Tsyne Calculator" }, buildCalculator);
}
