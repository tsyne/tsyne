"use strict";
/**
 * Tsyne Styling System
 *
 * Provides CSS-like styling for widgets similar to Swiby's stylesheet approach.
 * Styles can be defined for widget types and are automatically applied when widgets are created.
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
exports.StyleSheet = exports.FontStyle = exports.FontFamily = void 0;
exports.styles = styles;
exports.getStyleSheet = getStyleSheet;
exports.clearStyles = clearStyles;
exports.applyStyleToWidget = applyStyleToWidget;
exports.applyStyleForWidget = applyStyleForWidget;
/**
 * Font families available in Fyne
 */
var FontFamily;
(function (FontFamily) {
    FontFamily["SANS_SERIF"] = "sans-serif";
    FontFamily["SERIF"] = "serif";
    FontFamily["MONOSPACE"] = "monospace";
})(FontFamily || (exports.FontFamily = FontFamily = {}));
/**
 * Font styles
 */
var FontStyle;
(function (FontStyle) {
    FontStyle["NORMAL"] = "normal";
    FontStyle["ITALIC"] = "italic";
    FontStyle["BOLD"] = "bold";
    FontStyle["BOLD_ITALIC"] = "bold-italic";
})(FontStyle || (exports.FontStyle = FontStyle = {}));
/**
 * StyleSheet stores styles for different widget types
 */
var StyleSheet = /** @class */ (function () {
    function StyleSheet() {
        this.styles = new Map();
    }
    /**
     * Set style for a widget type
     */
    StyleSheet.prototype.style = function (selector, style) {
        // Merge with existing styles for this selector
        var existing = this.styles.get(selector) || {};
        this.styles.set(selector, __assign(__assign({}, existing), style));
    };
    /**
     * Get style for a widget type
     */
    StyleSheet.prototype.getStyle = function (selector) {
        return this.styles.get(selector);
    };
    /**
     * Get computed style for a widget, combining root and specific styles
     */
    StyleSheet.prototype.getComputedStyle = function (selector) {
        var rootStyle = this.styles.get('root') || {};
        var specificStyle = this.styles.get(selector) || {};
        return __assign(__assign({}, rootStyle), specificStyle);
    };
    /**
     * Clear all styles
     */
    StyleSheet.prototype.clear = function () {
        this.styles.clear();
    };
    return StyleSheet;
}());
exports.StyleSheet = StyleSheet;
/**
 * Global stylesheet instance
 */
var globalStyleSheet = null;
/**
 * Define styles using a declarative syntax similar to Swiby
 *
 * @example
 * styles({
 *   root: {
 *     font_family: FontFamily.SANS_SERIF,
 *     font_size: 10
 *   },
 *   label: {
 *     font_style: FontStyle.ITALIC,
 *     color: 0xAA0000
 *   },
 *   button: {
 *     font_weight: 'bold'
 *   }
 * });
 */
function styles(styleDefinitions) {
    if (!globalStyleSheet) {
        globalStyleSheet = new StyleSheet();
    }
    // Apply all style definitions
    for (var _i = 0, _a = Object.entries(styleDefinitions); _i < _a.length; _i++) {
        var _b = _a[_i], selector = _b[0], style = _b[1];
        if (style) {
            globalStyleSheet.style(selector, style);
        }
    }
    return globalStyleSheet;
}
/**
 * Get the global stylesheet
 */
function getStyleSheet() {
    return globalStyleSheet;
}
/**
 * Clear all styles
 */
function clearStyles() {
    if (globalStyleSheet) {
        globalStyleSheet.clear();
    }
    globalStyleSheet = null;
}
/**
 * Apply a style to a widget via the bridge
 */
function applyStyleToWidget(ctx, widgetId, style) {
    return __awaiter(this, void 0, void 0, function () {
        var stylePayload, fontStyle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stylePayload = { widgetId: widgetId };
                    if (style.color !== undefined) {
                        stylePayload.color = typeof style.color === 'number'
                            ? "#".concat(style.color.toString(16).padStart(6, '0'))
                            : style.color;
                    }
                    if (style.background_color !== undefined) {
                        stylePayload.backgroundColor = typeof style.background_color === 'number'
                            ? "#".concat(style.background_color.toString(16).padStart(6, '0'))
                            : style.background_color;
                    }
                    if (style.font_style !== undefined || style.font_weight !== undefined) {
                        fontStyle = 'normal';
                        if (style.font_style === FontStyle.ITALIC || style.font_style === 'italic') {
                            fontStyle = 'italic';
                        }
                        else if (style.font_style === FontStyle.BOLD || style.font_style === 'bold') {
                            fontStyle = 'bold';
                        }
                        else if (style.font_style === FontStyle.BOLD_ITALIC || style.font_style === 'bold-italic') {
                            fontStyle = 'bold-italic';
                        }
                        // Override with font_weight if specified
                        if (style.font_weight === 'bold') {
                            fontStyle = fontStyle === 'italic' ? 'bold-italic' : 'bold';
                        }
                        stylePayload.fontStyle = fontStyle;
                    }
                    if (style.font_family !== undefined) {
                        stylePayload.fontFamily = style.font_family;
                    }
                    if (style.font_size !== undefined) {
                        stylePayload.fontSize = style.font_size;
                    }
                    if (style.text_align !== undefined) {
                        stylePayload.textAlign = style.text_align;
                    }
                    if (!(Object.keys(stylePayload).length > 1)) return [3 /*break*/, 2];
                    return [4 /*yield*/, ctx.bridge.send('setWidgetStyle', stylePayload)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get computed style for a widget type and apply it
 */
function applyStyleForWidget(ctx, widgetId, widgetType) {
    return __awaiter(this, void 0, void 0, function () {
        var stylesheet, style;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stylesheet = getStyleSheet();
                    if (!stylesheet)
                        return [2 /*return*/];
                    style = stylesheet.getComputedStyle(widgetType);
                    if (!(Object.keys(style).length > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, applyStyleToWidget(ctx, widgetId, style)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
