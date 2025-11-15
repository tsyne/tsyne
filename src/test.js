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
exports.TestContext = exports.Expect = exports.Locator = void 0;
/**
 * Locator represents a way to find widgets in the UI
 * Supports fluent-selenium style method chaining
 */
var Locator = /** @class */ (function () {
    function Locator(bridge, selector, selectorType) {
        this.bridge = bridge;
        this.selector = selector;
        this.selectorType = selectorType;
    }
    /**
     * Find all widgets matching this locator
     */
    Locator.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bridge.send('findWidget', {
                            selector: this.selector,
                            type: this.selectorType
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.widgetIds || []];
                }
            });
        });
    };
    /**
     * Find the first widget matching this locator
     */
    Locator.prototype.find = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findAll()];
                    case 1:
                        widgets = _a.sent();
                        return [2 /*return*/, widgets.length > 0 ? widgets[0] : null];
                }
            });
        });
    };
    /**
     * Click the first widget matching this locator
     * Respects within() timeout if set
     */
    Locator.prototype.click = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('clickWidget', { widgetId: widgetId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Type text into the first widget matching this locator
     * Respects within() timeout if set
     */
    Locator.prototype.type = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('typeText', { widgetId: widgetId, text: text })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Double-click the first widget matching this locator
     * Respects within() timeout if set
     */
    Locator.prototype.doubleClick = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('doubleTapWidget', { widgetId: widgetId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Locator.prototype.submit = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('submitEntry', { widgetId: widgetId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Locator.prototype.drag = function (x, y) {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('dragWidget', { widgetId: widgetId, x: x, y: y })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Right-click (secondary tap) the first widget matching this locator
     * Respects within() timeout if set
     */
    Locator.prototype.rightClick = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('rightClickWidget', { widgetId: widgetId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Hover over the first widget matching this locator (moves mouse to widget position)
     * Respects within() timeout if set
     * Note: Requires windowId to be available (automatically determined from bridge)
     */
    Locator.prototype.hover = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        windowId = 'window_1';
                        return [4 /*yield*/, this.bridge.send('hoverWidget', { widgetId: widgetId, windowId: windowId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the text of the first widget matching this locator
     */
    Locator.prototype.getText = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getText', { widgetId: widgetId })];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.text];
                }
            });
        });
    };
    /**
     * Get detailed information about the first widget
     */
    Locator.prototype.getInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Locator.prototype.getParent = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, parentId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.getParent(widgetId)];
                    case 2:
                        parentId = _a.sent();
                        if (!parentId) {
                            throw new Error("Widget with ID ".concat(widgetId, " has no parent."));
                        }
                        return [2 /*return*/, new Locator(this.bridge, parentId, 'id')];
                }
            });
        });
    };
    /**
     * Wait for a widget to appear (with timeout)
     */
    Locator.prototype.waitFor = function () {
        return __awaiter(this, arguments, void 0, function (timeout) {
            var startTime, widget;
            if (timeout === void 0) { timeout = 5000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < timeout)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.find()];
                    case 2:
                        widget = _a.sent();
                        if (widget) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 4: throw new Error("Timeout waiting for widget with ".concat(this.selectorType, ": ").concat(this.selector));
                }
            });
        });
    };
    /**
     * Fluent API: Set timeout for retrying element location (like fluent-selenium's within)
     * Returns this locator for chaining
     * @param timeoutMs - Time in milliseconds to retry finding the element
     * @example
     * await ctx.getByText("Submit").within(5000).click();
     */
    Locator.prototype.within = function (timeoutMs) {
        this.withinTimeout = timeoutMs;
        return this;
    };
    /**
     * Fluent API: Wait for element to disappear from DOM (like fluent-selenium's without)
     * Returns a promise that resolves when element is no longer found
     * @param timeoutMs - Time in milliseconds to wait for element to disappear
     * @example
     * await ctx.getByText("Loading...").without(5000);
     */
    Locator.prototype.without = function (timeoutMs) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < timeoutMs)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.find()];
                    case 2:
                        widget = _a.sent();
                        if (!widget) {
                            return [2 /*return*/]; // Element not found = disappeared
                        }
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 4: throw new Error("Timeout waiting for widget to disappear with ".concat(this.selectorType, ": ").concat(this.selector));
                }
            });
        });
    };
    /**
     * Fluent API: Assert text equals expected value (like fluent-selenium's shouldBe)
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("status").getText().then(t => expect(t).toBe("Success"));
     * // Or use shouldBe for fluent style:
     * await ctx.getByID("status").shouldBe("Success");
     */
    Locator.prototype.shouldBe = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, lastActual, actual_1, error_1, actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.withinTimeout) return [3 /*break*/, 8];
                        startTime = Date.now();
                        lastActual = '';
                        _a.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.getText()];
                    case 3:
                        actual_1 = _a.sent();
                        if (actual_1 === expected) {
                            return [2 /*return*/, this]; // Success!
                        }
                        lastActual = actual_1;
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 7:
                        // Timeout - use Jest assertion for better error formatting
                        expect(lastActual).toBe(expected);
                        return [2 /*return*/, this]; // Won't reach here, but TypeScript needs it
                    case 8: return [4 /*yield*/, this.getText()];
                    case 9:
                        actual = _a.sent();
                        expect(actual).toBe(expected);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert text contains expected substring (like fluent-selenium's shouldContain)
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("message").shouldContain("success");
     */
    Locator.prototype.shouldContain = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, lastActual, actual_2, error_2, actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.withinTimeout) return [3 /*break*/, 8];
                        startTime = Date.now();
                        lastActual = '';
                        _a.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.getText()];
                    case 3:
                        actual_2 = _a.sent();
                        if (actual_2.includes(expected)) {
                            return [2 /*return*/, this]; // Success!
                        }
                        lastActual = actual_2;
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 7:
                        // Timeout - use Jest assertion for better error formatting
                        expect(lastActual).toContain(expected);
                        return [2 /*return*/, this]; // Won't reach here, but TypeScript needs it
                    case 8: return [4 /*yield*/, this.getText()];
                    case 9:
                        actual = _a.sent();
                        expect(actual).toContain(expected);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert text matches regex pattern (like fluent-selenium's shouldMatch)
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("email").shouldMatch(/^[a-z]+@[a-z]+\.[a-z]+$/);
     */
    Locator.prototype.shouldMatch = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            var actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTextWithRetry()];
                    case 1:
                        actual = _a.sent();
                        expect(actual).toMatch(pattern);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert text does not equal expected value
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("status").shouldNotBe("Error");
     */
    Locator.prototype.shouldNotBe = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTextWithRetry()];
                    case 1:
                        actual = _a.sent();
                        expect(actual).not.toBe(expected);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert checkbox is checked
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("agree").shouldBeChecked();
     * await ctx.getByID("agree").within(5000).shouldBeChecked();
     */
    Locator.prototype.shouldBeChecked = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checked;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCheckedWithRetry()];
                    case 1:
                        checked = _a.sent();
                        expect(checked).toBe(true);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert checkbox is not checked
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("agree").shouldNotBeChecked();
     */
    Locator.prototype.shouldNotBeChecked = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checked;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCheckedWithRetry()];
                    case 1:
                        checked = _a.sent();
                        expect(checked).toBe(false);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget has specific value (for entry, slider, select)
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("volume").shouldHaveValue(75);
     * await ctx.getByID("country").shouldHaveValue("US");
     */
    Locator.prototype.shouldHaveValue = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var actual, expectedStr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getValueWithRetry()];
                    case 1:
                        actual = _a.sent();
                        expectedStr = String(expected);
                        expect(actual).toBe(expectedStr);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert select/radiogroup has specific selected text
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("country").shouldHaveSelected("United States");
     */
    Locator.prototype.shouldHaveSelected = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSelectedWithRetry()];
                    case 1:
                        actual = _a.sent();
                        expect(actual).toBe(expected);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget is enabled (not disabled)
     * Returns this locator for chaining
     * @example
     * await ctx.getByText("Submit").shouldBeEnabled();
     */
    Locator.prototype.shouldBeEnabled = function () {
        return __awaiter(this, void 0, void 0, function () {
            var disabled;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDisabledWithRetry()];
                    case 1:
                        disabled = _a.sent();
                        expect(disabled).toBe(false);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget is disabled
     * Returns this locator for chaining
     * @example
     * await ctx.getByText("Submit").shouldBeDisabled();
     */
    Locator.prototype.shouldBeDisabled = function () {
        return __awaiter(this, void 0, void 0, function () {
            var disabled;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDisabledWithRetry()];
                    case 1:
                        disabled = _a.sent();
                        expect(disabled).toBe(true);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget has specific type
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("myWidget").shouldHaveType("button");
     */
    Locator.prototype.shouldHaveType = function (expected) {
        return __awaiter(this, void 0, void 0, function () {
            var actual;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTypeWithRetry()];
                    case 1:
                        actual = _a.sent();
                        expect(actual).toBe(expected);
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget is visible
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("modal").shouldBeVisible();
     */
    Locator.prototype.shouldBeVisible = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widget = _a.sent();
                        expect(widget).toBeTruthy();
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget is not visible
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("modal").shouldNotBeVisible();
     */
    Locator.prototype.shouldNotBeVisible = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widget = _a.sent();
                        expect(widget).toBeFalsy();
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Fluent API: Assert widget exists
     * Returns this locator for chaining
     * @example
     * await ctx.getByID("myWidget").shouldExist();
     */
    Locator.prototype.shouldExist = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findWithRetry()];
                    case 1:
                        widget = _a.sent();
                        expect(widget).toBeTruthy();
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Get text with retry support (respects withinTimeout)
     */
    Locator.prototype.getTextWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, lastError, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getText()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 3;
                    case 3:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 9];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 8]);
                        return [4 /*yield*/, this.getText()];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        error_3 = _a.sent();
                        lastError = error_3;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 3];
                    case 9: throw lastError || new Error('Failed to get text');
                }
            });
        });
    };
    /**
     * Enhanced find with retry support (respects withinTimeout)
     */
    Locator.prototype.findWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.find()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        startTime = Date.now();
                        _a.label = 3;
                    case 3:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.find()];
                    case 4:
                        widget = _a.sent();
                        if (widget) {
                            return [2 /*return*/, widget];
                        }
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, null]; // Timeout
                }
            });
        });
    };
    /**
     * Get checked state with retry support (respects withinTimeout)
     */
    Locator.prototype.getCheckedWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, response, startTime, lastError, widgetId, response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, response.checked || false];
                    case 3:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 4;
                    case 4:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 11];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, this.find()];
                    case 6:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error('Widget not found');
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 7:
                        response = _a.sent();
                        return [2 /*return*/, response.checked || false];
                    case 8:
                        error_4 = _a.sent();
                        lastError = error_4;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 4];
                    case 11: throw lastError || new Error('Failed to get checked state');
                }
            });
        });
    };
    /**
     * Get value with retry support (respects withinTimeout)
     */
    Locator.prototype.getValueWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, response, startTime, lastError, widgetId, response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, String(response.value || response.text || '')];
                    case 3:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 4;
                    case 4:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 11];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, this.find()];
                    case 6:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error('Widget not found');
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 7:
                        response = _a.sent();
                        return [2 /*return*/, String(response.value || response.text || '')];
                    case 8:
                        error_5 = _a.sent();
                        lastError = error_5;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 4];
                    case 11: throw lastError || new Error('Failed to get value');
                }
            });
        });
    };
    /**
     * Get selected value with retry support (respects withinTimeout)
     */
    Locator.prototype.getSelectedWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, response, startTime, lastError, widgetId, response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, response.selected || ''];
                    case 3:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 4;
                    case 4:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 11];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, this.find()];
                    case 6:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error('Widget not found');
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 7:
                        response = _a.sent();
                        return [2 /*return*/, response.selected || ''];
                    case 8:
                        error_6 = _a.sent();
                        lastError = error_6;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 4];
                    case 11: throw lastError || new Error('Failed to get selected value');
                }
            });
        });
    };
    /**
     * Get disabled state with retry support (respects withinTimeout)
     */
    Locator.prototype.getDisabledWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, response, startTime, lastError, widgetId, response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, response.disabled || false];
                    case 3:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 4;
                    case 4:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 11];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, this.find()];
                    case 6:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error('Widget not found');
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 7:
                        response = _a.sent();
                        return [2 /*return*/, response.disabled || false];
                    case 8:
                        error_7 = _a.sent();
                        lastError = error_7;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 4];
                    case 11: throw lastError || new Error('Failed to get disabled state');
                }
            });
        });
    };
    /**
     * Get widget type with retry support (respects withinTimeout)
     */
    Locator.prototype.getTypeWithRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgetId, response, startTime, lastError, widgetId, response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.withinTimeout) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error("No widget found with ".concat(this.selectorType, ": ").concat(this.selector));
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, response.type || ''];
                    case 3:
                        startTime = Date.now();
                        lastError = null;
                        _a.label = 4;
                    case 4:
                        if (!(Date.now() - startTime < this.withinTimeout)) return [3 /*break*/, 11];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, this.find()];
                    case 6:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            throw new Error('Widget not found');
                        }
                        return [4 /*yield*/, this.bridge.send('getWidgetInfo', { widgetId: widgetId })];
                    case 7:
                        response = _a.sent();
                        return [2 /*return*/, response.type || ''];
                    case 8:
                        error_8 = _a.sent();
                        lastError = error_8;
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 4];
                    case 11: throw lastError || new Error('Failed to get widget type');
                }
            });
        });
    };
    return Locator;
}());
exports.Locator = Locator;
/**
 * Assertion helpers for testing
 * Enhanced with fluent-selenium style assertions
 */
