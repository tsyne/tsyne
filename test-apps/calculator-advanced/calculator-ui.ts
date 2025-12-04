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
      // Button color mappings using the Tsyne styling system
      operation: {
        background_color: '#2196F3'  // A nice blue for operations
      },
      clear: {
        background_color: '#f44336'  // A standard red for clear
      },
      equals: {
        background_color: '#4CAF50'  // A standard green for equals
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
          this.tsyneApp.button("7").onClick(() => this.handleNumberClick("7"), "numeral");
          this.tsyneApp.button("8").onClick(() => this.handleNumberClick("8"), "numeral");
          this.tsyneApp.button("9").onClick(() => this.handleNumberClick("9"), "numeral");
          this.tsyneApp.button("÷").onClick(() => this.handleOperatorClick("÷"), "operation");

          // Row 2: 4 5 6 ×
          this.tsyneApp.button("4").onClick(() => this.handleNumberClick("4"), "numeral");
          this.tsyneApp.button("5").onClick(() => this.handleNumberClick("5"), "numeral");
          this.tsyneApp.button("6").onClick(() => this.handleNumberClick("6"), "numeral");
          this.tsyneApp.button("×").onClick(() => this.handleOperatorClick("×"), "operation");

          // Row 3: 1 2 3 -
          this.tsyneApp.button("1").onClick(() => this.handleNumberClick("1"), "numeral");
          this.tsyneApp.button("2").onClick(() => this.handleNumberClick("2"), "numeral");
          this.tsyneApp.button("3").onClick(() => this.handleNumberClick("3"), "numeral");
          this.tsyneApp.button("-").onClick(() => this.handleOperatorClick("-"), "operation");

          // Row 4: 0 . Clr +
          this.tsyneApp.button("0").onClick(() => this.handleNumberClick("0"), "numeral");
          this.tsyneApp.button(".").onClick(() => this.handleDecimalClick(), "numeral");
          this.tsyneApp.button("Clr").onClick(() => this.handleClearClick(), "clear");
          this.tsyneApp.button("+").onClick(() => this.handleOperatorClick("+"), "operation");
        });

        // Equals button spans full width
        this.tsyneApp.button("=").onClick(() => this.handleEqualsClick(), "equals");
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
