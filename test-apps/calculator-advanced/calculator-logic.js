"use strict";
/**
 * Calculator Logic - Pure business logic with no UI dependencies
 *
 * This can be tested with pure Jest without any Tsyne/UI involvement.
 * Following the Model-View-Presenter pattern.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatorLogic = void 0;
var CalculatorLogic = /** @class */ (function () {
    function CalculatorLogic() {
        this.state = this.getInitialState();
    }
    CalculatorLogic.prototype.getInitialState = function () {
        return {
            display: "0",
            currentValue: "0",
            previousValue: "0",
            operator: null,
            shouldResetDisplay: false
        };
    };
    CalculatorLogic.prototype.getState = function () {
        return __assign({}, this.state);
    };
    CalculatorLogic.prototype.getDisplay = function () {
        return this.state.display;
    };
    /**
     * Handle number input (0-9)
     */
    CalculatorLogic.prototype.inputNumber = function (num) {
        if (this.state.shouldResetDisplay) {
            this.state.currentValue = num;
            this.state.display = num;
            this.state.shouldResetDisplay = false;
        }
        else {
            var newValue = this.state.currentValue === "0" ? num : this.state.currentValue + num;
            this.state.currentValue = newValue;
            this.state.display = newValue;
        }
        return this.state.display;
    };
    /**
     * Handle decimal point
     */
    CalculatorLogic.prototype.inputDecimal = function () {
        if (this.state.shouldResetDisplay) {
            this.state.currentValue = "0.";
            this.state.display = "0.";
            this.state.shouldResetDisplay = false;
        }
        else if (!this.state.currentValue.includes(".")) {
            this.state.currentValue += ".";
            this.state.display = this.state.currentValue;
        }
        return this.state.display;
    };
    /**
     * Handle operator input (+, -, ×, ÷)
     */
    CalculatorLogic.prototype.inputOperator = function (op) {
        if (this.state.operator && !this.state.shouldResetDisplay) {
            this.calculate();
        }
        this.state.previousValue = this.state.currentValue;
        this.state.operator = op;
        this.state.shouldResetDisplay = true;
        return this.state.display;
    };
    /**
     * Perform calculation
     */
    CalculatorLogic.prototype.calculate = function () {
        if (!this.state.operator) {
            return this.state.display;
        }
        var prev = parseFloat(this.state.previousValue);
        var current = parseFloat(this.state.currentValue);
        var result = 0;
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
        var resultStr = Number.isInteger(result)
            ? result.toString()
            : result.toFixed(8).replace(/\.?0+$/, '');
        this.state.display = resultStr;
        this.state.currentValue = resultStr;
        this.state.operator = null;
        this.state.shouldResetDisplay = true;
        return this.state.display;
    };
    /**
     * Clear calculator state
     */
    CalculatorLogic.prototype.clear = function () {
        this.state = this.getInitialState();
        return this.state.display;
    };
    /**
     * Helper: Perform a sequence of operations
     * Useful for testing complex scenarios
     */
    CalculatorLogic.prototype.execute = function (input) {
        var tokens = input.split(' ').filter(function (t) { return t; });
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            if (token >= '0' && token <= '9') {
                this.inputNumber(token);
            }
            else if (token === '.') {
                this.inputDecimal();
            }
            else if (['+', '-', '×', '÷'].includes(token)) {
                this.inputOperator(token);
            }
            else if (token === '=') {
                this.calculate();
            }
            else if (token === 'C' || token === 'Clr') {
                this.clear();
            }
        }
        return this.state.display;
    };
    return CalculatorLogic;
}());
exports.CalculatorLogic = CalculatorLogic;