var Expect = /** @class */ (function () {
    function Expect(locator) {
        this.locator = locator;
    }
    Expect.prototype.toHaveText = function (expectedText) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).toBe(expectedText);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toContainText = function (expectedText) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).toContain(expectedText);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toNotHaveText = function (expectedText) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).not.toBe(expectedText);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toNotContainText = function (expectedText) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).not.toContain(expectedText);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toMatchText = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).toMatch(pattern);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toNotMatchText = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            var actualText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.getText()];
                    case 1:
                        actualText = _a.sent();
                        expect(actualText).not.toMatch(pattern);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toBeVisible = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.find()];
                    case 1:
                        widget = _a.sent();
                        expect(widget).toBeTruthy();
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toNotBeVisible = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widget;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.find()];
                    case 1:
                        widget = _a.sent();
                        expect(widget).toBeFalsy();
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toExist = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.findAll()];
                    case 1:
                        widgets = _a.sent();
                        expect(widgets.length).toBeGreaterThan(0);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toNotExist = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.findAll()];
                    case 1:
                        widgets = _a.sent();
                        expect(widgets.length).toBe(0);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toHaveCount = function (count) {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.findAll()];
                    case 1:
                        widgets = _a.sent();
                        expect(widgets.length).toBe(count);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toHaveCountGreaterThan = function (count) {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.findAll()];
                    case 1:
                        widgets = _a.sent();
                        expect(widgets.length).toBeGreaterThan(count);
                        return [2 /*return*/];
                }
            });
        });
    };
    Expect.prototype.toHaveCountLessThan = function (count) {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.locator.findAll()];
                    case 1:
                        widgets = _a.sent();
                        expect(widgets.length).toBeLessThan(count);
                        return [2 /*return*/];
                }
            });
        });
    };
    return Expect;
}());
exports.Expect = Expect;
/**
 * Main test context for interacting with Tsyne apps
 */
