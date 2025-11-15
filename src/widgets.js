"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.GridWrap = exports.Border = exports.Image = exports.RichText = exports.Tree = exports.Form = exports.Accordion = exports.Card = exports.Center = exports.List = exports.Table = exports.Toolbar = exports.Tabs = exports.Split = exports.RadioGroup = exports.Grid = exports.Scroll = exports.ProgressBar = exports.Slider = exports.Select = exports.Checkbox = exports.HBox = exports.VBox = exports.ModelBoundList = exports.Hyperlink = exports.Separator = exports.PasswordEntry = exports.MultiLineEntry = exports.Entry = exports.Label = exports.Button = exports.Widget = void 0;
var styles_1 = require("./styles");
/**
 * Base class for all widgets
 */
var Widget = /** @class */ (function () {
    function Widget(ctx, id) {
        this.ctx = ctx;
        this.id = id;
    }
    /**
     * Apply styles from the global stylesheet to this widget
     */
    Widget.prototype.applyStyles = function (widgetType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, styles_1.applyStyleForWidget)(this.ctx, this.id, widgetType)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set context menu for this widget (shown on right-click)
     */
    Widget.prototype.setContextMenu = function (items) {
        return __awaiter(this, void 0, void 0, function () {
            var menuItems;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        menuItems = items.map(function (item) {
                            if (item.isSeparator) {
                                return { isSeparator: true };
                            }
                            var callbackId = _this.ctx.generateId('callback');
                            _this.ctx.bridge.registerEventHandler(callbackId, function () { return item.onSelected(); });
                            return {
                                label: item.label,
                                callbackId: callbackId,
                                disabled: item.disabled,
                                checked: item.checked
                            };
                        });
                        return [4 /*yield*/, this.ctx.bridge.send('setWidgetContextMenu', {
                                widgetId: this.id,
                                items: menuItems
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Widget.prototype.setText = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setText', {
                            widgetId: this.id,
                            text: text
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Widget.prototype.getText = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getText', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.text];
                }
            });
        });
    };
    Widget.prototype.hide = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('hideWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Widget.prototype.show = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('showWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Register a custom ID for this widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const statusLabel = a.label('').withId('statusLabel');
     * // In tests: ctx.getByID('statusLabel')
     */
    Widget.prototype.withId = function (customId) {
        this.ctx.bridge.send('registerCustomId', {
            widgetId: this.id,
            customId: customId
        });
        return this;
    };
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether widget should be visible
     * @returns this for method chaining
     */
    Widget.prototype.ngShow = function (conditionFn) {
        var _this = this;
        var updateVisibility = function () { return __awaiter(_this, void 0, void 0, function () {
            var shouldShow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        shouldShow = conditionFn();
                        if (!shouldShow) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.show()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.hide()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    };
    /**
     * Refresh the widget - re-evaluates visibility conditions
     */
    Widget.prototype.refresh = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.visibilityCondition) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.visibilityCondition()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return Widget;
}());
exports.Widget = Widget;
/**
 * Button widget
 */
var Button = /** @class */ (function (_super) {
    __extends(Button, _super);
    function Button(ctx, text, onClick, importance) {
        var _this = this;
        var id = ctx.generateId('button');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, text: text };
        if (onClick) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function () {
                onClick();
            });
        }
        if (importance) {
            payload.importance = importance;
        }
        ctx.bridge.send('createButton', payload);
        ctx.addToCurrentContainer(id);
        _this.applyStyles('button').catch(function () { });
        return _this;
    }
    Button.prototype.disable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('disableWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Button.prototype.enable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('enableWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Button.prototype.isEnabled = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('isEnabled', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.enabled];
                }
            });
        });
    };
    return Button;
}(Widget));
exports.Button = Button;
/**
 * Label widget
 */
