"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatorUI = void 0;
var src_1 = require("../../src");
var calculator_logic_1 = require("./calculator-logic");
var styles_1 = require("../../src/styles");
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
var CalculatorUI = /** @class */ (function () {
    function CalculatorUI(tsyneApp) {
        this.tsyneApp = tsyneApp;
        this.logic = new calculator_logic_1.CalculatorLogic();
    }
    /**
     * Build the calculator UI
     */
    CalculatorUI.prototype.build = function () {
        var _this = this;
        // Define calculator stylesheet
        (0, styles_1.styles)({
            display: {
                text_align: 'right',
                font_style: styles_1.FontStyle.BOLD,
                font_size: 18 // 20% bigger than default (~14-15)
            },
            // Button color mappings using the Tsyne styling system
            operation: {
                background_color: '#2196F3' // A nice blue for operations
            },
            clear: {
                background_color: '#f44336' // A standard red for clear
            },
            equals: {
                background_color: '#4CAF50' // A standard green for equals
            }
            // numeral buttons get default styling (grey/neutral)
        });
        this.tsyneApp.window({ title: "Calculator", width: 400, height: 500 }, function () {
            _this.tsyneApp.vbox(function () {
                // Display - right-aligned and bold
                _this.display = _this.tsyneApp.label(_this.logic.getDisplay(), "display");
                // Number pad and operators - use grid for even sizing with semantic class names
                _this.tsyneApp.grid(4, function () {
                    // Row 1: 7 8 9 ÷
                    _this.tsyneApp.button("7", function () { return _this.handleNumberClick("7"); }, "numeral");
                    _this.tsyneApp.button("8", function () { return _this.handleNumberClick("8"); }, "numeral");
                    _this.tsyneApp.button("9", function () { return _this.handleNumberClick("9"); }, "numeral");
                    _this.tsyneApp.button("÷", function () { return _this.handleOperatorClick("÷"); }, "operation");
                    // Row 2: 4 5 6 ×
                    _this.tsyneApp.button("4", function () { return _this.handleNumberClick("4"); }, "numeral");
                    _this.tsyneApp.button("5", function () { return _this.handleNumberClick("5"); }, "numeral");
                    _this.tsyneApp.button("6", function () { return _this.handleNumberClick("6"); }, "numeral");
                    _this.tsyneApp.button("×", function () { return _this.handleOperatorClick("×"); }, "operation");
                    // Row 3: 1 2 3 -
                    _this.tsyneApp.button("1", function () { return _this.handleNumberClick("1"); }, "numeral");
                    _this.tsyneApp.button("2", function () { return _this.handleNumberClick("2"); }, "numeral");
                    _this.tsyneApp.button("3", function () { return _this.handleNumberClick("3"); }, "numeral");
                    _this.tsyneApp.button("-", function () { return _this.handleOperatorClick("-"); }, "operation");
                    // Row 4: 0 . Clr +
                    _this.tsyneApp.button("0", function () { return _this.handleNumberClick("0"); }, "numeral");
                    _this.tsyneApp.button(".", function () { return _this.handleDecimalClick(); }, "numeral");
                    _this.tsyneApp.button("Clr", function () { return _this.handleClearClick(); }, "clear");
                    _this.tsyneApp.button("+", function () { return _this.handleOperatorClick("+"); }, "operation");
                });
                // Equals button spans full width
                _this.tsyneApp.button("=", function () { return _this.handleEqualsClick(); }, "equals");
            });
        });
    };
    /**
     * Run the calculator application
     */
    CalculatorUI.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tsyneApp.run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // UI Event Handlers - delegate to logic and update display
    CalculatorUI.prototype.handleNumberClick = function (num) {
        var display = this.logic.inputNumber(num);
        this.updateDisplay(display);
    };
    CalculatorUI.prototype.handleDecimalClick = function () {
        var display = this.logic.inputDecimal();
        this.updateDisplay(display);
    };
    CalculatorUI.prototype.handleOperatorClick = function (op) {
        var display = this.logic.inputOperator(op);
        this.updateDisplay(display);
    };
    CalculatorUI.prototype.handleEqualsClick = function () {
        var display = this.logic.calculate();
        this.updateDisplay(display);
    };
    CalculatorUI.prototype.handleClearClick = function () {
        var display = this.logic.clear();
        this.updateDisplay(display);
    };
    CalculatorUI.prototype.updateDisplay = function (value) {
        if (this.display) {
            this.display.setText(value);
        }
    };
    // Expose logic for testing if needed
    CalculatorUI.prototype.getLogic = function () {
        return this.logic;
    };
    return CalculatorUI;
}());
exports.CalculatorUI = CalculatorUI;
// Main entry point for running the calculator
if (require.main === module) {
    (0, src_1.app)({ title: "Tsyne Calculator" }, function (appInstance) {
        var calc = new CalculatorUI(appInstance);
        calc.build();
    });
}
