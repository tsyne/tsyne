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
exports.Window = void 0;
var globals_1 = require("./globals");
/**
 * Window represents a Fyne window
 */
var Window = /** @class */ (function () {
    function Window(ctx, options, builder) {
        var _this = this;
        this.contentSent = false; // Track if content has been sent to bridge
        this.ctx = ctx;
        this.id = ctx.generateId('window');
        var payload = {
            id: this.id,
            title: options.title
        };
        if (options.width !== undefined) {
            payload.width = options.width;
        }
        if (options.height !== undefined) {
            payload.height = options.height;
        }
        if (options.fixedSize !== undefined) {
            payload.fixedSize = options.fixedSize;
        }
        ctx.bridge.send('createWindow', payload);
        // Register dialog handlers for browser compatibility globals
        (0, globals_1.registerDialogHandlers)({
            alert: function (message) {
                _this.showInfo('Alert', message);
            },
            confirm: function (message) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.showConfirm('Confirm', message)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); },
            prompt: function (message, defaultValue) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // For now, we don't have a prompt dialog in Fyne, so we return null
                    // This can be implemented later with a custom dialog
                    console.log('[PROMPT]', message, defaultValue);
                    return [2 /*return*/, null];
                });
            }); }
        });
        if (builder) {
            ctx.pushWindow(this.id);
            ctx.pushContainer();
            builder(this);
            var children = ctx.popContainer();
            if (children.length > 0) {
                // Use the first (and should be only) child as content
                this.contentId = children[0];
            }
            ctx.popWindow();
        }
    }
    Window.prototype.show = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.contentId && !this.contentSent)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.ctx.bridge.send('setContent', {
                                windowId: this.id,
                                widgetId: this.contentId
                            })];
                    case 1:
                        _a.sent();
                        this.contentSent = true;
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.ctx.bridge.send('showWindow', {
                            windowId: this.id
                        })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Window.prototype.setContent = function (builder) {
        return __awaiter(this, void 0, void 0, function () {
            var children;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mark as sent immediately (synchronously) to prevent duplicate calls
                        this.contentSent = true;
                        this.ctx.pushWindow(this.id);
                        this.ctx.pushContainer();
                        builder();
                        children = this.ctx.popContainer();
                        if (children.length > 0) {
                            this.contentId = children[0];
                        }
                        this.ctx.popWindow();
                        if (!this.contentId) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.ctx.bridge.send('setContent', {
                                windowId: this.id,
                                widgetId: this.contentId
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Shows an information dialog with a title and message
     */
    Window.prototype.showInfo = function (title, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('showInfo', {
                            windowId: this.id,
                            title: title,
                            message: message
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Shows an error dialog with a title and message
     */
    Window.prototype.showError = function (title, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('showError', {
                            windowId: this.id,
                            title: title,
                            message: message
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Shows a confirmation dialog and returns the user's response
     * @returns Promise<boolean> - true if user confirmed, false if cancelled
     */
    Window.prototype.showConfirm = function (title, message) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var callbackId = _this.ctx.generateId('callback');
                        _this.ctx.bridge.registerEventHandler(callbackId, function (data) {
                            resolve(data.confirmed);
                        });
                        _this.ctx.bridge.send('showConfirm', {
                            windowId: _this.id,
                            title: title,
                            message: message,
                            callbackId: callbackId
                        });
                    })];
            });
        });
    };
    /**
     * Shows a file open dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    Window.prototype.showFileOpen = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var callbackId = _this.ctx.generateId('callback');
                        _this.ctx.bridge.registerEventHandler(callbackId, function (data) {
                            if (data.error || !data.filePath) {
                                resolve(null);
                            }
                            else {
                                resolve(data.filePath);
                            }
                        });
                        _this.ctx.bridge.send('showFileOpen', {
                            windowId: _this.id,
                            callbackId: callbackId
                        });
                    })];
            });
        });
    };
    /**
     * Shows a file save dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    Window.prototype.showFileSave = function (filename) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var callbackId = _this.ctx.generateId('callback');
                        _this.ctx.bridge.registerEventHandler(callbackId, function (data) {
                            if (data.error || !data.filePath) {
                                resolve(null);
                            }
                            else {
                                resolve(data.filePath);
                            }
                        });
                        _this.ctx.bridge.send('showFileSave', {
                            windowId: _this.id,
                            callbackId: callbackId,
                            filename: filename || 'untitled.txt'
                        });
                    })];
            });
        });
    };
    /**
     * Resize the window to the specified dimensions
     */
    Window.prototype.resize = function (width, height) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('resizeWindow', {
                            windowId: this.id,
                            width: width,
                            height: height
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set the window title
     */
    Window.prototype.setTitle = function (title) {
        this.ctx.bridge.send('setWindowTitle', {
            windowId: this.id,
            title: title
        });
    };
    /**
     * Center the window on the screen
     */
    Window.prototype.centerOnScreen = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('centerWindow', {
                            windowId: this.id
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set fullscreen mode
     */
    Window.prototype.setFullScreen = function (fullscreen) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('setWindowFullScreen', {
                            windowId: this.id,
                            fullscreen: fullscreen
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set the main menu for this window
     */
    Window.prototype.setMainMenu = function (menuDefinition) {
        return __awaiter(this, void 0, void 0, function () {
            var menuItems;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        menuItems = menuDefinition.map(function (menu) {
                            var items = menu.items.map(function (item) {
                                if (item.isSeparator) {
                                    return { label: '', isSeparator: true };
                                }
                                var menuItem = {
                                    label: item.label
                                };
                                if (item.onSelected) {
                                    var callbackId = _this.ctx.generateId('callback');
                                    menuItem.callbackId = callbackId;
                                    _this.ctx.bridge.registerEventHandler(callbackId, function (_data) {
                                        item.onSelected();
                                    });
                                }
                                if (item.disabled !== undefined) {
                                    menuItem.disabled = item.disabled;
                                }
                                if (item.checked !== undefined) {
                                    menuItem.checked = item.checked;
                                }
                                return menuItem;
                            });
                            return {
                                label: menu.label,
                                items: items
                            };
                        });
                        return [4 /*yield*/, this.ctx.bridge.send('setMainMenu', {
                                windowId: this.id,
                                menuItems: menuItems
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Captures a screenshot of the window and saves it to a file
     * @param filePath - Path where the screenshot will be saved as PNG
     */
    Window.prototype.screenshot = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ctx.bridge.send('captureWindow', {
                            windowId: this.id,
                            filePath: filePath
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Window;
}());
exports.Window = Window;
