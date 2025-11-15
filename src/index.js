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
exports.describeBrowser = exports.browserTest = exports.TsyneBrowserTest = exports.createBrowser = exports.Browser = exports.FontStyle = exports.FontFamily = exports.StyleSheet = exports.getStyleSheet = exports.clearStyles = exports.styles = exports.Model = exports.ViewModel = exports.DialogResult = exports.TwoWayBinding = exports.StateStore = exports.ComputedState = exports.ObservableState = exports.GridWrap = exports.Border = exports.Image = exports.RichText = exports.Tree = exports.Form = exports.Accordion = exports.Card = exports.Center = exports.List = exports.Table = exports.Toolbar = exports.Tabs = exports.Split = exports.RadioGroup = exports.Grid = exports.Scroll = exports.ProgressBar = exports.Slider = exports.Select = exports.Checkbox = exports.HBox = exports.VBox = exports.Hyperlink = exports.Separator = exports.PasswordEntry = exports.MultiLineEntry = exports.Entry = exports.Label = exports.Button = exports.Window = exports.App = void 0;
exports.TsyneStorage = exports.registerDialogHandlers = exports.setBrowserGlobals = exports.initializeGlobals = exports.runBrowserTests = void 0;
exports.__setGlobalContext = __setGlobalContext;
exports.app = app;
exports.window = window;
exports.vbox = vbox;
exports.hbox = hbox;
exports.button = button;
exports.label = label;
exports.entry = entry;
exports.multilineentry = multilineentry;
exports.passwordentry = passwordentry;
exports.separator = separator;
exports.hyperlink = hyperlink;
exports.checkbox = checkbox;
exports.select = select;
exports.slider = slider;
exports.progressbar = progressbar;
exports.scroll = scroll;
exports.grid = grid;
exports.radiogroup = radiogroup;
exports.hsplit = hsplit;
exports.vsplit = vsplit;
exports.tabs = tabs;
exports.toolbar = toolbar;
exports.table = table;
exports.list = list;
exports.center = center;
exports.card = card;
exports.accordion = accordion;
exports.form = form;
exports.tree = tree;
exports.richtext = richtext;
exports.image = image;
exports.border = border;
exports.gridwrap = gridwrap;
exports.setTheme = setTheme;
exports.getTheme = getTheme;
var app_1 = require("./app");
Object.defineProperty(exports, "App", { enumerable: true, get: function () { return app_1.App; } });
var widgets_1 = require("./widgets");
Object.defineProperty(exports, "Button", { enumerable: true, get: function () { return widgets_1.Button; } });
Object.defineProperty(exports, "Label", { enumerable: true, get: function () { return widgets_1.Label; } });
Object.defineProperty(exports, "Entry", { enumerable: true, get: function () { return widgets_1.Entry; } });
Object.defineProperty(exports, "MultiLineEntry", { enumerable: true, get: function () { return widgets_1.MultiLineEntry; } });
Object.defineProperty(exports, "PasswordEntry", { enumerable: true, get: function () { return widgets_1.PasswordEntry; } });
Object.defineProperty(exports, "Separator", { enumerable: true, get: function () { return widgets_1.Separator; } });
Object.defineProperty(exports, "Hyperlink", { enumerable: true, get: function () { return widgets_1.Hyperlink; } });
Object.defineProperty(exports, "VBox", { enumerable: true, get: function () { return widgets_1.VBox; } });
Object.defineProperty(exports, "HBox", { enumerable: true, get: function () { return widgets_1.HBox; } });
Object.defineProperty(exports, "Checkbox", { enumerable: true, get: function () { return widgets_1.Checkbox; } });
Object.defineProperty(exports, "Select", { enumerable: true, get: function () { return widgets_1.Select; } });
Object.defineProperty(exports, "Slider", { enumerable: true, get: function () { return widgets_1.Slider; } });
Object.defineProperty(exports, "ProgressBar", { enumerable: true, get: function () { return widgets_1.ProgressBar; } });
Object.defineProperty(exports, "Scroll", { enumerable: true, get: function () { return widgets_1.Scroll; } });
Object.defineProperty(exports, "Grid", { enumerable: true, get: function () { return widgets_1.Grid; } });
Object.defineProperty(exports, "RadioGroup", { enumerable: true, get: function () { return widgets_1.RadioGroup; } });
Object.defineProperty(exports, "Split", { enumerable: true, get: function () { return widgets_1.Split; } });
Object.defineProperty(exports, "Tabs", { enumerable: true, get: function () { return widgets_1.Tabs; } });
Object.defineProperty(exports, "Toolbar", { enumerable: true, get: function () { return widgets_1.Toolbar; } });
Object.defineProperty(exports, "Table", { enumerable: true, get: function () { return widgets_1.Table; } });
Object.defineProperty(exports, "List", { enumerable: true, get: function () { return widgets_1.List; } });
Object.defineProperty(exports, "Center", { enumerable: true, get: function () { return widgets_1.Center; } });
Object.defineProperty(exports, "Card", { enumerable: true, get: function () { return widgets_1.Card; } });
Object.defineProperty(exports, "Accordion", { enumerable: true, get: function () { return widgets_1.Accordion; } });
Object.defineProperty(exports, "Form", { enumerable: true, get: function () { return widgets_1.Form; } });
Object.defineProperty(exports, "Tree", { enumerable: true, get: function () { return widgets_1.Tree; } });
Object.defineProperty(exports, "RichText", { enumerable: true, get: function () { return widgets_1.RichText; } });
Object.defineProperty(exports, "Image", { enumerable: true, get: function () { return widgets_1.Image; } });
Object.defineProperty(exports, "Border", { enumerable: true, get: function () { return widgets_1.Border; } });
Object.defineProperty(exports, "GridWrap", { enumerable: true, get: function () { return widgets_1.GridWrap; } });
var window_1 = require("./window");
Object.defineProperty(exports, "Window", { enumerable: true, get: function () { return window_1.Window; } });
// Global context for the declarative API
var globalApp = null;
var globalContext = null;
/**
 * Set the global app and context (used by test framework)
 * @internal
 */