var Label = /** @class */ (function (_super) {
    __extends(Label, _super);
    function Label(ctx, text, alignment, wrapping, textStyle, classNames) {
        var _this = this;
        var id = ctx.generateId('label');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, text: text };
        if (alignment) {
            payload.alignment = alignment;
        }
        if (wrapping) {
            payload.wrapping = wrapping;
        }
        if (textStyle) {
            payload.textStyle = textStyle;
        }
        ctx.bridge.send('createLabel', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
        if (classNames) {
            _this.applyStylesFromClasses(classNames.split(/\s+/).filter(function (c) { return c.length > 0; })).catch(function () { });
        }
        else {
            _this.applyStyles('label').catch(function () { });
        }
        return _this;
    }
    Label.prototype.applyStylesFromClasses = function (classes) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, classes_1, className;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _i = 0, classes_1 = classes;
                        _a.label = 1;
                    case 1:
                        if (!(_i < classes_1.length)) return [3 /*break*/, 4];
                        className = classes_1[_i];
                        return [4 /*yield*/, this.applyStyles(className).catch(function () { })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                    // Also apply generic 'label' styles
                    return [4 /*yield*/, this.applyStyles('label').catch(function () { })];
                    case 5:
                        // Also apply generic 'label' styles
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Label;
}(Widget));
exports.Label = Label;
/**
 * Entry (text input) widget
 */
var Entry = /** @class */ (function (_super) {
    __extends(Entry, _super);
    function Entry(ctx, placeholder, onSubmit, minWidth, onDoubleClick) {
        var _this = this;
        var id = ctx.generateId('entry');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, placeholder: placeholder || '' };
        if (onSubmit) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onSubmit(data.text);
            });
        }
        if (onDoubleClick) {
            var doubleClickCallbackId = ctx.generateId('callback');
            payload.doubleClickCallbackId = doubleClickCallbackId;
            ctx.bridge.registerEventHandler(doubleClickCallbackId, function () {
                onDoubleClick();
            });
        }
        if (minWidth !== undefined) {
            payload.minWidth = minWidth;
        }
        ctx.bridge.send('createEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        _this.applyStyles('entry').catch(function () { });
        return _this;
    }
    Entry.prototype.disable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('disableWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Entry.prototype.enable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('enableWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Entry.prototype.focus = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('focusWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Entry.prototype.submit = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('submitEntry', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Entry;
}(Widget));
exports.Entry = Entry;
/**
 * Multi-line text entry widget
 */
var MultiLineEntry = /** @class */ (function (_super) {
    __extends(MultiLineEntry, _super);
    function MultiLineEntry(ctx, placeholder, wrapping) {
        var _this = this;
        var id = ctx.generateId('multilineentry');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, placeholder: placeholder || '' };
        if (wrapping) {
            payload.wrapping = wrapping;
        }
        ctx.bridge.send('createMultiLineEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        _this.applyStyles('multilineentry').catch(function () { });
        return _this;
    }
    return MultiLineEntry;
}(Widget));
exports.MultiLineEntry = MultiLineEntry;
/**
 * Password entry widget (text is masked)
 */
var PasswordEntry = /** @class */ (function (_super) {
    __extends(PasswordEntry, _super);
    function PasswordEntry(ctx, placeholder, onSubmit) {
        var _this = this;
        var id = ctx.generateId('passwordentry');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, placeholder: placeholder || '' };
        if (onSubmit) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onSubmit(data.text);
            });
        }
        ctx.bridge.send('createPasswordEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        _this.applyStyles('passwordentry').catch(function () { });
        return _this;
    }
    return PasswordEntry;
}(Widget));
exports.PasswordEntry = PasswordEntry;
/**
 * Separator widget (horizontal or vertical line)
 */
var Separator = /** @class */ (function () {
    function Separator(ctx) {
        this.ctx = ctx;
        this.id = ctx.generateId('separator');
        ctx.bridge.send('createSeparator', { id: this.id });
        ctx.addToCurrentContainer(this.id);
    }
    return Separator;
}());
exports.Separator = Separator;
/**
 * Hyperlink widget (clickable URL)
 */
