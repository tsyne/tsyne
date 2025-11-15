"use strict";
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
exports.TsyneBrowserTest = void 0;
exports.browserTest = browserTest;
exports.describeBrowser = describeBrowser;
exports.runBrowserTests = runBrowserTests;
var browser_1 = require("./browser");
var test_1 = require("./test");
var http_1 = require("http");
var fs = require("fs");
var path = require("path");
/**
 * TsyneBrowserTest provides a testing framework for Tsyne Browser pages
 *
 * Similar to TsyneTest but for testing browser pages loaded from HTTP server
 */
var TsyneBrowserTest = /** @class */ (function () {
    function TsyneBrowserTest(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c;
        this.browser = null;
        this.testContext = null;
        this.server = null;
        this.serverPort = 0;
        this.pages = new Map();
        this.options = {
            headed: (_a = options.headed) !== null && _a !== void 0 ? _a : false,
            timeout: (_b = options.timeout) !== null && _b !== void 0 ? _b : 30000,
            port: (_c = options.port) !== null && _c !== void 0 ? _c : 0 // 0 = random available port
        };
    }
    /**
     * Add test pages to be served by the test server
     */
    TsyneBrowserTest.prototype.addPages = function (pages) {
        for (var _i = 0, pages_1 = pages; _i < pages_1.length; _i++) {
            var page = pages_1[_i];
            this.pages.set(page.path, page.code);
        }
    };
    /**
     * Start the test HTTP server
     * Serves both TypeScript pages and static assets (images, etc.)
     */
    TsyneBrowserTest.prototype.startServer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.server = http_1.default.createServer(function (req, res) {
                            var url = req.url || '/';
                            // First, check if it's a registered page
                            var pageCode = _this.pages.get(url);
                            if (pageCode) {
                                res.writeHead(200, { 'Content-Type': 'text/typescript' });
                                res.end(pageCode);
                                return;
                            }
                            // Try to serve as static file from examples directory
                            // URLs like /assets/test-image.svg map to examples/assets/test-image.svg
                            var filePath = path.join(process.cwd(), 'examples', url);
                            // Check if file exists
                            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                                // Determine MIME type based on file extension
                                var ext = path.extname(filePath).toLowerCase();
                                var mimeTypes = {
                                    '.svg': 'image/svg+xml',
                                    '.png': 'image/png',
                                    '.jpg': 'image/jpeg',
                                    '.jpeg': 'image/jpeg',
                                    '.gif': 'image/gif',
                                    '.bmp': 'image/bmp',
                                    '.webp': 'image/webp',
                                    '.ico': 'image/x-icon'
                                };
                                var contentType_1 = mimeTypes[ext] || 'application/octet-stream';
                                // Read and serve the file
                                fs.readFile(filePath, function (err, data) {
                                    if (err) {
                                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                                        res.end('Error reading file');
                                    }
                                    else {
                                        res.writeHead(200, { 'Content-Type': contentType_1 });
                                        res.end(data);
                                    }
                                });
                                return;
                            }
                            // Neither page nor file found - return 404
                            res.writeHead(404, { 'Content-Type': 'text/typescript' });
                            res.end("\nconst { vbox, label } = tsyne;\nvbox(() => {\n  label('404 - Page Not Found');\n  label('URL: ' + browserContext.currentUrl);\n});\n        ");
                        });
                        _this.server.listen(_this.options.port, function () {
                            var address = _this.server.address();
                            _this.serverPort = address.port;
                            resolve(_this.serverPort);
                        });
                        _this.server.on('error', reject);
                    })];
            });
        });
    };
    /**
     * Create a browser in test mode and start test server
     */
    TsyneBrowserTest.prototype.createBrowser = function (initialUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var testMode, app, fullUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                    // Start test server
                    return [4 /*yield*/, this.startServer()];
                    case 1:
                        // Start test server
                        _a.sent();
                        testMode = !this.options.headed;
                        this.browser = new browser_1.Browser({
                            title: 'Tsyne Browser Test',
                            width: 800,
                            height: 600,
                            testMode: testMode
                        });
                        app = this.browser.getApp();
                        return [4 /*yield*/, app.getBridge().waitUntilReady()];
                    case 2:
                        _a.sent();
                        // Create test context
                        this.testContext = new test_1.TestContext(app.getBridge());
                        if (!initialUrl) return [3 /*break*/, 5];
                        fullUrl = this.getTestUrl(initialUrl);
                        return [4 /*yield*/, this.browser.changePage(fullUrl)];
                    case 3:
                        _a.sent();
                        // Wait for page to load
                        return [4 /*yield*/, this.waitForPageLoad()];
                    case 4:
                        // Wait for page to load
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, this.browser];
                }
            });
        });
    };
    /**
     * Get full URL for a test page path
     */
    TsyneBrowserTest.prototype.getTestUrl = function (path) {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return "http://localhost:".concat(this.serverPort).concat(path);
    };
    /**
     * Navigate to a test page
     */
    TsyneBrowserTest.prototype.navigate = function (path) {
        return __awaiter(this, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser not created. Call createBrowser() first.');
                        }
                        url = this.getTestUrl(path);
                        return [4 /*yield*/, this.browser.changePage(url)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.waitForPageLoad()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Navigate back
     */
    TsyneBrowserTest.prototype.back = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser not created. Call createBrowser() first.');
                        }
                        return [4 /*yield*/, this.browser.back()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.waitForPageLoad()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Navigate forward
     */
    TsyneBrowserTest.prototype.forward = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser not created. Call createBrowser() first.');
                        }
                        return [4 /*yield*/, this.browser.forward()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.waitForPageLoad()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reload current page
     */
    TsyneBrowserTest.prototype.reload = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser not created. Call createBrowser() first.');
                        }
                        return [4 /*yield*/, this.browser.reload()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.waitForPageLoad()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wait for page to finish loading
     */
    TsyneBrowserTest.prototype.waitForPageLoad = function (timeoutMs) {
        return __awaiter(this, void 0, void 0, function () {
            var timeout, startTime, isLoading;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        timeout = (_a = timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : this.options.timeout) !== null && _a !== void 0 ? _a : 5000;
                        startTime = Date.now();
                        _b.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < timeout)) return [3 /*break*/, 5];
                        isLoading = this.browser.loading;
                        if (!!isLoading) return [3 /*break*/, 3];
                        // Page finished loading, minimal wait for widgets to register (100ms is enough)
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 2:
                        // Page finished loading, minimal wait for widgets to register (100ms is enough)
                        _b.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 50); })];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 1];
                    case 5:
                    // Timeout - give widgets one more chance
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 6:
                        // Timeout - give widgets one more chance
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wait for navigation to complete (like Selenium's waitForNavigation)
     * Useful after clicking links or buttons that trigger page navigation
     *
     * @param timeoutMs - Maximum time to wait for navigation (default: test timeout)
     * @example
     * await ctx.getByText("Submit").click();
     * await browserTest.waitForNavigation();
     * await ctx.expect(ctx.getByText("Success")).toBeVisible();
     */
    TsyneBrowserTest.prototype.waitForNavigation = function (timeoutMs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.waitForPageLoad(timeoutMs)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the test context for interacting with widgets
     */
    TsyneBrowserTest.prototype.getContext = function () {
        if (!this.testContext) {
            throw new Error('Browser not created. Call createBrowser() first.');
        }
        return this.testContext;
    };
    /**
     * Get current URL
     */
    TsyneBrowserTest.prototype.getCurrentUrl = function () {
        if (!this.browser) {
            throw new Error('Browser not created. Call createBrowser() first.');
        }
        var url = this.browser.currentUrl;
        // If it's a relative URL (starts with /), convert to full test URL
        if (url.startsWith('/')) {
            return this.getTestUrl(url);
        }
        return url;
    };
    /**
     * Assert current URL matches expected
     */
    TsyneBrowserTest.prototype.assertUrl = function (expected) {
        var current = this.getCurrentUrl();
        var expectedFull = this.getTestUrl(expected);
        if (current !== expectedFull) {
            throw new Error("URL assertion failed: expected ".concat(expectedFull, ", got ").concat(current));
        }
    };
    /**
     * Capture a screenshot of the browser window
     * @param filePath - Path where the screenshot will be saved as PNG
     *
     * Note: Screenshots in headless mode (default) will be blank/grey because
     * Fyne's test mode doesn't render actual pixels. For meaningful screenshots,
     * run tests in headed mode: new TsyneBrowserTest({ headed: true })
     */
    TsyneBrowserTest.prototype.screenshot = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var window;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser not created. Call createBrowser() first.');
                        }
                        // Warn if in headless mode
                        if (!this.options.headed) {
                            console.warn('  ⚠️  Screenshot captured in headless mode - will be blank/grey');
                            console.warn('     For visual screenshots, use headed mode: new TsyneBrowserTest({ headed: true })');
                        }
                        window = this.browser.getWindow();
                        return [4 /*yield*/, window.screenshot(filePath)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up: stop server and quit browser
     */
    TsyneBrowserTest.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var app;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.server) return [3 /*break*/, 2];
                        return [4 /*yield*/, new Promise(function (resolve) {
                                _this.server.close(function () { return resolve(); });
                            })];
                    case 1:
                        _a.sent();
                        this.server = null;
                        _a.label = 2;
                    case 2:
                        if (!this.browser) return [3 /*break*/, 4];
                        app = this.browser.getApp();
                        app.getBridge().quit();
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 3:
                        _a.sent();
                        this.browser = null;
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TsyneBrowserTest;
}());
exports.TsyneBrowserTest = TsyneBrowserTest;
// Collected tests to run sequentially
var collectedTests = [];
/**
 * Helper function to register a browser test (runs later)
 */
