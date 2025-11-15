"use strict";
/**
 * Browser Compatibility Globals for Tsyne
 *
 * Provides browser-like globals (localStorage, sessionStorage, navigator, alert, confirm, etc.)
 * to enable npm packages designed for browsers to work in Tsyne applications.
 */
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
exports.TsyneStorage = void 0;
exports.initializeGlobals = initializeGlobals;
exports.setBrowserGlobals = setBrowserGlobals;
exports.registerDialogHandlers = registerDialogHandlers;
var os_1 = require("os");
var fs_1 = require("fs");
var path_1 = require("path");
// Version imported from package.json
var version = require('../package.json').version;
/**
 * Storage implementation that can be backed by filesystem or memory
 */
var TsyneStorage = /** @class */ (function () {
    function TsyneStorage(storageName, persistent) {
        if (persistent === void 0) { persistent = false; }
        this.data = new Map();
        this.persistent = persistent;
        if (persistent) {
            // Store in ~/.tsyne directory
            var tsyneDir = path_1.default.join(os_1.default.homedir(), '.tsyne');
            if (!fs_1.default.existsSync(tsyneDir)) {
                fs_1.default.mkdirSync(tsyneDir, { recursive: true });
            }
            this.filePath = path_1.default.join(tsyneDir, "".concat(storageName, ".json"));
            this.loadFromDisk();
        }
    }
    TsyneStorage.prototype.loadFromDisk = function () {
        if (this.filePath && fs_1.default.existsSync(this.filePath)) {
            try {
                var content = fs_1.default.readFileSync(this.filePath, 'utf-8');
                var data = JSON.parse(content);
                this.data = new Map(Object.entries(data));
            }
            catch (err) {
                console.error("Failed to load ".concat(this.filePath, ":"), err);
            }
        }
    };
    TsyneStorage.prototype.saveToDisk = function () {
        if (this.persistent && this.filePath) {
            try {
                var data = Object.fromEntries(this.data);
                fs_1.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
            }
            catch (err) {
                console.error("Failed to save ".concat(this.filePath, ":"), err);
            }
        }
    };
    Object.defineProperty(TsyneStorage.prototype, "length", {
        get: function () {
            return this.data.size;
        },
        enumerable: false,
        configurable: true
    });
    TsyneStorage.prototype.clear = function () {
        this.data.clear();
        this.saveToDisk();
    };
    TsyneStorage.prototype.getItem = function (key) {
        var _a;
        return (_a = this.data.get(key)) !== null && _a !== void 0 ? _a : null;
    };
    TsyneStorage.prototype.key = function (index) {
        var _a;
        var keys = Array.from(this.data.keys());
        return (_a = keys[index]) !== null && _a !== void 0 ? _a : null;
    };
    TsyneStorage.prototype.removeItem = function (key) {
        this.data.delete(key);
        this.saveToDisk();
    };
    TsyneStorage.prototype.setItem = function (key, value) {
        this.data.set(key, value);
        this.saveToDisk();
    };
    return TsyneStorage;
}());
exports.TsyneStorage = TsyneStorage;
/**
 * Initialize browser compatibility globals
 * This should be called when the application starts
 */
function initializeGlobals() {
    var _this = this;
    var _a, _b, _c, _d;
    // Only initialize once
    if (global.__tsyneGlobalsInitialized) {
        return;
    }
    // localStorage - persistent storage
    if (!global.localStorage) {
        global.localStorage = new TsyneStorage('localStorage', true);
    }
    // sessionStorage - in-memory storage (cleared on exit)
    if (!global.sessionStorage) {
        global.sessionStorage = new TsyneStorage('sessionStorage', false);
    }
    // navigator object
    if (!global.navigator) {
        var navigator_1 = {
            userAgent: "Tsyne/".concat(version, " (").concat(os_1.default.platform(), "; ").concat(os_1.default.arch(), ") Node/").concat(process.version),
            platform: os_1.default.platform(),
            language: ((_b = (_a = process.env.LANG) === null || _a === void 0 ? void 0 : _a.split('.')[0]) === null || _b === void 0 ? void 0 : _b.replace('_', '-')) || 'en-US',
            languages: Object.freeze([((_d = (_c = process.env.LANG) === null || _c === void 0 ? void 0 : _c.split('.')[0]) === null || _d === void 0 ? void 0 : _d.replace('_', '-')) || 'en-US']),
            onLine: true,
            hardwareConcurrency: os_1.default.cpus().length,
            maxTouchPoints: 0,
            vendor: 'Tsyne',
            vendorSub: '',
            appName: 'Tsyne',
            appVersion: version,
            appCodeName: 'Tsyne',
            product: 'Tsyne',
            productSub: version,
        };
        global.navigator = navigator_1;
    }
    // alert function - shows info dialog
    if (!global.alert) {
        global.alert = function (message) {
            // Queue the alert to be shown by the app
            if (global.__tsyneAlertHandler) {
                global.__tsyneAlertHandler(message);
            }
            else {
                // Fallback to console if no handler is registered
                console.log('[ALERT]', message);
            }
        };
    }
    // confirm function - shows confirmation dialog
    if (!global.confirm) {
        global.confirm = function (message) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!global.__tsyneConfirmHandler) return [3 /*break*/, 2];
                        return [4 /*yield*/, global.__tsyneConfirmHandler(message)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        // Fallback to console if no handler is registered
                        console.log('[CONFIRM]', message);
                        return [2 /*return*/, false];
                }
            });
        }); };
    }
    // prompt function - shows input dialog
    if (!global.prompt) {
        global.prompt = function (message, defaultValue) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!global.__tsynePromptHandler) return [3 /*break*/, 2];
                        return [4 /*yield*/, global.__tsynePromptHandler(message, defaultValue)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        // Fallback to console if no handler is registered
                        console.log('[PROMPT]', message, defaultValue);
                        return [2 /*return*/, null];
                }
            });
        }); };
    }
    // Mark as initialized
    global.__tsyneGlobalsInitialized = true;
}
/**
 * Set up browser-specific location and history globals
 * This is called by the Browser class when a browser instance is active
 */
function setBrowserGlobals(location, history) {
    global.location = location;
    global.history = history;
}
/**
 * Register handlers for dialog functions (alert, confirm, prompt)
 * These handlers should be set by the App or Window instances
 */
function registerDialogHandlers(handlers) {
    if (handlers.alert) {
        global.__tsyneAlertHandler = handlers.alert;
    }
    if (handlers.confirm) {
        global.__tsyneConfirmHandler = handlers.confirm;
    }
    if (handlers.prompt) {
        global.__tsynePromptHandler = handlers.prompt;
    }
}
