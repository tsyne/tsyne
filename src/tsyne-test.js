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
exports.TsyneTest = void 0;
exports.test = test;
exports.describe = describe;
var app_1 = require("./app");
var test_1 = require("./test");
/**
 * TsyneTest provides a testing framework for Tsyne applications
 * Uses proper IoC/DI - app instance is injected into builder
 */
var TsyneTest = /** @class */ (function () {
    function TsyneTest(options) {
        if (options === void 0) { options = {}; }
        var _a, _b;
        this.app = null;
        this.testContext = null;
        this.options = {
            headed: (_a = options.headed) !== null && _a !== void 0 ? _a : false,
            timeout: (_b = options.timeout) !== null && _b !== void 0 ? _b : 30000
        };
    }
    /**
     * Create an app in test mode
     * Builder receives the app instance (proper IoC/DI)
     * Returns a promise that resolves when the bridge is ready
     */
    TsyneTest.prototype.createApp = function (appBuilder) {
        return __awaiter(this, void 0, void 0, function () {
            var testMode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testMode = !this.options.headed;
                        this.app = new app_1.App({}, testMode);
                        // Wait for bridge to be ready before building
                        return [4 /*yield*/, this.app.getBridge().waitUntilReady()];
                    case 1:
                        // Wait for bridge to be ready before building
                        _a.sent();
                        // Create test context
                        this.testContext = new test_1.TestContext(this.app.getBridge());
                        // Build the app - inject app instance for scoped declarative API
                        appBuilder(this.app);
                        return [2 /*return*/, this.app];
                }
            });
        });
    };
    /**
     * Get the test context for interacting with the app
     */
    TsyneTest.prototype.getContext = function () {
        if (!this.testContext) {
            throw new Error('App not created. Call createApp() first.');
        }
        return this.testContext;
    };
    /**
     * Run the app (in headed mode, this shows the window)
     */
    TsyneTest.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.app) {
                            throw new Error('App not created. Call createApp() first.');
                        }
                        return [4 /*yield*/, this.app.run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up and quit the app
     */
    TsyneTest.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.app) return [3 /*break*/, 2];
                        this.app.getBridge().quit();
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Capture a screenshot of the application window
     * @param filePath - Path where the screenshot will be saved as PNG
     *
     * Note: Screenshots in headless mode (default) will be blank/grey because
     * Fyne's test mode doesn't render actual pixels. For meaningful screenshots,
     * run tests in headed mode: new TsyneTest({ headed: true })
     */
    TsyneTest.prototype.screenshot = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var windows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.app) {
                            throw new Error('App not created. Call createApp() first.');
                        }
                        windows = this.app.getWindows();
                        if (windows.length === 0) {
                            throw new Error('No windows available to screenshot');
                        }
                        // Warn if in headless mode
                        if (!this.options.headed) {
                            console.warn('  ⚠️  Screenshot captured in headless mode - will be blank/grey');
                            console.warn('     For visual screenshots, use headed mode: new TsyneTest({ headed: true })');
                        }
                        return [4 /*yield*/, windows[0].screenshot(filePath)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return TsyneTest;
}());
exports.TsyneTest = TsyneTest;
/**
 * Helper function to create a test
 */
function test(name_1, testFn_1) {
    return __awaiter(this, arguments, void 0, function (name, testFn, options) {
        var tsyneTest, error_1, sanitizedName, timestamp, screenshotPath, fs, screenshotError_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tsyneTest = new TsyneTest(options);
                    console.log("Running test: ".concat(name));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 8, 10]);
                    return [4 /*yield*/, testFn(tsyneTest.getContext())];
                case 2:
                    _a.sent();
                    console.log("\u2713 ".concat(name));
                    return [3 /*break*/, 10];
                case 3:
                    error_1 = _a.sent();
                    console.error("\u2717 ".concat(name));
                    console.error("  ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    screenshotPath = "./test-failures/".concat(sanitizedName, "_").concat(timestamp, ".png");
                    fs = require('fs');
                    if (!fs.existsSync('./test-failures')) {
                        fs.mkdirSync('./test-failures', { recursive: true });
                    }
                    return [4 /*yield*/, tsyneTest.screenshot(screenshotPath)];
                case 5:
                    _a.sent();
                    console.error("  Screenshot saved: ".concat(screenshotPath));
                    return [3 /*break*/, 7];
                case 6:
                    screenshotError_1 = _a.sent();
                    // Don't fail the test if screenshot fails, just log it
                    console.error("  Failed to capture screenshot: ".concat(screenshotError_1 instanceof Error ? screenshotError_1.message : String(screenshotError_1)));
                    return [3 /*break*/, 7];
                case 7: throw error_1;
                case 8: return [4 /*yield*/, tsyneTest.cleanup()];
                case 9:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Helper to describe a test suite
 */
function describe(name, suiteFn) {
    console.log("\n".concat(name));
    suiteFn();
}