var Hyperlink = /** @class */ (function () {
    function Hyperlink(ctx, text, url) {
        this.ctx = ctx;
        this.id = ctx.generateId('hyperlink');
        ctx.bridge.send('createHyperlink', { id: this.id, text: text, url: url });
        ctx.addToCurrentContainer(this.id);
    }
    return Hyperlink;
}());
exports.Hyperlink = Hyperlink;
/**
 * ModelBoundList - Smart list binding for containers (inspired by AngularJS ng-repeat)
 * Efficiently manages a list of items with intelligent diffing to avoid full rebuilds
 */
var ModelBoundList = /** @class */ (function () {
    function ModelBoundList(ctx, container, items) {
        this.keyFn = function (item) { return item; };
        this.trackedItems = new Map();
        this.ctx = ctx;
        this.container = container;
        this.items = items;
    }
    /**
     * Track items by key (like ng-repeat track by)
     * @param fn Function to extract unique key from item
     */
    ModelBoundList.prototype.trackBy = function (fn) {
        this.keyFn = fn;
        return this;
    };
    /**
     * Builder function for each item (called once per item)
     * @param builder Function that creates the view for an item
     */
    ModelBoundList.prototype.each = function (builder) {
        this.builderFn = builder;
        // Initial render - create views for all items
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var item = _a[_i];
            var key = this.keyFn(item);
            var widget = this.createItemView(item);
            this.trackedItems.set(key, widget);
        }
    };
    /**
     * Update the model - performs smart diff and only updates changed items
     * @param newItems New list of items
     */
    ModelBoundList.prototype.update = function (newItems) {
        var _this = this;
        if (!this.builderFn) {
            throw new Error('Must call each() before update()');
        }
        var newKeys = new Set(newItems.map(function (item) { return _this.keyFn(item); }));
        var oldKeys = new Set(this.trackedItems.keys());
        // Find items to remove (in old but not in new)
        var toRemove = Array.from(oldKeys).filter(function (key) { return !newKeys.has(key); });
        // Find items to add (in new but not in old)
        var toAdd = newItems.filter(function (item) { return !oldKeys.has(_this.keyFn(item)); });
        // If there are changes, rebuild the list
        // Future optimization: only add/remove changed items instead of full rebuild
        if (toRemove.length > 0 || toAdd.length > 0) {
            this.trackedItems.clear();
            this.container.removeAll();
            for (var _i = 0, newItems_1 = newItems; _i < newItems_1.length; _i++) {
                var item = newItems_1[_i];
                var key = this.keyFn(item);
                var widget = this.createItemView(item);
                this.trackedItems.set(key, widget);
            }
            this.container.refresh();
        }
        this.items = newItems;
    };
    /**
     * Refresh visibility of all items (re-evaluates ngShow conditions)
     */
    ModelBoundList.prototype.refreshVisibility = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, widget;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.trackedItems.values();
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        widget = _a[_i];
                        if (!(widget && widget.refreshVisibility)) return [3 /*break*/, 3];
                        return [4 /*yield*/, widget.refreshVisibility()];
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
    ModelBoundList.prototype.createItemView = function (item) {
        var _this = this;
        var widget;
        this.container.add(function () {
            widget = _this.builderFn(item);
        });
        return widget;
    };
    return ModelBoundList;
}());
exports.ModelBoundList = ModelBoundList;
/**
 * VBox container (vertical box layout)
 */
