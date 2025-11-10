import { app, App } from '../../src';

/**
 * Calculator application - Testable implementation
 *
 * This calculator demonstrates best practices for building testable Jyne apps:
 * - Proper IoC/DI: App instance is injected
 * - All state is managed through widget references
 * - Widget text is the source of truth for display
 * - Operations are pure functions
 * - UI is declarative and easy to inspect
 */

export class Calculator {
  private display: any;
  private currentValue = "0";
  private operator: string | null = null;
  private previousValue = "0";
  private shouldResetDisplay = false;

  constructor(private jyneApp: App) {}

  /**
   * Build the calculator UI using the injected app's scoped methods
   */
  build(): void {
    this.jyneApp.window({ title: "Calculator" }, () => {
      this.jyneApp.vbox(() => {
        // Display
        this.display = this.jyneApp.label("0");

        // Number pad and operators
        this.jyneApp.hbox(() => {
          this.jyneApp.button("7", () => this.handleNumber("7"));
          this.jyneApp.button("8", () => this.handleNumber("8"));
          this.jyneApp.button("9", () => this.handleNumber("9"));
          this.jyneApp.button("÷", () => this.handleOperator("÷"));
        });

        this.jyneApp.hbox(() => {
          this.jyneApp.button("4", () => this.handleNumber("4"));
          this.jyneApp.button("5", () => this.handleNumber("5"));
          this.jyneApp.button("6", () => this.handleNumber("6"));
          this.jyneApp.button("×", () => this.handleOperator("×"));
        });

        this.jyneApp.hbox(() => {
          this.jyneApp.button("1", () => this.handleNumber("1"));
          this.jyneApp.button("2", () => this.handleNumber("2"));
          this.jyneApp.button("3", () => this.handleNumber("3"));
          this.jyneApp.button("-", () => this.handleOperator("-"));
        });

        this.jyneApp.hbox(() => {
          this.jyneApp.button("0", () => this.handleNumber("0"));
          this.jyneApp.button(".", () => this.handleDecimal());
          this.jyneApp.button("Clr", () => this.clear());
          this.jyneApp.button("+", () => this.handleOperator("+"));
        });

        this.jyneApp.hbox(() => {
          this.jyneApp.button("=", () => this.calculate());
        });
      });
    });
  }

  /**
   * Run the calculator application
   */
  async run(): Promise<void> {
    await this.jyneApp.run();
  }

  private updateDisplay(value: string) {
    this.currentValue = value;
    if (this.display) {
      this.display.setText(value);
    }
  }

  private handleNumber(num: string) {
    if (this.shouldResetDisplay) {
      this.updateDisplay(num);
      this.shouldResetDisplay = false;
    } else {
      const newValue = this.currentValue === "0" ? num : this.currentValue + num;
      this.updateDisplay(newValue);
    }
  }

  private handleDecimal() {
    if (this.shouldResetDisplay) {
      this.updateDisplay("0.");
      this.shouldResetDisplay = false;
    } else if (!this.currentValue.includes(".")) {
      this.updateDisplay(this.currentValue + ".");
    }
  }

  private handleOperator(op: string) {
    if (this.operator && !this.shouldResetDisplay) {
      this.calculate();
    }
    this.previousValue = this.currentValue;
    this.operator = op;
    this.shouldResetDisplay = true;
  }

  private calculate() {
    if (!this.operator) {
      return;
    }

    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    let result = 0;

    switch (this.operator) {
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
          this.updateDisplay("Error");
          this.operator = null;
          this.shouldResetDisplay = true;
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    // Handle floating point precision
    const resultStr = Number.isInteger(result)
      ? result.toString()
      : result.toFixed(8).replace(/\.?0+$/, '');

    this.updateDisplay(resultStr);
    this.operator = null;
    this.shouldResetDisplay = true;
  }

  private clear() {
    this.currentValue = "0";
    this.previousValue = "0";
    this.operator = null;
    this.shouldResetDisplay = false;
    this.updateDisplay("0");
  }
}

// Main entry point for running the calculator
// Demonstrates proper IoC: app instance is injected into builder
if (require.main === module) {
  app({ title: "Jyne Calculator" }, (app) => {
    const calc = new Calculator(app);
    calc.build();
  });
}