function __setGlobalContext(app, context) {
    globalApp = app;
    globalContext = context;
}
/**
 * Create and run an application with declarative syntax
 * The builder receives the app instance for scoped declarative API (proper IoC/DI)
 */
function app(options, builder) {
    var appInstance = new app_1.App(options);
    // For backward compatibility, also set global context
    globalApp = appInstance;
    globalContext = appInstance.ctx;
    builder(appInstance);
    appInstance.run();
    return appInstance;
}
/**
 * Create a window in the current app context
 */
function window(options, builder) {
    if (!globalApp) {
        throw new Error('window() must be called within an app() context');
    }
    return globalApp.window(options, builder);
}
/**
 * Create a vertical box container
 */
function vbox(builder) {
    if (!globalContext) {
        throw new Error('vbox() must be called within an app context');
    }
    return new widgets_1.VBox(globalContext, builder);
}
/**
 * Create a horizontal box container
 */
function hbox(builder) {
    if (!globalContext) {
        throw new Error('hbox() must be called within an app context');
    }
    return new widgets_1.HBox(globalContext, builder);
}
/**
 * Create a button widget
 */
function button(text, onClick) {
    if (!globalContext) {
        throw new Error('button() must be called within an app context');
    }
    return new widgets_1.Button(globalContext, text, onClick);
}
/**
 * Create a label widget
 */
function label(text) {
    if (!globalContext) {
        throw new Error('label() must be called within an app context');
    }
    return new widgets_1.Label(globalContext, text);
}
/**
 * Create an entry (text input) widget
 */
function entry(placeholder, onSubmit) {
    if (!globalContext) {
        throw new Error('entry() must be called within an app context');
    }
    return new widgets_1.Entry(globalContext, placeholder, onSubmit);
}
/**
 * Create a multi-line entry (text area) widget
 */
function multilineentry(placeholder, wrapping) {
    if (!globalContext) {
        throw new Error('multilineentry() must be called within an app context');
    }
    return new widgets_1.MultiLineEntry(globalContext, placeholder, wrapping);
}
/**
 * Create a password entry widget (masked text input)
 */
function passwordentry(placeholder) {
    if (!globalContext) {
        throw new Error('passwordentry() must be called within an app context');
    }
    return new widgets_1.PasswordEntry(globalContext, placeholder);
}
/**
 * Create a separator widget (horizontal line)
 */
function separator() {
    if (!globalContext) {
        throw new Error('separator() must be called within an app context');
    }
    return new widgets_1.Separator(globalContext);
}
/**
 * Create a hyperlink widget (clickable URL)
 */
function hyperlink(text, url) {
    if (!globalContext) {
        throw new Error('hyperlink() must be called within an app context');
    }
    return new widgets_1.Hyperlink(globalContext, text, url);
}
/**
 * Create a checkbox widget
 */