var VBox = /** @class */ (function () {
    function VBox(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('vbox');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        var children = ctx.popContainer();
        // Create the VBox with the children
        ctx.bridge.send('createVBox', { id: this.id, children: children });
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    VBox.prototype.add = function (builder) {
        // Push this container as the current context
        this.ctx.pushContainer();
        // Execute builder to create the widget
        builder();
        // Get the widget IDs that were just created
        var newChildren = this.ctx.popContainer();
        // Send add command to bridge for each child
        for (var _i = 0, newChildren_1 = newChildren; _i < newChildren_1.length; _i++) {
            var childId = newChildren_1[_i];
            this.ctx.bridge.send('containerAdd', {
                containerId: this.id,
                childId: childId
            });
        }
    };
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    VBox.prototype.removeAll = function () {
        this.ctx.bridge.send('containerRemoveAll', {
            containerId: this.id
        });
    };
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    VBox.prototype.refresh = function () {
        this.ctx.bridge.send('containerRefresh', {
            containerId: this.id
        });
    };
    /**
     * Create a model-bound list for smart list rendering (AngularJS ng-repeat style)
     * @param items Initial array of items
     * @returns ModelBoundList instance for chaining trackBy() and each()
     */
    VBox.prototype.model = function (items) {
        return new ModelBoundList(this.ctx, this, items);
    };
    VBox.prototype.hide = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('hideWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    VBox.prototype.show = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('showWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    VBox.prototype.ngShow = function (conditionFn) {
        var _this = this;
        var updateVisibility = function () { return __awaiter(_this, void 0, void 0, function () {
            var shouldShow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        shouldShow = conditionFn();
                        if (!shouldShow) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.show()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.hide()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    };
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    VBox.prototype.refreshVisibility = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.visibilityCondition) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.visibilityCondition()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return VBox;
}());
exports.VBox = VBox;
/**
 * HBox container (horizontal box layout)
 */
var HBox = /** @class */ (function () {
    function HBox(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('hbox');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        var children = ctx.popContainer();
        // Create the HBox with the children
        ctx.bridge.send('createHBox', { id: this.id, children: children });
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    HBox.prototype.add = function (builder) {
        // Push this container as the current context
        this.ctx.pushContainer();
        // Execute builder to create the widget
        builder();
        // Get the widget IDs that were just created
        var newChildren = this.ctx.popContainer();
        // Send add command to bridge for each child
        for (var _i = 0, newChildren_2 = newChildren; _i < newChildren_2.length; _i++) {
            var childId = newChildren_2[_i];
            this.ctx.bridge.send('containerAdd', {
                containerId: this.id,
                childId: childId
            });
        }
    };
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    HBox.prototype.removeAll = function () {
        this.ctx.bridge.send('containerRemoveAll', {
            containerId: this.id
        });
    };
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    HBox.prototype.refresh = function () {
        this.ctx.bridge.send('containerRefresh', {
            containerId: this.id
        });
    };
    HBox.prototype.hide = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('hideWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HBox.prototype.show = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('showWidget', {
                            widgetId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    HBox.prototype.ngShow = function (conditionFn) {
        var _this = this;
        var updateVisibility = function () { return __awaiter(_this, void 0, void 0, function () {
            var shouldShow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        shouldShow = conditionFn();
                        if (!shouldShow) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.show()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.hide()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    };
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    HBox.prototype.refreshVisibility = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.visibilityCondition) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.visibilityCondition()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return HBox;
}());
exports.HBox = HBox;
/**
 * Checkbox widget
 */
var Checkbox = /** @class */ (function (_super) {
    __extends(Checkbox, _super);
    function Checkbox(ctx, text, onChanged) {
        var _this = this;
        var id = ctx.generateId('checkbox');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, text: text };
        if (onChanged) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onChanged(data.checked);
            });
        }
        ctx.bridge.send('createCheckbox', payload);
        ctx.addToCurrentContainer(id);
        return _this;
    }
    Checkbox.prototype.setChecked = function (checked) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setChecked', {
                            widgetId: this.id,
                            checked: checked
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Checkbox.prototype.getChecked = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getChecked', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.checked];
                }
            });
        });
    };
    return Checkbox;
}(Widget));
exports.Checkbox = Checkbox;
/**
 * Select (dropdown) widget
 */
