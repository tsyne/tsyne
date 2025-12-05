// @tsyne-app:name Calculator
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="12" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildCalculator
// @tsyne-app:contentBuilder buildCalculatorContent

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

/**
 * Calculator instance - encapsulates state to support multiple instances
 */
class CalculatorInstance {
  private display: Label | undefined;
  private currentValue = "0";
  private operator: string | null = null;
  private previousValue = "0";
  private shouldResetDisplay = false;

  updateDisplay(value: string) {
    this.currentValue = value;
    if (this.display) {
      this.display.setText(value);
    }
  }

  handleNumber(num: string) {
    if (this.shouldResetDisplay) {
      this.updateDisplay(num);
      this.shouldResetDisplay = false;
    } else {
      const newValue = this.currentValue === "0" ? num : this.currentValue + num;
      this.updateDisplay(newValue);
    }
  }

  handleOperator(op: string) {
    if (this.operator && !this.shouldResetDisplay) {
      this.calculate();
    }
    this.previousValue = this.currentValue;
    this.operator = op;
    this.shouldResetDisplay = true;
  }

  calculate() {
    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    if (!this.operator) return;

    const result = eval(`${prev} ${this.operator} ${current}`);
    this.updateDisplay(isFinite(result) ? result.toString() : "Error");
    this.operator = null;
    this.shouldResetDisplay = true;
  }

  clear() {
    this.currentValue = "0";
    this.previousValue = "0";
    this.operator = null;
    this.shouldResetDisplay = false;
    this.updateDisplay("0");
  }

  /**
   * Build the calculator content (for use in desktop inner windows)
   */
  buildContent(a: App) {
    a.vbox(() => {
      // Display
      this.display = a.label("0");

      // Number pad and operators - 4x4 grid for even button sizing
      a.grid(4, () => {
        [..."789"].forEach(n => a.button(n).onClick(() => this.handleNumber(n)));
        a.button("÷").onClick(() => this.handleOperator("/"));
        [..."456"].forEach(n => a.button(n).onClick(() => this.handleNumber(n)));
        a.button("×").onClick(() => this.handleOperator("*"));
        [..."123"].forEach(n => a.button(n).onClick(() => this.handleNumber(n)));
        a.button("-").onClick(() => this.handleOperator("-"));
        a.button("0").onClick(() => this.handleNumber("0"));
        a.button("Clr").onClick(() => this.clear());
        a.button("=").onClick(() => this.calculate());
        a.button("+").onClick(() => this.handleOperator("+"));
      });
    });
  }
}

// Global instance for standalone mode (backward compatibility)
const standaloneInstance = new CalculatorInstance();

/**
 * Build just the calculator content (for desktop environment)
 * Creates a new instance each time to support multiple calculators
 */
export function buildCalculatorContent(a: App) {
  const instance = new CalculatorInstance();
  instance.buildContent(a);
}

/**
 * Build the calculator in a window (for standalone/testing)
 */
export function buildCalculator(a: App) {
  a.window({ title: "Calculator" }, (win: Window) => {
    win.setContent(() => {
      standaloneInstance.buildContent(a);
    });
  });
}

// Skip auto-run when imported by test framework (Jest sets NODE_ENV=test)
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  // Run the calculator - executes when loaded by designer or run directly
  app({ title: "Tsyne Calculator" }, buildCalculator);
}