function browserTest(name, pages, testFn, options) {
    if (options === void 0) { options = {}; }
    collectedTests.push({ name: name, pages: pages, testFn: testFn, options: options, only: false });
}
/**
 * Register a browser test to run exclusively (skips other tests)
 * Use this like browserTest.only() to run a single test during development
 */
browserTest.only = function (name, pages, testFn, options) {
    if (options === void 0) { options = {}; }
    collectedTests.push({ name: name, pages: pages, testFn: testFn, options: options, only: true });
};
/**
 * Helper to describe a browser test suite
 */
function describeBrowser(name, suiteFn) {
    console.log("\n".concat(name));
    suiteFn();
}
/**
 * Run all collected browser tests sequentially
 */
function runBrowserTests() {
    return __awaiter(this, void 0, void 0, function () {
        var passed, failed, headed, testsToRun, onlyTests, testFilter_1, skipped, originalTsyne, _i, testsToRun_1, test_2, options, tsyneBrowserTest, startTime, duration, error_1, duration, sanitizedName, timestamp, screenshotPath, fs_1, screenshotError_1, total, summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    passed = 0;
                    failed = 0;
                    headed = process.env.TSYNE_HEADED === '1';
                    if (headed) {
                        console.log('Running in HEADED mode - browser windows will be visible\n');
                    }
                    testsToRun = collectedTests;
                    onlyTests = collectedTests.filter(function (t) { return t.only; });
                    if (onlyTests.length > 0) {
                        testsToRun = onlyTests;
                        console.log("Running ".concat(onlyTests.length, " test(s) marked with .only()\n"));
                    }
                    else {
                        testFilter_1 = process.env.TSYNE_TEST_FILTER;
                        if (testFilter_1) {
                            testsToRun = collectedTests.filter(function (t) {
                                // Support both substring match and regex
                                try {
                                    var regex = new RegExp(testFilter_1, 'i');
                                    return regex.test(t.name);
                                }
                                catch (_a) {
                                    // If not a valid regex, do substring match
                                    return t.name.toLowerCase().includes(testFilter_1.toLowerCase());
                                }
                            });
                            if (testsToRun.length === 0) {
                                console.error("No tests match filter: \"".concat(testFilter_1, "\""));
                                process.exit(1);
                            }
                            console.log("Running ".concat(testsToRun.length, " test(s) matching filter: \"").concat(testFilter_1, "\"\n"));
                            testsToRun.forEach(function (t) { return console.log("  - ".concat(t.name)); });
                            console.log('');
                        }
                    }
                    skipped = collectedTests.length - testsToRun.length;
                    originalTsyne = global.tsyne;
                    _i = 0, testsToRun_1 = testsToRun;
                    _a.label = 1;
                case 1:
                    if (!(_i < testsToRun_1.length)) return [3 /*break*/, 15];
                    test_2 = testsToRun_1[_i];
                    options = __assign(__assign({}, test_2.options), { headed: headed || test_2.options.headed });
                    tsyneBrowserTest = new TsyneBrowserTest(options);
                    tsyneBrowserTest.addPages(test_2.pages);
                    console.log("Running browser test: ".concat(test_2.name));
                    startTime = Date.now();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, 9, 14]);
                    return [4 /*yield*/, test_2.testFn(tsyneBrowserTest)];
                case 3:
                    _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2713 ".concat(test_2.name, " (").concat(duration, "ms)"));
                    passed++;
                    return [3 /*break*/, 14];
                case 4:
                    error_1 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u2717 ".concat(test_2.name, " (").concat(duration, "ms)"));
                    console.error("  ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                    failed++;
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    sanitizedName = test_2.name.replace(/[^a-zA-Z0-9]/g, '_');
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    screenshotPath = "./test-failures/".concat(sanitizedName, "_").concat(timestamp, ".png");
                    fs_1 = require('fs');
                    if (!fs_1.existsSync('./test-failures')) {
                        fs_1.mkdirSync('./test-failures', { recursive: true });
                    }
                    return [4 /*yield*/, tsyneBrowserTest.screenshot(screenshotPath)];
                case 6:
                    _a.sent();
                    console.error("  Screenshot saved: ".concat(screenshotPath));
                    return [3 /*break*/, 8];
                case 7:
                    screenshotError_1 = _a.sent();
                    // Don't fail the test if screenshot fails, just log it
                    console.error("  Failed to capture screenshot: ".concat(screenshotError_1 instanceof Error ? screenshotError_1.message : String(screenshotError_1)));
                    return [3 /*break*/, 8];
                case 8: return [3 /*break*/, 14];
                case 9:
                    if (!options.headed) return [3 /*break*/, 11];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11: return [4 /*yield*/, tsyneBrowserTest.cleanup()];
                case 12:
                    _a.sent();
                    // Wait a bit between tests to avoid global context conflicts
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
                case 13:
                    // Wait a bit between tests to avoid global context conflicts
                    _a.sent();
                    // Restore original global tsyne object
                    if (originalTsyne) {
                        global.tsyne = originalTsyne;
                    }
                    else {
                        delete global.tsyne;
                    }
                    return [7 /*endfinally*/];
                case 14:
                    _i++;
                    return [3 /*break*/, 1];
                case 15:
                    total = passed + failed;
                    summary = ["".concat(passed, " passed"), "".concat(failed, " failed")];
                    if (skipped > 0) {
                        summary.push("".concat(skipped, " skipped"));
                    }
                    summary.push("".concat(total, " run"));
                    console.log("\nTests: ".concat(summary.join(', ')));
                    if (failed > 0) {
                        process.exit(1);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