var Select = /** @class */ (function (_super) {
    __extends(Select, _super);
    function Select(ctx, options, onSelected) {
        var _this = this;
        var id = ctx.generateId('select');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, options: options };
        if (onSelected) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onSelected(data.selected);
            });
        }
        ctx.bridge.send('createSelect', payload);
        ctx.addToCurrentContainer(id);
        return _this;
    }
    Select.prototype.setSelected = function (selected) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setSelected', {
                            widgetId: this.id,
                            selected: selected
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Select.prototype.getSelected = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getSelected', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.selected];
                }
            });
        });
    };
    return Select;
}(Widget));
exports.Select = Select;
/**
 * Slider widget
 */
var Slider = /** @class */ (function (_super) {
    __extends(Slider, _super);
    function Slider(ctx, min, max, initialValue, onChanged) {
        var _this = this;
        var id = ctx.generateId('slider');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, min: min, max: max };
        if (initialValue !== undefined) {
            payload.value = initialValue;
        }
        if (onChanged) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onChanged(data.value);
            });
        }
        ctx.bridge.send('createSlider', payload);
        ctx.addToCurrentContainer(id);
        return _this;
    }
    Slider.prototype.setValue = function (value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setValue', {
                            widgetId: this.id,
                            value: value
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Slider.prototype.getValue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getValue', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.value];
                }
            });
        });
    };
    return Slider;
}(Widget));
exports.Slider = Slider;
/**
 * ProgressBar widget
 */
var ProgressBar = /** @class */ (function (_super) {
    __extends(ProgressBar, _super);
    function ProgressBar(ctx, initialValue, infinite) {
        var _this = this;
        var id = ctx.generateId('progressbar');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, infinite: infinite || false };
        if (!infinite && initialValue !== undefined) {
            payload.value = initialValue;
        }
        ctx.bridge.send('createProgressBar', payload);
        ctx.addToCurrentContainer(id);
        return _this;
    }
    ProgressBar.prototype.setProgress = function (value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setProgress', {
                            widgetId: this.id,
                            value: value
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ProgressBar.prototype.getProgress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getProgress', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.value];
                }
            });
        });
    };
    // Aliases to match Slider API naming convention
    ProgressBar.prototype.setValue = function (value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setProgress(value)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ProgressBar.prototype.getValue = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getProgress()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ProgressBar;
}(Widget));
exports.ProgressBar = ProgressBar;
/**
 * Scroll container
 */
var Scroll = /** @class */ (function () {
    function Scroll(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('scroll');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect content
        builder();
        // Pop the container and get the single child (content)
        var children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Scroll container must have exactly one child');
        }
        var contentId = children[0];
        // Create the Scroll with the content
        ctx.bridge.send('createScroll', { id: this.id, contentId: contentId });
        ctx.addToCurrentContainer(this.id);
    }
    return Scroll;
}());
exports.Scroll = Scroll;
/**
 * Grid layout container
 */
var Grid = /** @class */ (function () {
    function Grid(ctx, columns, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('grid');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        var children = ctx.popContainer();
        // Create the Grid with the children
        ctx.bridge.send('createGrid', { id: this.id, columns: columns, children: children });
        ctx.addToCurrentContainer(this.id);
    }
    return Grid;
}());
exports.Grid = Grid;
/**
 * RadioGroup widget
 */
var RadioGroup = /** @class */ (function (_super) {
    __extends(RadioGroup, _super);
    function RadioGroup(ctx, options, initialSelected, onSelected) {
        var _this = this;
        var id = ctx.generateId('radiogroup');
        _this = _super.call(this, ctx, id) || this;
        var payload = { id: id, options: options };
        if (initialSelected !== undefined) {
            payload.selected = initialSelected;
        }
        if (onSelected) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onSelected(data.selected);
            });
        }
        ctx.bridge.send('createRadioGroup', payload);
        ctx.addToCurrentContainer(id);
        return _this;
    }
    RadioGroup.prototype.setSelected = function (selected) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setRadioSelected', {
                            widgetId: this.id,
                            selected: selected
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RadioGroup.prototype.getSelected = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('getRadioSelected', {
                            widgetId: this.id
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.selected];
                }
            });
        });
    };
    return RadioGroup;
}(Widget));
exports.RadioGroup = RadioGroup;
/**
 * Split container (horizontal or vertical)
 */
