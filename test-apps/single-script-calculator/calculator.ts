import { app } from '../../src';

/**
 * Simple Calculator - Monolithic Implementation
 *
 * PROS:
 * - Simple and straightforward
 * - All code in one place
 * - Easy to understand for beginners
 * - Quick to prototype
 * - No abstraction overhead
 *
 * CONS:
 * - Business logic mixed with UI
 * - Cannot unit test logic separately
 * - Slower tests (must use JyneTest for everything)
 * - Harder to maintain as it grows
 * - Cannot reuse logic in different UIs
 *
 * WHEN TO USE:
 * - Small applications
 * - Prototypes and demos
 * - Simple UI tools
 * - Learning/educational examples
 */

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

function handleDecimal() {
  if (shouldResetDisplay) {
    updateDisplay("0.");
    shouldResetDisplay = false;
  } else if (!currentValue.includes(".")) {
    updateDisplay(currentValue + ".");
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
  if (!operator) {
    return;
  }

  const prev = parseFloat(previousValue);
  const current = parseFloat(currentValue);
  let result = 0;

  switch (operator) {
    case '+':
      result = prev + current;
      break;
    case '-':
      result = prev - current;
      break;
    case '×':
      result = prev * current;
      break;
    case '÷':
      if (current === 0) {
        updateDisplay("Error");
        operator = null;
        shouldResetDisplay = true;
        return;
      }
      result = prev / current;
      break;
    default:
      return;
  }

  const resultStr = Number.isInteger(result)
    ? result.toString()
    : result.toFixed(8).replace(/\.?0+$/, '');

  updateDisplay(resultStr);
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
  app.window({ title: "Calculator - Monolithic" }, () => {
    app.vbox(() => {
      display = app.label("0");

      app.hbox(() => {
        app.button("7", () => handleNumber("7"));
        app.button("8", () => handleNumber("8"));
        app.button("9", () => handleNumber("9"));
        app.button("÷", () => handleOperator("÷"));
      });

      app.hbox(() => {
        app.button("4", () => handleNumber("4"));
        app.button("5", () => handleNumber("5"));
        app.button("6", () => handleNumber("6"));
        app.button("×", () => handleOperator("×"));
      });

      app.hbox(() => {
        app.button("1", () => handleNumber("1"));
        app.button("2", () => handleNumber("2"));
        app.button("3", () => handleNumber("3"));
        app.button("-", () => handleOperator("-"));
      });

      app.hbox(() => {
        app.button("0", () => handleNumber("0"));
        app.button(".", () => handleDecimal());
        app.button("Clr", () => clear());
        app.button("+", () => handleOperator("+"));
      });

      app.hbox(() => {
        app.button("=", () => calculate());
      });
    });
  });
}

// Run directly when executed as main script
if (require.main === module) {
  app({ title: "Simple Calculator" }, (appInstance) => {
    buildCalculator(appInstance);
  });
}
