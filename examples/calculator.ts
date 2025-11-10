import { app, window, vbox, hbox, button, label, entry } from '../src';

// Calculator example inspired by the Ruby Shoes style from Paul's blog
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
      result = prev / current;
      break;
    default:
      return;
  }

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

// Build the calculator UI with elegant, terse syntax
app({ title: "Tsyne Calculator" }, () => {
  window({ title: "Calculator" }, () => {
    vbox(() => {
      // Display
      display = label("0");

      // Number pad and operators
      hbox(() => {
        button("7", () => handleNumber("7"));
        button("8", () => handleNumber("8"));
        button("9", () => handleNumber("9"));
        button("÷", () => handleOperator("÷"));
      });

      hbox(() => {
        button("4", () => handleNumber("4"));
        button("5", () => handleNumber("5"));
        button("6", () => handleNumber("6"));
        button("×", () => handleOperator("×"));
      });

      hbox(() => {
        button("1", () => handleNumber("1"));
        button("2", () => handleNumber("2"));
        button("3", () => handleNumber("3"));
        button("-", () => handleOperator("-"));
      });

      hbox(() => {
        button("0", () => handleNumber("0"));
        button("Clr", () => clear());
        button("=", () => calculate());
        button("+", () => handleOperator("+"));
      });
    });
  });
});