var Split = /** @class */ (function () {
    function Split(ctx, orientation, leadingBuilder, trailingBuilder, offset) {
        this.ctx = ctx;
        this.id = ctx.generateId('split');
        // Build leading content
        ctx.pushContainer();
        leadingBuilder();
        var leadingChildren = ctx.popContainer();
        if (leadingChildren.length !== 1) {
            throw new Error('Split leading section must have exactly one child');
        }
        var leadingId = leadingChildren[0];
        // Build trailing content
        ctx.pushContainer();
        trailingBuilder();
        var trailingChildren = ctx.popContainer();
        if (trailingChildren.length !== 1) {
            throw new Error('Split trailing section must have exactly one child');
        }
        var trailingId = trailingChildren[0];
        // Create the split container
        var payload = {
            id: this.id,
            orientation: orientation,
            leadingId: leadingId,
            trailingId: trailingId
        };
        if (offset !== undefined) {
            payload.offset = offset;
        }
        ctx.bridge.send('createSplit', payload);
        ctx.addToCurrentContainer(this.id);
    }
    return Split;
}());
exports.Split = Split;
/**
 * Tabs container (AppTabs)
 */
var Tabs = /** @class */ (function () {
    function Tabs(ctx, tabDefinitions, location) {
        this.ctx = ctx;
        this.id = ctx.generateId('tabs');
        // Build each tab's content
        var tabs = [];
        for (var _i = 0, tabDefinitions_1 = tabDefinitions; _i < tabDefinitions_1.length; _i++) {
            var tabDef = tabDefinitions_1[_i];
            ctx.pushContainer();
            tabDef.builder();
            var children = ctx.popContainer();
            if (children.length !== 1) {
                throw new Error("Tab \"".concat(tabDef.title, "\" must have exactly one child widget"));
            }
            tabs.push({
                title: tabDef.title,
                contentId: children[0]
            });
        }
        // Create the tabs container
        var payload = {
            id: this.id,
            tabs: tabs
        };
        if (location) {
            payload.location = location;
        }
        ctx.bridge.send('createTabs', payload);
        ctx.addToCurrentContainer(this.id);
    }
    return Tabs;
}());
exports.Tabs = Tabs;
/**
 * Toolbar widget
 */
var Toolbar = /** @class */ (function () {
    function Toolbar(ctx, toolbarItems) {
        this.ctx = ctx;
        this.id = ctx.generateId('toolbar');
        var items = toolbarItems.map(function (item) {
            if (item.type === 'separator') {
                return { type: 'separator' };
            }
            if (item.type === 'spacer') {
                return { type: 'spacer' };
            }
            // Action item
            var callbackId = ctx.generateId('callback');
            if (item.onAction) {
                ctx.bridge.registerEventHandler(callbackId, function (_data) {
                    item.onAction();
                });
            }
            return {
                type: 'action',
                label: item.label || 'Action',
                callbackId: callbackId
            };
        });
        ctx.bridge.send('createToolbar', {
            id: this.id,
            items: items
        });
        ctx.addToCurrentContainer(this.id);
    }
    return Toolbar;
}());
exports.Toolbar = Toolbar;
/**
 * Table widget
 */