function checkbox(text, onChanged) {
    if (!globalContext) {
        throw new Error('checkbox() must be called within an app context');
    }
    return new widgets_1.Checkbox(globalContext, text, onChanged);
}
/**
 * Create a select (dropdown) widget
 */
function select(options, onSelected) {
    if (!globalContext) {
        throw new Error('select() must be called within an app context');
    }
    return new widgets_1.Select(globalContext, options, onSelected);
}
/**
 * Create a slider widget
 */
function slider(min, max, initialValue, onChanged) {
    if (!globalContext) {
        throw new Error('slider() must be called within an app context');
    }
    return new widgets_1.Slider(globalContext, min, max, initialValue, onChanged);
}
/**
 * Create a progress bar widget
 */
function progressbar(initialValue, infinite) {
    if (!globalContext) {
        throw new Error('progressbar() must be called within an app context');
    }
    return new widgets_1.ProgressBar(globalContext, initialValue, infinite);
}
/**
 * Create a scroll container
 */
function scroll(builder) {
    if (!globalContext) {
        throw new Error('scroll() must be called within an app context');
    }
    return new widgets_1.Scroll(globalContext, builder);
}
/**
 * Create a grid layout container
 */
function grid(columns, builder) {
    if (!globalContext) {
        throw new Error('grid() must be called within an app context');
    }
    return new widgets_1.Grid(globalContext, columns, builder);
}
/**
 * Create a radio group widget
 */
function radiogroup(options, initialSelected, onSelected) {
    if (!globalContext) {
        throw new Error('radiogroup() must be called within an app context');
    }
    return new widgets_1.RadioGroup(globalContext, options, initialSelected, onSelected);
}
/**
 * Create a horizontal split container
 */
function hsplit(leadingBuilder, trailingBuilder, offset) {
    if (!globalContext) {
        throw new Error('hsplit() must be called within an app context');
    }
    return new widgets_1.Split(globalContext, 'horizontal', leadingBuilder, trailingBuilder, offset);
}
/**
 * Create a vertical split container
 */
function vsplit(leadingBuilder, trailingBuilder, offset) {
    if (!globalContext) {
        throw new Error('vsplit() must be called within an app context');
    }
    return new widgets_1.Split(globalContext, 'vertical', leadingBuilder, trailingBuilder, offset);
}
/**
 * Create a tabs container
 */
function tabs(tabDefinitions, location) {
    if (!globalContext) {
        throw new Error('tabs() must be called within an app context');
    }
    return new widgets_1.Tabs(globalContext, tabDefinitions, location);
}
/**
 * Create a toolbar
 */
function toolbar(toolbarItems) {
    if (!globalContext) {
        throw new Error('toolbar() must be called within an app context');
    }
    return new widgets_1.Toolbar(globalContext, toolbarItems);
}
/**
 * Create a table
 */
function table(headers, data) {
    if (!globalContext) {
        throw new Error('table() must be called within an app context');
    }
    return new widgets_1.Table(globalContext, headers, data);
}
/**
 * Create a list
 */
function list(items, onSelected) {
    if (!globalContext) {
        throw new Error('list() must be called within an app context');
    }
    return new widgets_1.List(globalContext, items, onSelected);
}
/**
 * Create a center layout (centers content)
 */
function center(builder) {
    if (!globalContext) {
        throw new Error('center() must be called within an app context');
    }
    return new widgets_1.Center(globalContext, builder);
}
/**
 * Create a card container with title, subtitle, and content
 */
function card(title, subtitle, builder) {
    if (!globalContext) {
        throw new Error('card() must be called within an app context');
    }
    return new widgets_1.Card(globalContext, title, subtitle, builder);
}
/**
 * Create an accordion (collapsible sections)
 */
function accordion(items) {
    if (!globalContext) {
        throw new Error('accordion() must be called within an app context');
    }
    return new widgets_1.Accordion(globalContext, items);
}
/**
 * Create a form with labeled fields and submit/cancel buttons
 */
function form(items, onSubmit, onCancel) {
    if (!globalContext) {
        throw new Error('form() must be called within an app context');
    }
    return new widgets_1.Form(globalContext, items, onSubmit, onCancel);
}
/**
 * Create a tree widget for hierarchical data
 */
function tree(rootLabel) {
    if (!globalContext) {
        throw new Error('tree() must be called within an app context');
    }
    return new widgets_1.Tree(globalContext, rootLabel);
}
/**
 * Create a rich text widget with formatted text segments
 */