var TestContext = /** @class */ (function () {
    function TestContext(bridge) {
        this.bridge = bridge;
    }
    /**
     * Get a locator for buttons with specific text
     */
    TestContext.prototype.getByText = function (text) {
        return new Locator(this.bridge, text, 'text');
    };
    TestContext.prototype.getByPlaceholder = function (text) {
        return new Locator(this.bridge, text, 'placeholder');
    };
    /**
     * Get a locator for widgets with exact text match
     */
    TestContext.prototype.getByExactText = function (text) {
        return new Locator(this.bridge, text, 'exactText');
    };
    /**
     * Get a locator for widgets of a specific type
     */
    TestContext.prototype.getByType = function (type) {
        return new Locator(this.bridge, type, 'type');
    };
    /**
     * Get a locator for a widget by ID (like Selenium's findElement)
     * Returns a locator that finds a single widget with the specified ID
     *
     * @example
     * const submitButton = ctx.getByID('submit-btn');
     * await submitButton.click();
     * await ctx.expect(submitButton).toBeVisible();
     */
    TestContext.prototype.getByID = function (id) {
        return new Locator(this.bridge, id, 'id');
    };
    /**
     * Get all widgets in the application
     */
    TestContext.prototype.getAllWidgets = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bridge.send('getAllWidgets', {})];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.widgets || []];
                }
            });
        });
    };
    /**
     * Wait for a specified time
     */
    TestContext.prototype.wait = function (ms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wait for a condition to become true (polling like Selenium's waitFor)
     * Checks condition repeatedly until true or timeout
     * @param condition Function that returns true when condition is met
     * @param options timeout (default 5000ms), interval (default 10ms), description
     */
    TestContext.prototype.waitForCondition = function (condition_1) {
        return __awaiter(this, arguments, void 0, function (condition, options) {
            var timeout, interval, description, startTime, result, e_1;
            var _a, _b, _c;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        timeout = (_a = options.timeout) !== null && _a !== void 0 ? _a : 5000;
                        interval = (_b = options.interval) !== null && _b !== void 0 ? _b : 10;
                        description = (_c = options.description) !== null && _c !== void 0 ? _c : 'condition';
                        startTime = Date.now();
                        _d.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < timeout)) return [3 /*break*/, 7];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, condition()];
                    case 3:
                        result = _d.sent();
                        if (result) {
                            return [2 /*return*/]; // Condition met, return immediately
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _d.sent();
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, interval); })];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 1];
                    case 7: throw new Error("Timeout waiting for ".concat(description, " after ").concat(timeout, "ms"));
                }
            });
        });
    };
    /**
     * Create an assertion helper
     */
    TestContext.prototype.expect = function (locator) {
        return new Expect(locator);
    };
    /**
     * Find a widget by text (convenience method for backward compatibility)
     * Returns widget info or null if not found
     */
    TestContext.prototype.findWidget = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var locator, widgetId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        locator = this.getByText(options.text);
                        return [4 /*yield*/, locator.find()];
                    case 1:
                        widgetId = _a.sent();
                        if (!widgetId) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, locator.getInfo()];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Click a widget by ID (convenience method for backward compatibility)
     */
    TestContext.prototype.clickWidget = function (widgetId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bridge.send('clickWidget', { widgetId: widgetId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get table data for a table widget
     * Returns the raw table data (array of rows)
     */
    TestContext.prototype.getTableData = function (tableId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bridge.send('getTableData', { id: tableId })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data || []];
                }
            });
        });
    };
    /**
     * Get list data for a list widget
     * Returns the list items as an array
     */
    TestContext.prototype.getListData = function (listId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bridge.send('getListData', { id: listId })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data || []];
                }
            });
        });
    };
    /**
     * Get all text from all widgets on the page
     * Useful for debugging and quick text verification
     *
     * @returns Array of text values from all widgets (includes empty strings)
     * @example
     * const allText = await ctx.getAllText();
     * console.log('All text on page:', allText);
     */
    TestContext.prototype.getAllText = function () {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllWidgets()];
                    case 1:
                        widgets = _a.sent();
                        return [2 /*return*/, widgets.map(function (w) { return w.text || ''; })];
                }
            });
        });
    };
    /**
     * Get all text from all widgets as a single string
     * Each widget's text is on a new line
     * Useful for debugging what's actually rendered on the page
     *
     * @returns All text joined with newlines
     * @example
     * const pageText = await ctx.getAllTextAsString();
     * console.log('Page content:\n', pageText);
     */
    TestContext.prototype.getAllTextAsString = function () {
        return __awaiter(this, void 0, void 0, function () {
            var textArray;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllText()];
                    case 1:
                        textArray = _a.sent();
                        return [2 /*return*/, textArray.join('\n')];
                }
            });
        });
    };
    /**
     * Check if any widget on the page contains the specified text (case-sensitive)
     * Uses getAllWidgets() internally
     *
     * @param text - Text to search for (case-sensitive)
     * @returns true if any widget contains the text
     * @example
     * if (await ctx.hasText('Success')) {
     *   console.log('Success message found somewhere on page');
     * }
     */
    TestContext.prototype.hasText = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var widgets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllWidgets()];
                    case 1:
                        widgets = _a.sent();
                        return [2 /*return*/, widgets.some(function (w) { return w.text && w.text.includes(text); })];
                }
            });
        });
    };
    /**
     * Check if any widget on the page contains the specified text (case-insensitive)
     * Uses getAllWidgets() internally
     *
     * @param text - Text to search for (case-insensitive)
     * @returns true if any widget contains the text
     * @example
     * if (await ctx.hasTextIgnoreCase('error')) {
     *   throw new Error('Error message found on page');
     * }
     */
    TestContext.prototype.hasTextIgnoreCase = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var widgets, lowerText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllWidgets()];
                    case 1:
                        widgets = _a.sent();
                        lowerText = text.toLowerCase();
                        return [2 /*return*/, widgets.some(function (w) { return w.text && w.text.toLowerCase().includes(lowerText); })];
                }
            });
        });
    };
    /**
     * Assert that the page contains specific text somewhere
     * Throws an error if text is not found
     *
     * @param text - Text that must be present on the page
     * @param options - Optional case-insensitive flag
     * @throws Error if text is not found
     * @example
     * await ctx.assertHasText('Welcome');
     * await ctx.assertHasText('success', { ignoreCase: true });
     */
    TestContext.prototype.assertHasText = function (text_1) {
        return __awaiter(this, arguments, void 0, function (text, options) {
            var hasIt, _a;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!options.ignoreCase) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hasTextIgnoreCase(text)];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.hasText(text)];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        hasIt = _a;
                        expect(hasIt).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Scroll the canvas by delta X and Y
     * Uses Fyne's test.Scroll in test mode
     * @param deltaX - Horizontal scroll distance (positive = right, negative = left)
     * @param deltaY - Vertical scroll distance (positive = down, negative = up)
     * @example
     * await ctx.scroll(0, 100); // Scroll down 100 pixels
     * await ctx.scroll(-50, 0); // Scroll left 50 pixels
     */
    TestContext.prototype.scroll = function (deltaX, deltaY) {
        return __awaiter(this, void 0, void 0, function () {
            var windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        windowId = 'window_1';
                        return [4 /*yield*/, this.bridge.send('scrollCanvas', { windowId: windowId, deltaX: deltaX, deltaY: deltaY })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drag from a position by delta X and Y
     * Uses Fyne's test.Drag in test mode
     * @param fromX - Starting X position
     * @param fromY - Starting Y position
     * @param deltaX - Horizontal drag distance
     * @param deltaY - Vertical drag distance
     * @example
     * await ctx.drag(100, 100, 50, 0); // Drag right from (100,100) by 50px
     */
    TestContext.prototype.drag = function (fromX, fromY, deltaX, deltaY) {
        return __awaiter(this, void 0, void 0, function () {
            var windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        windowId = 'window_1';
                        return [4 /*yield*/, this.bridge.send('dragCanvas', { windowId: windowId, fromX: fromX, fromY: fromY, deltaX: deltaX, deltaY: deltaY })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Focus the next focusable widget (tab navigation)
     * Uses Fyne's test.FocusNext in test mode
     * @example
     * await ctx.focusNext(); // Simulate pressing Tab
     */
    TestContext.prototype.focusNext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        windowId = 'window_1';
                        return [4 /*yield*/, this.bridge.send('focusNext', { windowId: windowId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Focus the previous focusable widget (shift-tab navigation)
     * Uses Fyne's test.FocusPrevious in test mode
     * @example
     * await ctx.focusPrevious(); // Simulate pressing Shift+Tab
     */
    TestContext.prototype.focusPrevious = function () {
        return __awaiter(this, void 0, void 0, function () {
            var windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        windowId = 'window_1';
                        return [4 /*yield*/, this.bridge.send('focusPrevious', { windowId: windowId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TestContext.prototype.captureScreenshot = function (path) {
        return __awaiter(this, void 0, void 0, function () {
            var windowId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        windowId = 'window_0';
                        return [4 /*yield*/, this.bridge.send('captureWindow', { windowId: windowId, path: path })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return TestContext;
}());
exports.TestContext = TestContext;
