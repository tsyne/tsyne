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
exports.App = void 0;
var fynebridge_1 = require("./fynebridge");
var context_1 = require("./context");
var window_1 = require("./window");
var widgets_1 = require("./widgets");
var globals_1 = require("./globals");
/**
 * App is the main application class
 */
var App = /** @class */ (function () {
    function App(options, testMode) {
        if (testMode === void 0) { testMode = false; }
        this.windows = [];
        // Initialize browser compatibility globals
        (0, globals_1.initializeGlobals)();
        this.bridge = new fynebridge_1.BridgeConnection(testMode);
        this.ctx = new context_1.Context(this.bridge);
    }
    App.prototype.getContext = function () {
        return this.ctx;
    };
    App.prototype.getBridge = function () {
        return this.bridge;
    };
    App.prototype.window = function (options, builder) {
        var win = new window_1.Window(this.ctx, options, builder);
        this.windows.push(win);
        return win;
    };
    // Scoped declarative API methods - these use the app's context (proper IoC/DI)
    App.prototype.vbox = function (builder) {
        return new widgets_1.VBox(this.ctx, builder);
    };
    App.prototype.hbox = function (builder) {
        return new widgets_1.HBox(this.ctx, builder);
    };
    App.prototype.button = function (text, onClick, importance) {
        return new widgets_1.Button(this.ctx, text, onClick, importance);
    };
    App.prototype.label = function (text, alignment, wrapping, textStyle, classNames) {
        return new widgets_1.Label(this.ctx, text, alignment, wrapping, textStyle, classNames);
    };
    App.prototype.entry = function (placeholder, onSubmit, minWidth, onDoubleClick) {
        return new widgets_1.Entry(this.ctx, placeholder, onSubmit, minWidth, onDoubleClick);
    };
    App.prototype.multilineentry = function (placeholder, wrapping) {
        return new widgets_1.MultiLineEntry(this.ctx, placeholder, wrapping);
    };
    App.prototype.passwordentry = function (placeholder, onSubmit) {
        return new widgets_1.PasswordEntry(this.ctx, placeholder, onSubmit);
    };
    App.prototype.separator = function () {
        return new widgets_1.Separator(this.ctx);
    };
    App.prototype.hyperlink = function (text, url) {
        return new widgets_1.Hyperlink(this.ctx, text, url);
    };
    App.prototype.checkbox = function (text, onChanged) {
        return new widgets_1.Checkbox(this.ctx, text, onChanged);
    };
    App.prototype.select = function (options, onSelected) {
        return new widgets_1.Select(this.ctx, options, onSelected);
    };
    App.prototype.slider = function (min, max, initialValue, onChanged) {
        return new widgets_1.Slider(this.ctx, min, max, initialValue, onChanged);
    };
    App.prototype.progressbar = function (initialValue, infinite) {
        return new widgets_1.ProgressBar(this.ctx, initialValue, infinite);
    };
    App.prototype.scroll = function (builder) {
        return new widgets_1.Scroll(this.ctx, builder);
    };
    App.prototype.grid = function (columns, builder) {
        return new widgets_1.Grid(this.ctx, columns, builder);
    };
    App.prototype.radiogroup = function (options, initialSelected, onSelected) {
        return new widgets_1.RadioGroup(this.ctx, options, initialSelected, onSelected);
    };
    App.prototype.hsplit = function (leadingBuilder, trailingBuilder, offset) {
        return new widgets_1.Split(this.ctx, 'horizontal', leadingBuilder, trailingBuilder, offset);
    };
    App.prototype.vsplit = function (leadingBuilder, trailingBuilder, offset) {
        return new widgets_1.Split(this.ctx, 'vertical', leadingBuilder, trailingBuilder, offset);
    };
    App.prototype.tabs = function (tabDefinitions, location) {
        return new widgets_1.Tabs(this.ctx, tabDefinitions, location);
    };
    App.prototype.toolbar = function (toolbarItems) {
        return new widgets_1.Toolbar(this.ctx, toolbarItems);
    };
    App.prototype.table = function (headers, data) {
        return new widgets_1.Table(this.ctx, headers, data);
    };
    App.prototype.list = function (items, onSelected) {
        return new widgets_1.List(this.ctx, items, onSelected);
    };
    App.prototype.center = function (builder) {
        return new widgets_1.Center(this.ctx, builder);
    };
    App.prototype.card = function (title, subtitle, builder) {
        return new widgets_1.Card(this.ctx, title, subtitle, builder);
    };
    App.prototype.accordion = function (items) {
        return new widgets_1.Accordion(this.ctx, items);
    };
    App.prototype.form = function (items, onSubmit, onCancel) {
        return new widgets_1.Form(this.ctx, items, onSubmit, onCancel);
    };
    App.prototype.tree = function (rootLabel) {
        return new widgets_1.Tree(this.ctx, rootLabel);
    };
    App.prototype.richtext = function (segments) {
        return new widgets_1.RichText(this.ctx, segments);
    };
    App.prototype.image = function (path, fillMode, onClick, onDrag, onDragEnd) {
        return new widgets_1.Image(this.ctx, path, fillMode, onClick, onDrag, onDragEnd);
    };
    App.prototype.border = function (config) {
        return new widgets_1.Border(this.ctx, config);
    };
    App.prototype.gridwrap = function (itemWidth, itemHeight, builder) {
        return new widgets_1.GridWrap(this.ctx, itemWidth, itemHeight, builder);
    };
    App.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, win;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.windows;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        win = _a[_i];
                        return [4 /*yield*/, win.show()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.quit = function () {
        this.ctx.bridge.quit();
    };
    App.prototype.setTheme = function (theme) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setTheme', { theme: theme })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.getTheme = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getTheme', {})];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.theme];
                }
            });
        });
    };
    App.prototype.getWindows = function () {
        return this.windows;
    };
    return App;
}());
exports.App = App;