function richtext(segments) {
    if (!globalContext) {
        throw new Error('richtext() must be called within an app context');
    }
    return new widgets_1.RichText(globalContext, segments);
}
/**
 * Create an image widget
 */
function image(path, fillMode) {
    if (!globalContext) {
        throw new Error('image() must be called within an app context');
    }
    return new widgets_1.Image(globalContext, path, fillMode);
}
/**
 * Create a border layout
 */
function border(config) {
    if (!globalContext) {
        throw new Error('border() must be called within an app context');
    }
    return new widgets_1.Border(globalContext, config);
}
/**
 * Create a grid wrap layout
 */
function gridwrap(itemWidth, itemHeight, builder) {
    if (!globalContext) {
        throw new Error('gridwrap() must be called within an app context');
    }
    return new widgets_1.GridWrap(globalContext, itemWidth, itemHeight, builder);
}
/**
 * Set the application theme
 */
function setTheme(theme) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!globalApp) {
                        throw new Error('setTheme() must be called within an app context');
                    }
                    return [4 /*yield*/, globalApp.setTheme(theme)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get the current application theme
 */
function getTheme() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!globalApp) {
                        throw new Error('getTheme() must be called within an app context');
                    }
                    return [4 /*yield*/, globalApp.getTheme()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Export state management utilities
var state_1 = require("./state");
Object.defineProperty(exports, "ObservableState", { enumerable: true, get: function () { return state_1.ObservableState; } });
Object.defineProperty(exports, "ComputedState", { enumerable: true, get: function () { return state_1.ComputedState; } });
Object.defineProperty(exports, "StateStore", { enumerable: true, get: function () { return state_1.StateStore; } });
Object.defineProperty(exports, "TwoWayBinding", { enumerable: true, get: function () { return state_1.TwoWayBinding; } });
Object.defineProperty(exports, "DialogResult", { enumerable: true, get: function () { return state_1.DialogResult; } });
Object.defineProperty(exports, "ViewModel", { enumerable: true, get: function () { return state_1.ViewModel; } });
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return state_1.Model; } });
// Export styling system
var styles_1 = require("./styles");
Object.defineProperty(exports, "styles", { enumerable: true, get: function () { return styles_1.styles; } });
Object.defineProperty(exports, "clearStyles", { enumerable: true, get: function () { return styles_1.clearStyles; } });
Object.defineProperty(exports, "getStyleSheet", { enumerable: true, get: function () { return styles_1.getStyleSheet; } });
Object.defineProperty(exports, "StyleSheet", { enumerable: true, get: function () { return styles_1.StyleSheet; } });
Object.defineProperty(exports, "FontFamily", { enumerable: true, get: function () { return styles_1.FontFamily; } });
Object.defineProperty(exports, "FontStyle", { enumerable: true, get: function () { return styles_1.FontStyle; } });
// Export browser system
var browser_1 = require("./browser");
Object.defineProperty(exports, "Browser", { enumerable: true, get: function () { return browser_1.Browser; } });
Object.defineProperty(exports, "createBrowser", { enumerable: true, get: function () { return browser_1.createBrowser; } });
// Export browser testing
var tsyne_browser_test_1 = require("./tsyne-browser-test");
Object.defineProperty(exports, "TsyneBrowserTest", { enumerable: true, get: function () { return tsyne_browser_test_1.TsyneBrowserTest; } });
Object.defineProperty(exports, "browserTest", { enumerable: true, get: function () { return tsyne_browser_test_1.browserTest; } });
Object.defineProperty(exports, "describeBrowser", { enumerable: true, get: function () { return tsyne_browser_test_1.describeBrowser; } });
Object.defineProperty(exports, "runBrowserTests", { enumerable: true, get: function () { return tsyne_browser_test_1.runBrowserTests; } });
// Export browser compatibility globals
var globals_1 = require("./globals");
Object.defineProperty(exports, "initializeGlobals", { enumerable: true, get: function () { return globals_1.initializeGlobals; } });
Object.defineProperty(exports, "setBrowserGlobals", { enumerable: true, get: function () { return globals_1.setBrowserGlobals; } });
Object.defineProperty(exports, "registerDialogHandlers", { enumerable: true, get: function () { return globals_1.registerDialogHandlers; } });
Object.defineProperty(exports, "TsyneStorage", { enumerable: true, get: function () { return globals_1.TsyneStorage; } });