var Table = /** @class */ (function () {
    function Table(ctx, headers, data) {
        this.ctx = ctx;
        this.id = ctx.generateId('table');
        ctx.bridge.send('createTable', {
            id: this.id,
            headers: headers,
            data: data
        });
        ctx.addToCurrentContainer(this.id);
    }
    Table.prototype.updateData = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('updateTableData', {
                            id: this.id,
                            data: data
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Table;
}());
exports.Table = Table;
/**
 * List widget
 */
var List = /** @class */ (function () {
    function List(ctx, items, onSelected) {
        this.ctx = ctx;
        this.id = ctx.generateId('list');
        var payload = {
            id: this.id,
            items: items
        };
        if (onSelected) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function (data) {
                onSelected(data.index, data.item);
            });
        }
        ctx.bridge.send('createList', payload);
        ctx.addToCurrentContainer(this.id);
    }
    List.prototype.updateItems = function (items) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('updateListData', {
                            id: this.id,
                            items: items
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return List;
}());
exports.List = List;
/**
 * Center layout - centers content in the available space
 */
var Center = /** @class */ (function () {
    function Center(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('center');
        // Build child content
        ctx.pushContainer();
        builder();
        var children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Center must have exactly one child');
        }
        ctx.bridge.send('createCenter', {
            id: this.id,
            childId: children[0]
        });
        ctx.addToCurrentContainer(this.id);
    }
    return Center;
}());
exports.Center = Center;
/**
 * Card container with title, subtitle, and content
 */
var Card = /** @class */ (function () {
    function Card(ctx, title, subtitle, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('card');
        // Build card content
        ctx.pushContainer();
        builder();
        var children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Card must have exactly one child');
        }
        ctx.bridge.send('createCard', {
            id: this.id,
            title: title,
            subtitle: subtitle,
            contentId: children[0]
        });
        ctx.addToCurrentContainer(this.id);
    }
    return Card;
}());
exports.Card = Card;
/**
 * Accordion - collapsible sections
 */
var Accordion = /** @class */ (function () {
    function Accordion(ctx, items) {
        this.ctx = ctx;
        this.id = ctx.generateId('accordion');
        // Build each accordion item's content
        var accordionItems = [];
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            ctx.pushContainer();
            item.builder();
            var children = ctx.popContainer();
            if (children.length !== 1) {
                throw new Error("Accordion item \"".concat(item.title, "\" must have exactly one child"));
            }
            accordionItems.push({
                title: item.title,
                contentId: children[0]
            });
        }
        ctx.bridge.send('createAccordion', {
            id: this.id,
            items: accordionItems
        });
        ctx.addToCurrentContainer(this.id);
    }
    return Accordion;
}());
exports.Accordion = Accordion;
/**
 * Form widget with labeled fields and submit/cancel buttons
 */
var Form = /** @class */ (function () {
    function Form(ctx, items, onSubmit, onCancel) {
        this.ctx = ctx;
        this.id = ctx.generateId('form');
        var formItems = items.map(function (item) { return ({
            label: item.label,
            widgetId: item.widget.id
        }); });
        var payload = {
            id: this.id,
            items: formItems
        };
        if (onSubmit) {
            var submitCallbackId = ctx.generateId('callback');
            payload.submitCallbackId = submitCallbackId;
            ctx.bridge.registerEventHandler(submitCallbackId, function (_data) {
                onSubmit();
            });
        }
        if (onCancel) {
            var cancelCallbackId = ctx.generateId('callback');
            payload.cancelCallbackId = cancelCallbackId;
            ctx.bridge.registerEventHandler(cancelCallbackId, function (_data) {
                onCancel();
            });
        }
        ctx.bridge.send('createForm', payload);
        ctx.addToCurrentContainer(this.id);
    }
    return Form;
}());
exports.Form = Form;
/**
 * Tree widget for hierarchical data
 */
var Tree = /** @class */ (function () {
    function Tree(ctx, rootLabel) {
        this.ctx = ctx;
        this.id = ctx.generateId('tree');
        ctx.bridge.send('createTree', {
            id: this.id,
            rootLabel: rootLabel
        });
        ctx.addToCurrentContainer(this.id);
    }
    return Tree;
}());
exports.Tree = Tree;
/**
 * RichText widget for formatted text
 */
