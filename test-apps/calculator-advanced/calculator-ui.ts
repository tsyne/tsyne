import { app, App } from '../../src';
import { CalculatorLogic } from './calculator-logic';
import { styles, FontStyle } from '../../src/styles';

/**
 * Calculator UI - Presentation layer
 *
 * This is the "View" that connects to the "Model" (CalculatorLogic).
 * UI-specific behavior is here, business logic is in CalculatorLogic.
 *
 * This separation allows:
 * - Pure Jest tests for CalculatorLogic (fast, no UI)
 * - TsyneTest for UI integration (complete end-to-end)
 */

export class CalculatorUI {
  private logic: CalculatorLogic;
  private display: any;

  constructor(private tsyneApp: App) {
    this.logic = new CalculatorLogic();
  }

  /**
   * Build the calculator UI
   */
  build(): void {
    // Define calculator stylesheet
    styles({
      display: {
        text_align: 'right',
        font_style: FontStyle.BOLD,
        font_size: 18  // 20% bigger than default (~14-15)
      },
      // Button color mappings (Fyne limitation: must use importance levels)
      operation: {
        importance: 'high'  // Blue for operations (÷ × - +)
      },
      clear: {
        importance: 'warning'  // Orange/red for clear
      },
      equals: {
        importance: 'success'  // Green for equals
      }
      // numeral buttons get default styling (grey/neutral)
    });

    this.tsyneApp.window({ title: "Calculator", width: 400, height: 500 }, () => {
      this.tsyneApp.vbox(() => {
        // Display - right-aligned and bold
        this.display = this.tsyneApp.label(this.logic.getDisplay(), "display");

        // Number pad and operators - use grid for even sizing with semantic class names
        this.tsyneApp.grid(4, () => {
          // Row 1: 7 8 9 ÷
          this.tsyneApp.button("7", () => this.handleNumberClick("7"), "numeral");
          this.tsyneApp.button("8", () => this.handleNumberClick("8"), "numeral");
          this.tsyneApp.button("9", () => this.handleNumberClick("9"), "numeral");
          this.tsyneApp.button("÷", () => this.handleOperatorClick("÷"), "operation");

          // Row 2: 4 5 6 ×
          this.tsyneApp.button("4", () => this.handleNumberClick("4"), "numeral");
          this.tsyneApp.button("5", () => this.handleNumberClick("5"), "numeral");
          this.tsyneApp.button("6", () => this.handleNumberClick("6"), "numeral");
          this.tsyneApp.button("×", () => this.handleOperatorClick("×"), "operation");

          // Row 3: 1 2 3 -
          this.tsyneApp.button("1", () => this.handleNumberClick("1"), "numeral");
          this.tsyneApp.button("2", () => this.handleNumberClick("2"), "numeral");
          this.tsyneApp.button("3", () => this.handleNumberClick("3"), "numeral");
          this.tsyneApp.button("-", () => this.handleOperatorClick("-"), "operation");

          // Row 4: 0 . Clr +
          this.tsyneApp.button("0", () => this.handleNumberClick("0"), "numeral");
          this.tsyneApp.button(".", () => this.handleDecimalClick(), "numeral");
          this.tsyneApp.button("Clr", () => this.handleClearClick(), "clear");
          this.tsyneApp.button("+", () => this.handleOperatorClick("+"), "operation");
        });

        // Equals button spans full width
        this.tsyneApp.button("=", () => this.handleEqualsClick(), "equals");
      });
    });
  }

  /**
   * Run the calculator application
   */
  async run(): Promise<void> {
    await this.tsyneApp.run();
  }

  // UI Event Handlers - delegate to logic and update display

  private handleNumberClick(num: string) {
    const display = this.logic.inputNumber(num);
    this.updateDisplay(display);
  }

  private handleDecimalClick() {
    const display = this.logic.inputDecimal();
    this.updateDisplay(display);
  }

  private handleOperatorClick(op: string) {
    const display = this.logic.inputOperator(op);
    this.updateDisplay(display);
  }

  private handleEqualsClick() {
    const display = this.logic.calculate();
    this.updateDisplay(display);
  }

  private handleClearClick() {
    const display = this.logic.clear();
    this.updateDisplay(display);
  }

  private updateDisplay(value: string) {
    if (this.display) {
      this.display.setText(value);
    }
  }

  // Expose logic for testing if needed
  getLogic(): CalculatorLogic {
    return this.logic;
  }
}

// Main entry point for running the calculator
if (require.main === module) {
  app({ title: "Tsyne Calculator" }, (appInstance) => {
    const calc = new CalculatorUI(appInstance);
    calc.build();
  });
}
