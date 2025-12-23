import { app, resolveTransport, App  } from '../../core/src';

/**
 * Calculator application - Testable implementation
 *
 * This calculator demonstrates best practices for building testable Tsyne apps:
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

  constructor(private tsyneApp: App) {}

  /**
   * Build the calculator UI using the injected app's scoped methods
   */
  build(): void {
    this.tsyneApp.window({ title: "Calculator" }, () => {
      this.tsyneApp.vbox(() => {
        // Display
        this.display = this.tsyneApp.label("0");

        // Number pad and operators
        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("7").onClick(() => this.handleNumber("7"));
          this.tsyneApp.button("8").onClick(() => this.handleNumber("8"));
          this.tsyneApp.button("9").onClick(() => this.handleNumber("9"));
          this.tsyneApp.button("÷").onClick(() => this.handleOperator("÷"));
        });

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("4").onClick(() => this.handleNumber("4"));
          this.tsyneApp.button("5").onClick(() => this.handleNumber("5"));
          this.tsyneApp.button("6").onClick(() => this.handleNumber("6"));
          this.tsyneApp.button("×").onClick(() => this.handleOperator("×"));
        });

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("1").onClick(() => this.handleNumber("1"));
          this.tsyneApp.button("2").onClick(() => this.handleNumber("2"));
          this.tsyneApp.button("3").onClick(() => this.handleNumber("3"));
          this.tsyneApp.button("-").onClick(() => this.handleOperator("-"));
        });

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("0").onClick(() => this.handleNumber("0"));
          this.tsyneApp.button(".").onClick(() => this.handleDecimal());
          this.tsyneApp.button("Clr").onClick(() => this.clear());
          this.tsyneApp.button("+").onClick(() => this.handleOperator("+"));
        });

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("=").onClick(() => this.calculate());
        });
      });
    });
  }

  /**
   * Run the calculator application
   */
  async run(): Promise<void> {
    await this.tsyneApp.run();
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
  app(resolveTransport(), { title: "Tsyne Calculator" }, (app) => {
    const calc = new Calculator(app);
    calc.build();
  });
}
