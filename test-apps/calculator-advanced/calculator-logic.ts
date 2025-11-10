/**
 * Calculator Logic - Pure business logic with no UI dependencies
 *
 * This can be tested with pure Jest without any Tsyne/UI involvement.
 * Following the Model-View-Presenter pattern.
 */

export interface CalculatorState {
  display: string;
  currentValue: string;
  previousValue: string;
  operator: string | null;
  shouldResetDisplay: boolean;
}

export class CalculatorLogic {
  private state: CalculatorState;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): CalculatorState {
    return {
      display: "0",
      currentValue: "0",
      previousValue: "0",
      operator: null,
      shouldResetDisplay: false
    };
  }

  getState(): CalculatorState {
    return { ...this.state };
  }

  getDisplay(): string {
    return this.state.display;
  }

  /**
   * Handle number input (0-9)
   */
  inputNumber(num: string): string {
    if (this.state.shouldResetDisplay) {
      this.state.currentValue = num;
      this.state.display = num;
      this.state.shouldResetDisplay = false;
    } else {
      const newValue = this.state.currentValue === "0" ? num : this.state.currentValue + num;
      this.state.currentValue = newValue;
      this.state.display = newValue;
    }
    return this.state.display;
  }

  /**
   * Handle decimal point
   */
  inputDecimal(): string {
    if (this.state.shouldResetDisplay) {
      this.state.currentValue = "0.";
      this.state.display = "0.";
      this.state.shouldResetDisplay = false;
    } else if (!this.state.currentValue.includes(".")) {
      this.state.currentValue += ".";
      this.state.display = this.state.currentValue;
    }
    return this.state.display;
  }

  /**
   * Handle operator input (+, -, ×, ÷)
   */
  inputOperator(op: string): string {
    if (this.state.operator && !this.state.shouldResetDisplay) {
      this.calculate();
    }
    this.state.previousValue = this.state.currentValue;
    this.state.operator = op;
    this.state.shouldResetDisplay = true;
    return this.state.display;
  }

  /**
   * Perform calculation
   */
  calculate(): string {
    if (!this.state.operator) {
      return this.state.display;
    }

    const prev = parseFloat(this.state.previousValue);
    const current = parseFloat(this.state.currentValue);
    let result = 0;

    switch (this.state.operator) {
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
          this.state.display = "Error";
          this.state.currentValue = "0";
          this.state.operator = null;
          this.state.shouldResetDisplay = true;
          return this.state.display;
        }
        result = prev / current;
        break;
      default:
        return this.state.display;
    }

    // Handle floating point precision
    const resultStr = Number.isInteger(result)
      ? result.toString()
      : result.toFixed(8).replace(/\.?0+$/, '');

    this.state.display = resultStr;
    this.state.currentValue = resultStr;
    this.state.operator = null;
    this.state.shouldResetDisplay = true;

    return this.state.display;
  }

  /**
   * Clear calculator state
   */
  clear(): string {
    this.state = this.getInitialState();
    return this.state.display;
  }

  /**
   * Helper: Perform a sequence of operations
   * Useful for testing complex scenarios
   */
  execute(input: string): string {
    const tokens = input.split(' ').filter(t => t);

    for (const token of tokens) {
      if (token >= '0' && token <= '9') {
        this.inputNumber(token);
      } else if (token === '.') {
        this.inputDecimal();
      } else if (['+', '-', '×', '÷'].includes(token)) {
        this.inputOperator(token);
      } else if (token === '=') {
        this.calculate();
      } else if (token === 'C' || token === 'Clr') {
        this.clear();
      }
    }

    return this.state.display;
  }
}