var RichText = /** @class */ (function () {
    function RichText(ctx, segments) {
        this.ctx = ctx;
        this.id = ctx.generateId('richtext');
        ctx.bridge.send('createRichText', {
            id: this.id,
            segments: segments
        });
        ctx.addToCurrentContainer(this.id);
    }
    return RichText;
}());
exports.RichText = RichText;
/**
 * Image widget for displaying images
 */
var Image = /** @class */ (function () {
    function Image(ctx, path, fillMode, onClick, onDrag, onDragEnd) {
        this.ctx = ctx;
        this.id = ctx.generateId('image');
        // Resolve path using resource map (for HTTP-fetched images)
        var resolvedPath = ctx.resolveResourcePath(path);
        var payload = {
            id: this.id,
            path: resolvedPath // Use resolved path (local cached file if from HTTP)
        };
        if (fillMode) {
            payload.fillMode = fillMode;
        }
        if (onClick) {
            var callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, function () {
                onClick();
            });
        }
        if (onDrag) {
            var dragCallbackId = ctx.generateId('callback');
            payload.onDragCallbackId = dragCallbackId;
            ctx.bridge.registerEventHandler(dragCallbackId, function (data) {
                onDrag(data.x, data.y);
            });
        }
        if (onDragEnd) {
            var dragEndCallbackId = ctx.generateId('callback');
            payload.onDragEndCallbackId = dragEndCallbackId;
            ctx.bridge.registerEventHandler(dragEndCallbackId, function (data) {
                onDragEnd(data.x, data.y);
            });
        }
        ctx.bridge.send('createImage', payload);
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Updates the image widget with new image data
     * @param imageData - Base64-encoded image data (with or without data URL prefix)
     */
    Image.prototype.updateImage = function (imageData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('updateImage', {
                            widgetId: this.id,
                            imageData: imageData
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Register a custom ID for this image widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const cardImage = a.image('card.png').withId('draw3-card');
     * // In tests: ctx.getByID('draw3-card').click()
     */
    Image.prototype.withId = function (customId) {
        this.ctx.bridge.send('registerCustomId', {
            widgetId: this.id,
            customId: customId
        });
        return this;
    };
    return Image;
}());
exports.Image = Image;
/**
 * Border layout - positions widgets at edges and center
 */
var Border = /** @class */ (function () {
    function Border(ctx, config) {
        this.ctx = ctx;
        this.id = ctx.generateId('border');
        var payload = { id: this.id };
        // Build each optional section
        if (config.top) {
            ctx.pushContainer();
            config.top();
            var children = ctx.popContainer();
            if (children.length === 1) {
                payload.topId = children[0];
            }
        }
        if (config.bottom) {
            ctx.pushContainer();
            config.bottom();
            var children = ctx.popContainer();
            if (children.length === 1) {
                payload.bottomId = children[0];
            }
        }
        if (config.left) {
            ctx.pushContainer();
            config.left();
            var children = ctx.popContainer();
            if (children.length === 1) {
                payload.leftId = children[0];
            }
        }
        if (config.right) {
            ctx.pushContainer();
            config.right();
            var children = ctx.popContainer();
            if (children.length === 1) {
                payload.rightId = children[0];
            }
        }
        if (config.center) {
            ctx.pushContainer();
            config.center();
            var children = ctx.popContainer();
            if (children.length === 1) {
                payload.centerId = children[0];
            }
        }
        ctx.bridge.send('createBorder', payload);
        ctx.addToCurrentContainer(this.id);
    }
    return Border;
}());
exports.Border = Border;
/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
var GridWrap = /** @class */ (function () {
    function GridWrap(ctx, itemWidth, itemHeight, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('gridwrap');
        // Build children
        ctx.pushContainer();
        builder();
        var children = ctx.popContainer();
        ctx.bridge.send('createGridWrap', {
            id: this.id,
            itemWidth: itemWidth,
            itemHeight: itemHeight,
            children: children
        });
        ctx.addToCurrentContainer(this.id);
    }
    return GridWrap;
}());
exports.GridWrap = GridWrap;
