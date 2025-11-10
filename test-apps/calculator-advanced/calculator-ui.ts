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
 * - JyneTest for UI integration (complete end-to-end)
 */

export class CalculatorUI {
  private logic: CalculatorLogic;
  private display: any;

  constructor(private jyneApp: App) {
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

    this.jyneApp.window({ title: "Calculator", width: 400, height: 500 }, () => {
      this.jyneApp.vbox(() => {
        // Display - right-aligned and bold
        this.display = this.jyneApp.label(this.logic.getDisplay(), "display");

        // Number pad and operators - use grid for even sizing with semantic class names
        this.jyneApp.grid(4, () => {
          // Row 1: 7 8 9 ÷
          this.jyneApp.button("7", () => this.handleNumberClick("7"), "numeral");
          this.jyneApp.button("8", () => this.handleNumberClick("8"), "numeral");
          this.jyneApp.button("9", () => this.handleNumberClick("9"), "numeral");
          this.jyneApp.button("÷", () => this.handleOperatorClick("÷"), "operation");

          // Row 2: 4 5 6 ×
          this.jyneApp.button("4", () => this.handleNumberClick("4"), "numeral");
          this.jyneApp.button("5", () => this.handleNumberClick("5"), "numeral");
          this.jyneApp.button("6", () => this.handleNumberClick("6"), "numeral");
          this.jyneApp.button("×", () => this.handleOperatorClick("×"), "operation");

          // Row 3: 1 2 3 -
          this.jyneApp.button("1", () => this.handleNumberClick("1"), "numeral");
          this.jyneApp.button("2", () => this.handleNumberClick("2"), "numeral");
          this.jyneApp.button("3", () => this.handleNumberClick("3"), "numeral");
          this.jyneApp.button("-", () => this.handleOperatorClick("-"), "operation");

          // Row 4: 0 . Clr +
          this.jyneApp.button("0", () => this.handleNumberClick("0"), "numeral");
          this.jyneApp.button(".", () => this.handleDecimalClick(), "numeral");
          this.jyneApp.button("Clr", () => this.handleClearClick(), "clear");
          this.jyneApp.button("+", () => this.handleOperatorClick("+"), "operation");
        });

        // Equals button spans full width
        this.jyneApp.button("=", () => this.handleEqualsClick(), "equals");
      });
    });
  }

  /**
   * Run the calculator application
   */
  async run(): Promise<void> {
    await this.jyneApp.run();
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
  app({ title: "Jyne Calculator" }, (appInstance) => {
    const calc = new CalculatorUI(appInstance);
    calc.build();
  });
}
