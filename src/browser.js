"use strict";
/**
 * Tsyne Browser - Swiby-style browser for loading Tsyne pages from web servers
 *
 * Enables dynamic loading of Tsyne TypeScript pages from HTTP servers,
 * similar to how Mosaic/Firefox/Chrome load HTML pages.
 *
 * Architecture:
 * - ONE persistent browser window (like real browsers)
 * - Browser chrome (address bar, navigation buttons)
 * - Pages render into content area only
 * - Window size controlled by user, not pages
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
exports.createBrowser = createBrowser;
var http_1 = require("http");
var https_1 = require("https");
var url_1 = require("url");
var fs = require("fs");
var path = require("path");
var os = require("os");
var app_1 = require("./app");
var globals_1 = require("./globals");
/**
 * Browser for loading and displaying Tsyne pages from web servers
 *
 * Similar to Swiby's browser concept - loads pages dynamically from servers
 * that can be implemented in any language (Spring, Sinatra, Flask, etc.)
 *
 * Key feature: Uses ONE persistent window, pages render into content area
 */
var Browser = /** @class */ (function () {
    function Browser(options) {
        var _this = this;
        this.addressBarEntry = null;
        this.loadingLabel = null;
        this.stopButton = null;
        this.history = [];
        this.historyIndex = -1;
        this.currentUrl = '';
        this.loading = false;
        this.currentRequest = null;
        this.currentPageBuilder = null;
        this.pageMenus = new Map();
        this.testMode = false;
        this.firstPageLoaded = false;
        this.homeUrl = '';
        this.pageTitle = '';
        this.baseTitle = '';
        this.statusText = 'Ready';
        this.statusBarLabel = null;
        this.pageCache = new Map();
        this.bookmarks = [];
        this.findQuery = '';
        this.findMatches = []; // Positions of matches in page code
        this.findCurrentIndex = -1; // Current match index (0-based)
        this.testMode = (options === null || options === void 0 ? void 0 : options.testMode) || false;
        // Set up history and bookmarks file paths in user's home directory
        var tsyneDir = path.join(os.homedir(), '.tsyne');
        this.historyFilePath = path.join(tsyneDir, 'browser-history.json');
        this.bookmarksFilePath = path.join(tsyneDir, 'browser-bookmarks.json');
        // Load history and bookmarks from disk
        this.loadHistory();
        this.loadBookmarks();
        this.homeUrl = (options === null || options === void 0 ? void 0 : options.homeUrl) || '';
        this.baseTitle = (options === null || options === void 0 ? void 0 : options.title) || 'Tsyne Browser';
        this.app = new app_1.App({ title: this.baseTitle }, this.testMode);
        // Register hyperlink navigation event handler
        var appBridge = this.app.ctx.bridge;
        appBridge.registerEventHandler('hyperlinkNavigation', function (data) {
            if (data && data.url) {
                _this.changePage(data.url).catch(function (err) { return console.error('Hyperlink navigation failed:', err); });
            }
        });
        // Set global context for the browser's app so global API calls work
        var __setGlobalContext = require('./index').__setGlobalContext;
        __setGlobalContext(this.app, this.app.ctx);
        // Create ONE persistent browser window with initial placeholder content
        // CRITICAL: We must provide content during window creation (not via setContent after)
        // Otherwise Fyne shows a black window that doesn't update when setContent is called later
        this.window = this.app.window({
            title: this.baseTitle,
            width: (options === null || options === void 0 ? void 0 : options.width) || 900,
            height: (options === null || options === void 0 ? void 0 : options.height) || 700
        }, function (win) {
            // Call buildWindowContent() SYNCHRONOUSLY in builder
            // This provides initial placeholder content that Fyne can display
            // Later calls to setContent() will properly replace this
            _this.buildWindowContent();
        });
        // Set up browser menu bar after window is created
        this.setupMenuBar();
    }
    /**
     * Set up the browser menu bar
     */
    Browser.prototype.setupMenuBar = function () {
        return __awaiter(this, void 0, void 0, function () {
            var menuDefinition, _i, _a, _b, menuLabel, items;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        menuDefinition = [
                            {
                                label: 'File',
                                items: [
                                    {
                                        label: 'Close Window',
                                        onSelected: function () {
                                            process.exit(0);
                                        }
                                    }
                                ]
                            },
                            {
                                label: 'View',
                                items: [
                                    {
                                        label: 'Reload',
                                        onSelected: function () {
                                            _this.reload().catch(function (err) { return console.error('Reload failed:', err); });
                                        }
                                    },
                                    {
                                        label: 'Stop',
                                        onSelected: function () {
                                            _this.stop();
                                        }
                                    },
                                    {
                                        isSeparator: true
                                    },
                                    {
                                        label: 'Find in Page...',
                                        onSelected: function () { return __awaiter(_this, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        if (!(this.historyIndex >= 0)) return [3 /*break*/, 2];
                                                        // In a real implementation, this would show a find dialog
                                                        // For now, we just show info that find API is available
                                                        return [4 /*yield*/, this.window.showInfo('Find in Page', 'Find API is available via browser methods:\n\n' +
                                                                '- findInPage(query, caseSensitive?)\n' +
                                                                '- findNext()\n' +
                                                                '- findPrevious()\n' +
                                                                '- clearFind()\n\n' +
                                                                'Pages can use: browserContext.browser.findInPage("text")')];
                                                    case 1:
                                                        // In a real implementation, this would show a find dialog
                                                        // For now, we just show info that find API is available
                                                        _a.sent();
                                                        _a.label = 2;
                                                    case 2: return [2 /*return*/];
                                                }
                                            });
                                        }); },
                                        disabled: this.historyIndex < 0
                                    },
                                    {
                                        label: 'Find Next',
                                        onSelected: function () {
                                            _this.findNext();
                                        },
                                        disabled: this.findMatches.length === 0
                                    },
                                    {
                                        label: 'Find Previous',
                                        onSelected: function () {
                                            _this.findPrevious();
                                        },
                                        disabled: this.findMatches.length === 0
                                    },
                                    {
                                        isSeparator: true
                                    },
                                    {
                                        label: 'View Page Source',
                                        onSelected: function () { return __awaiter(_this, void 0, void 0, function () {
                                            var entry;
                                            return __generator(this, function (_a) {
                                                if (this.historyIndex >= 0) {
                                                    entry = this.history[this.historyIndex];
                                                    console.log('\n========== Page Source ==========');
                                                    console.log("URL: ".concat(entry.url));
                                                    console.log('==================================');
                                                    console.log(entry.pageCode);
                                                    console.log('==================================\n');
                                                }
                                                return [2 /*return*/];
                                            });
                                        }); }
                                    }
                                ]
                            },
                            {
                                label: 'History',
                                items: [
                                    {
                                        label: 'Back',
                                        onSelected: function () {
                                            _this.back().catch(function (err) { return console.error('Back failed:', err); });
                                        },
                                        disabled: this.historyIndex <= 0
                                    },
                                    {
                                        label: 'Forward',
                                        onSelected: function () {
                                            _this.forward().catch(function (err) { return console.error('Forward failed:', err); });
                                        },
                                        disabled: this.historyIndex >= this.history.length - 1
                                    },
                                    {
                                        isSeparator: true
                                    },
                                    {
                                        label: 'Home',
                                        onSelected: function () {
                                            _this.home().catch(function (err) { return console.error('Home failed:', err); });
                                        },
                                        disabled: !this.homeUrl
                                    },
                                    {
                                        isSeparator: true
                                    },
                                    {
                                        label: 'Show History',
                                        onSelected: function () {
                                            _this.showHistory();
                                        },
                                        disabled: this.history.length === 0
                                    },
                                    {
                                        label: 'Clear History',
                                        onSelected: function () {
                                            _this.clearHistory().catch(function (err) { return console.error('Clear history failed:', err); });
                                        },
                                        disabled: this.history.length === 0
                                    }
                                ]
                            },
                            {
                                label: 'Bookmarks',
                                items: __spreadArray([
                                    {
                                        label: 'Add Bookmark',
                                        onSelected: function () {
                                            _this.addBookmark().catch(function (err) { return console.error('Add bookmark failed:', err); });
                                        },
                                        disabled: !this.currentUrl
                                    },
                                    {
                                        isSeparator: true
                                    },
                                    {
                                        label: 'Export Bookmarks...',
                                        onSelected: function () {
                                            _this.exportBookmarks().catch(function (err) { return console.error('Export bookmarks failed:', err); });
                                        },
                                        disabled: this.bookmarks.length === 0
                                    },
                                    {
                                        label: 'Import Bookmarks...',
                                        onSelected: function () { return __awaiter(_this, void 0, void 0, function () {
                                            var importPath;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        importPath = path.join(process.cwd(), 'bookmarks-export.json');
                                                        return [4 /*yield*/, this.importBookmarks(importPath, true).catch(function (err) { return console.error('Import bookmarks failed:', err); })];
                                                    case 1:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); }
                                    },
                                    {
                                        isSeparator: true
                                    }
                                ], this.bookmarks.map(function (bookmark) { return ({
                                    label: bookmark.title,
                                    onSelected: function () {
                                        _this.changePage(bookmark.url).catch(function (err) { return console.error('Navigate to bookmark failed:', err); });
                                    }
                                }); }), true)
                            },
                            {
                                label: 'Help',
                                items: [
                                    {
                                        label: 'About Tsyne Browser',
                                        onSelected: function () { return __awaiter(_this, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, this.window.showInfo('About Tsyne Browser', 'Tsyne Browser - Load TypeScript pages from web servers\n\nVersion 0.1.0')];
                                                    case 1:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); }
                                    }
                                ]
                            }
                        ];
                        // Add page-defined menus
                        for (_i = 0, _a = this.pageMenus.entries(); _i < _a.length; _i++) {
                            _b = _a[_i], menuLabel = _b[0], items = _b[1];
                            menuDefinition.push({
                                label: menuLabel,
                                items: items.map(function (item) { return ({
                                    label: item.label,
                                    onSelected: item.onSelected,
                                    disabled: item.disabled,
                                    checked: item.checked
                                }); })
                            });
                        }
                        return [4 /*yield*/, this.window.setMainMenu(menuDefinition)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Build the complete window content: browser chrome + page content
     */
    Browser.prototype.buildWindowContent = function () {
        var _this = this;
        console.log('[buildWindowContent] Called - currentPageBuilder:', this.currentPageBuilder !== null ? 'SET' : 'NULL');
        var _a = require('./index'), vbox = _a.vbox, hbox = _a.hbox, button = _a.button, entry = _a.entry, separator = _a.separator, scroll = _a.scroll, label = _a.label, border = _a.border;
        // Use border layout at top level: chrome at top, content in center, status bar at bottom
        border({
            top: function () {
                vbox(function () {
                    // Browser chrome (address bar and navigation buttons)
                    // Use border layout to make address bar expand
                    border({
                        left: function () {
                            hbox(function () {
                                button('←', function () {
                                    _this.back().catch(function (err) { return console.error('Back failed:', err); });
                                });
                                button('→', function () {
                                    _this.forward().catch(function (err) { return console.error('Forward failed:', err); });
                                });
                                button('⟳', function () {
                                    _this.reload().catch(function (err) { return console.error('Reload failed:', err); });
                                });
                                // Home button (only visible when homeUrl is configured)
                                if (_this.homeUrl) {
                                    button('🏠', function () {
                                        _this.home().catch(function (err) { return console.error('Home failed:', err); });
                                    });
                                }
                                // Stop button (only visible when loading)
                                if (_this.loading) {
                                    _this.stopButton = button('✕', function () {
                                        _this.stop();
                                    });
                                }
                            });
                        },
                        center: function () {
                            // Address bar expands to fill available space
                            // Add onSubmit callback for Enter key navigation
                            _this.addressBarEntry = entry(_this.currentUrl || 'http://', function () { return __awaiter(_this, void 0, void 0, function () {
                                var url;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!this.addressBarEntry) return [3 /*break*/, 3];
                                            return [4 /*yield*/, this.addressBarEntry.getText()];
                                        case 1:
                                            url = _a.sent();
                                            return [4 /*yield*/, this.changePage(url)];
                                        case 2:
                                            _a.sent();
                                            _a.label = 3;
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                        },
                        right: function () {
                            hbox(function () {
                                // Loading indicator
                                if (_this.loading) {
                                    _this.loadingLabel = label('Loading...');
                                }
                                button('Go', function () { return __awaiter(_this, void 0, void 0, function () {
                                    var url;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!this.addressBarEntry) return [3 /*break*/, 3];
                                                return [4 /*yield*/, this.addressBarEntry.getText()];
                                            case 1:
                                                url = _a.sent();
                                                return [4 /*yield*/, this.changePage(url)];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                }); });
                            });
                        }
                    });
                    separator();
                });
            },
            center: function () {
                // Page content area (scrollable) - fills remaining space
                scroll(function () {
                    vbox(function () {
                        if (_this.currentPageBuilder !== null) {
                            // Render current page content
                            console.log('[buildWindowContent] Rendering page content - calling currentPageBuilder()');
                            _this.currentPageBuilder();
                            console.log('[buildWindowContent] Page content rendered');
                        }
                        else {
                            // Welcome message when no page loaded
                            console.log('[buildWindowContent] No currentPageBuilder - rendering placeholder');
                            label('Tsyne Browser');
                            label('');
                            label('Enter a URL in the address bar and click Go to navigate.');
                        }
                    });
                });
            },
            bottom: function () {
                // Status bar at bottom
                vbox(function () {
                    separator();
                    hbox(function () {
                        _this.statusBarLabel = label(_this.statusText);
                    });
                });
            }
        });
    };
    /**
     * Validate URL format before navigation
     */
    Browser.prototype.validateUrl = function (url) {
        // Check for empty URL
        if (!url || url.trim().length === 0) {
            return { valid: false, error: 'URL cannot be empty' };
        }
        url = url.trim();
        // Allow relative URLs starting with /
        if (url.startsWith('/')) {
            if (!this.currentUrl) {
                return { valid: false, error: 'Cannot navigate to relative URL without a current page' };
            }
            return { valid: true };
        }
        // Check for supported protocols
        var hasProtocol = url.includes('://');
        if (!hasProtocol) {
            return { valid: false, error: 'URL must include a protocol (http:// or https://)' };
        }
        var protocol = url.split('://')[0].toLowerCase();
        if (protocol !== 'http' && protocol !== 'https') {
            return { valid: false, error: "Unsupported protocol: ".concat(protocol, ":// (only http:// and https:// are supported)") };
        }
        // Try parsing URL
        try {
            var urlObj = new url_1.URL(url);
            // Check for valid hostname
            if (!urlObj.hostname || urlObj.hostname.length === 0) {
                return { valid: false, error: 'URL must include a hostname' };
            }
            return { valid: true };
        }
        catch (e) {
            return { valid: false, error: "Invalid URL format: ".concat(e instanceof Error ? e.message : String(e)) };
        }
    };
    /**
     * Navigate to a URL and load the Tsyne page
     */
    Browser.prototype.changePage = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var validation, currentUrlObj, fullUrl, pageCode, fromCache, cachedEntry, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('changePage called with URL:', url);
                        if (this.loading) {
                            console.log('Page already loading, ignoring navigation');
                            return [2 /*return*/];
                        }
                        validation = this.validateUrl(url);
                        if (!!validation.valid) return [3 /*break*/, 2];
                        console.error('Invalid URL:', validation.error);
                        this.statusText = "Invalid URL: ".concat(validation.error);
                        return [4 /*yield*/, this.showError(url, new Error(validation.error || 'Invalid URL'))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        // Handle relative URLs - convert to full URL using current URL's origin
                        if (url.startsWith('/') && this.currentUrl) {
                            try {
                                currentUrlObj = new url_1.URL(this.currentUrl);
                                fullUrl = "".concat(currentUrlObj.protocol, "//").concat(currentUrlObj.host).concat(url);
                                console.log('Converted relative URL to full URL:', fullUrl);
                                url = fullUrl;
                            }
                            catch (e) {
                                console.error('Failed to convert relative URL:', e);
                            }
                        }
                        this.loading = true;
                        this.currentUrl = url;
                        console.log('Starting navigation to:', url);
                        // Update address bar
                        if (this.addressBarEntry) {
                            this.addressBarEntry.setText(url);
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 9, , 12]);
                        pageCode = void 0;
                        fromCache = false;
                        cachedEntry = this.pageCache.get(url);
                        if (!cachedEntry) return [3 /*break*/, 4];
                        // Cache hit - use cached page
                        console.log('Cache hit for URL:', url);
                        pageCode = cachedEntry.pageCode;
                        fromCache = true;
                        this.statusText = "Loaded from cache: ".concat(url);
                        return [3 /*break*/, 6];
                    case 4:
                        // Cache miss - fetch from server
                        console.log('Cache miss for URL:', url);
                        this.statusText = "Loading ".concat(url, "...");
                        return [4 /*yield*/, this.fetchPage(url)];
                    case 5:
                        pageCode = _a.sent();
                        // Check if loading was cancelled
                        if (!this.loading) {
                            console.log('Loading cancelled');
                            this.statusText = 'Ready';
                            return [2 /*return*/];
                        }
                        // Add to cache
                        this.pageCache.set(url, {
                            url: url,
                            pageCode: pageCode,
                            fetchedAt: Date.now()
                        });
                        console.log('Added to cache:', url);
                        _a.label = 6;
                    case 6:
                        // Add to history (clear forward history if navigating from middle)
                        if (this.historyIndex < this.history.length - 1) {
                            this.history = this.history.slice(0, this.historyIndex + 1);
                        }
                        this.history.push({
                            url: url,
                            pageCode: pageCode,
                            visitedAt: Date.now(),
                            title: this.pageTitle || url // Will be updated after page renders
                        });
                        this.historyIndex = this.history.length - 1;
                        // Save history to disk
                        this.saveHistory();
                        // Render the page
                        return [4 /*yield*/, this.renderPage(pageCode)];
                    case 7:
                        // Render the page
                        _a.sent();
                        // Page rendered successfully - stop loading and update status
                        this.loading = false;
                        this.currentRequest = null;
                        this.statusText = fromCache ? 'Loaded from cache' : 'Done';
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 8:
                        _a.sent(); // Update menu bar to reflect new history state
                        // Update browser globals
                        this.updateBrowserGlobals();
                        return [3 /*break*/, 12];
                    case 9:
                        error_1 = _a.sent();
                        if (!this.loading) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.showError(url, error_1)];
                    case 10:
                        _a.sent();
                        _a.label = 11;
                    case 11:
                        this.loading = false;
                        this.currentRequest = null;
                        this.statusText = 'Error loading page';
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop loading current page
     */
    Browser.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.loading) {
                            return [2 /*return*/];
                        }
                        console.log('Stopping page load');
                        this.loading = false;
                        // Abort current HTTP request
                        if (this.currentRequest) {
                            this.currentRequest.destroy();
                            this.currentRequest = null;
                        }
                        return [4 /*yield*/, this.updateUI()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update UI to reflect current state
     */
    Browser.prototype.updateUI = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                    // Re-render window to update stop button and loading indicator
                    return [4 /*yield*/, this.window.setContent(function () {
                            _this.buildWindowContent();
                        })];
                    case 1:
                        // Re-render window to update stop button and loading indicator
                        _a.sent();
                        // Update menu bar to reflect current state
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 2:
                        // Update menu bar to reflect current state
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add custom page menu to browser menu bar
     */
    Browser.prototype.addPageMenu = function (menuLabel, items) {
        this.pageMenus.set(menuLabel, items);
        this.setupMenuBar();
    };
    /**
     * Navigate back in history
     */
    Browser.prototype.back = function () {
        return __awaiter(this, void 0, void 0, function () {
            var entry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.historyIndex <= 0) {
                            console.log('No previous page in history');
                            return [2 /*return*/];
                        }
                        this.historyIndex--;
                        entry = this.history[this.historyIndex];
                        this.currentUrl = entry.url;
                        // Update address bar
                        if (this.addressBarEntry) {
                            this.addressBarEntry.setText(this.currentUrl);
                        }
                        // Save history to disk (preserves historyIndex)
                        this.saveHistory();
                        this.statusText = 'Navigated back';
                        return [4 /*yield*/, this.renderPage(entry.pageCode)];
                    case 1:
                        _a.sent();
                        // Update browser globals
                        this.updateBrowserGlobals();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Navigate forward in history
     */
    Browser.prototype.forward = function () {
        return __awaiter(this, void 0, void 0, function () {
            var entry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.historyIndex >= this.history.length - 1) {
                            console.log('No next page in history');
                            return [2 /*return*/];
                        }
                        this.historyIndex++;
                        entry = this.history[this.historyIndex];
                        this.currentUrl = entry.url;
                        // Update address bar
                        if (this.addressBarEntry) {
                            this.addressBarEntry.setText(this.currentUrl);
                        }
                        // Save history to disk (preserves historyIndex)
                        this.saveHistory();
                        this.statusText = 'Navigated forward';
                        return [4 /*yield*/, this.renderPage(entry.pageCode)];
                    case 1:
                        _a.sent();
                        // Update browser globals
                        this.updateBrowserGlobals();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reload current page
     */
    Browser.prototype.reload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var entry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.currentUrl && this.historyIndex >= 0)) return [3 /*break*/, 2];
                        entry = this.history[this.historyIndex];
                        this.statusText = 'Reloading page...';
                        return [4 /*yield*/, this.renderPage(entry.pageCode)];
                    case 1:
                        _a.sent();
                        this.statusText = 'Done';
                        // Update browser globals
                        this.updateBrowserGlobals();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Navigate to home page
     */
    Browser.prototype.home = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.homeUrl) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.changePage(this.homeUrl)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        console.log('No home URL configured');
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update browser globals (location and history) for browser compatibility
     * This allows npm packages designed for browsers to work in Tsyne browser mode
     */
    Browser.prototype.updateBrowserGlobals = function () {
        var _this = this;
        if (!this.currentUrl) {
            return;
        }
        try {
            var urlObj = new url_1.URL(this.currentUrl);
            // Create location object
            var location_1 = {
                href: urlObj.href,
                protocol: urlObj.protocol,
                host: urlObj.host,
                hostname: urlObj.hostname,
                port: urlObj.port,
                pathname: urlObj.pathname,
                search: urlObj.search,
                hash: urlObj.hash,
                origin: urlObj.origin,
                reload: function () {
                    _this.reload();
                },
                replace: function (url) {
                    // Replace current history entry
                    if (_this.historyIndex >= 0 && _this.history[_this.historyIndex]) {
                        _this.history[_this.historyIndex].url = url;
                        _this.saveHistory();
                    }
                    _this.changePage(url);
                },
                assign: function (url) {
                    _this.changePage(url);
                }
            };
            // Create history object
            var history_1 = {
                length: this.history.length,
                state: null,
                back: function () {
                    _this.back();
                },
                forward: function () {
                    _this.forward();
                },
                go: function (delta) {
                    if (delta === undefined || delta === 0) {
                        _this.reload();
                    }
                    else if (delta < 0) {
                        // Go back
                        for (var i = 0; i < Math.abs(delta); i++) {
                            _this.back();
                        }
                    }
                    else {
                        // Go forward
                        for (var i = 0; i < delta; i++) {
                            _this.forward();
                        }
                    }
                },
                pushState: function (state, title, url) {
                    // For now, we don't support pushState fully
                    console.log('[Browser] pushState not fully implemented:', { state: state, title: title, url: url });
                },
                replaceState: function (state, title, url) {
                    // For now, we don't support replaceState fully
                    console.log('[Browser] replaceState not fully implemented:', { state: state, title: title, url: url });
                }
            };
            // Set browser globals
            (0, globals_1.setBrowserGlobals)(location_1, history_1);
        }
        catch (e) {
            console.error('Failed to update browser globals:', e);
        }
    };
    /**
     * Set the page title and update window title bar
     */
    Browser.prototype.setPageTitle = function (title) {
        this.pageTitle = title;
        this.updateWindowTitle();
    };
    /**
     * Update the window title bar
     */
    Browser.prototype.updateWindowTitle = function () {
        var fullTitle = this.pageTitle
            ? "".concat(this.pageTitle, " - ").concat(this.baseTitle)
            : this.baseTitle;
        this.window.setTitle(fullTitle);
    };
    /**
     * Set the status bar text
     */
    Browser.prototype.setStatus = function (status) {
        this.statusText = status;
        // Don't call updateUI() here - status will be reflected on next render
        // Calling updateUI() here would cause infinite loop if page calls setStatus() during load
    };
    /**
     * Fetch page code from a URL
     */
    Browser.prototype.fetchPage = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var urlObj = new url_1.URL(url);
                        var client = urlObj.protocol === 'https:' ? https_1.default : http_1.default;
                        var req = client.get(url, function (res) {
                            // Handle redirects
                            if (res.statusCode === 301 || res.statusCode === 302) {
                                var redirectUrl = res.headers.location;
                                if (redirectUrl) {
                                    resolve(_this.fetchPage(redirectUrl));
                                    return;
                                }
                            }
                            // Handle errors
                            if (res.statusCode !== 200) {
                                reject(new Error("HTTP ".concat(res.statusCode, ": ").concat(res.statusMessage)));
                                return;
                            }
                            var data = '';
                            res.on('data', function (chunk) {
                                data += chunk;
                            });
                            res.on('end', function () {
                                resolve(data);
                            });
                        });
                        req.on('error', function (error) {
                            reject(error);
                        });
                        req.setTimeout(10000, function () {
                            req.destroy();
                            reject(new Error('Request timeout'));
                        });
                        // Store request so it can be cancelled
                        _this.currentRequest = req;
                    })];
            });
        });
    };
    /**
     * Render a page from its code into the browser window
     */
    Browser.prototype.renderPage = function (pageCode) {
        return __awaiter(this, void 0, void 0, function () {
            var pagePath, urlObj, browserContext, _a, ResourceDiscoveryContext, createDiscoveryAPI, discoveryContext, discoveryTsyne, discoveryFunction, discoveredResources, resourceMap, ResourceFetcher, fetcher, appContext, tsyne_1, entry, error_2;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Reset page title when loading new page
                        this.pageTitle = '';
                        this.updateWindowTitle();
                        pagePath = this.currentUrl;
                        try {
                            urlObj = new url_1.URL(this.currentUrl);
                            pagePath = urlObj.pathname;
                        }
                        catch (_c) {
                            // If URL parsing fails, use as-is
                        }
                        console.log('renderPage called for path:', pagePath);
                        console.log('Code length:', pageCode.length, 'chars');
                        browserContext = {
                            back: function () { return _this.back(); },
                            forward: function () { return _this.forward(); },
                            changePage: function (url) { return _this.changePage(url); },
                            reload: function () { return _this.reload(); },
                            stop: function () { return _this.stop(); },
                            home: function () { return _this.home(); },
                            setPageTitle: function (title) { return _this.setPageTitle(title); },
                            setStatus: function (status) { return _this.setStatus(status); },
                            addPageMenu: function (menuLabel, items) { return _this.addPageMenu(menuLabel, items); },
                            currentUrl: this.currentUrl,
                            isLoading: this.loading,
                            browser: this
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, , 11]);
                        //=== DUAL EXECUTION: Discovery Pass ===
                        console.log('[Discovery] Starting resource discovery pass...');
                        _a = require('./resource-discovery'), ResourceDiscoveryContext = _a.ResourceDiscoveryContext, createDiscoveryAPI = _a.createDiscoveryAPI;
                        discoveryContext = new ResourceDiscoveryContext();
                        discoveryTsyne = createDiscoveryAPI(discoveryContext);
                        // Execute page code in discovery context to find resources
                        try {
                            discoveryFunction = new Function('browserContext', 'tsyne', pageCode);
                            discoveryFunction(browserContext, discoveryTsyne);
                        }
                        catch (error) {
                            console.log('[Discovery] Error during discovery (non-fatal):', error);
                        }
                        discoveredResources = discoveryContext.getDiscoveredResources();
                        console.log('[Discovery] Found resources:', discoveredResources);
                        resourceMap = new Map();
                        if (!(discoveredResources.images.length > 0)) return [3 /*break*/, 3];
                        console.log("[ResourceFetch] Fetching ".concat(discoveredResources.images.length, " image(s)..."));
                        ResourceFetcher = require('./resource-fetcher').ResourceFetcher;
                        fetcher = new ResourceFetcher();
                        return [4 /*yield*/, fetcher.fetchResources(discoveredResources.images, this.currentUrl)];
                    case 2:
                        resourceMap = _b.sent();
                        console.log("[ResourceFetch] Successfully fetched ".concat(resourceMap.size, " resource(s)"));
                        _b.label = 3;
                    case 3:
                        //=== REAL EXECUTION: Render Pass ===
                        console.log('[Render] Starting real render pass with resources...');
                        appContext = this.app.ctx;
                        appContext.setResourceMap(resourceMap);
                        tsyne_1 = require('./index');
                        console.log('[Render] Creating page builder...');
                        // Create a content builder that executes the page code with resources
                        this.currentPageBuilder = function () {
                            console.log('[Render] Executing page builder...');
                            // Execute the page code - it will create widgets directly
                            var pageFunction = new Function('browserContext', 'tsyne', pageCode);
                            pageFunction(browserContext, tsyne_1);
                            console.log('[Render] Page builder executed');
                        };
                        console.log('[Render] Setting window content...');
                        console.log('[Render] currentPageBuilder is:', this.currentPageBuilder !== null ? 'SET' : 'NULL');
                        // Re-render the entire window (chrome + new content)
                        return [4 /*yield*/, this.window.setContent(function () {
                                console.log('[Render] Inside setContent callback - about to call buildWindowContent()');
                                _this.buildWindowContent();
                                console.log('[Render] buildWindowContent() completed');
                            })];
                    case 4:
                        // Re-render the entire window (chrome + new content)
                        _b.sent();
                        console.log('[Render] Window content set - setContent() returned');
                        if (!!this.firstPageLoaded) return [3 /*break*/, 6];
                        console.log('[Render] Showing window for first time...');
                        return [4 /*yield*/, this.window.show()];
                    case 5:
                        _b.sent();
                        this.firstPageLoaded = true;
                        console.log('[Render] Window shown');
                        _b.label = 6;
                    case 6:
                        if (!this.testMode) return [3 /*break*/, 8];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        // Update history entry title if page set a title
                        if (this.pageTitle && this.historyIndex >= 0) {
                            entry = this.history[this.historyIndex];
                            if (entry && entry.title !== this.pageTitle) {
                                entry.title = this.pageTitle;
                                this.saveHistory();
                            }
                        }
                        console.log('[Render] renderPage completed successfully');
                        return [3 /*break*/, 11];
                    case 9:
                        error_2 = _b.sent();
                        console.error('[Error] Error in renderPage:', error_2);
                        return [4 /*yield*/, this.showError(this.currentUrl, error_2)];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Show error page in the content area
     */
    Browser.prototype.showError = function (url, error) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Create error content builder
                        this.currentPageBuilder = function () {
                            var _a = require('./index'), vbox = _a.vbox, label = _a.label, button = _a.button;
                            vbox(function () {
                                label('Error Loading Page');
                                label('');
                                label("URL: ".concat(url));
                                label("Error: ".concat(error.message || error));
                                label('');
                                if (_this.historyIndex > 0) {
                                    button('Go Back', function () {
                                        _this.back().catch(function (err) { return console.error('Back failed:', err); });
                                    });
                                }
                            });
                        };
                        // Re-render window with error content
                        return [4 /*yield*/, this.window.setContent(function () {
                                _this.buildWindowContent();
                            })];
                    case 1:
                        // Re-render window with error content
                        _a.sent();
                        if (!!this.firstPageLoaded) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.window.show()];
                    case 2:
                        _a.sent();
                        this.firstPageLoaded = true;
                        _a.label = 3;
                    case 3:
                        if (!this.testMode) return [3 /*break*/, 5];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save browsing history to disk
     */
    Browser.prototype.saveHistory = function () {
        try {
            // Ensure the .tsyne directory exists
            var dir = path.dirname(this.historyFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Save history as JSON
            var historyData = {
                history: this.history,
                historyIndex: this.historyIndex
            };
            fs.writeFileSync(this.historyFilePath, JSON.stringify(historyData, null, 2), 'utf8');
            console.log('History saved to:', this.historyFilePath);
        }
        catch (error) {
            console.error('Failed to save history:', error);
            // Don't throw - history persistence failure shouldn't crash browser
        }
    };
    /**
     * Load browsing history from disk
     */
    Browser.prototype.loadHistory = function () {
        try {
            if (fs.existsSync(this.historyFilePath)) {
                var data = fs.readFileSync(this.historyFilePath, 'utf8');
                var historyData = JSON.parse(data);
                if (historyData.history && Array.isArray(historyData.history)) {
                    this.history = historyData.history;
                    this.historyIndex = historyData.historyIndex || -1;
                    console.log('History loaded from disk:', this.history.length, 'entries');
                }
            }
        }
        catch (error) {
            console.error('Failed to load history:', error);
            // Don't throw - just start with empty history
            this.history = [];
            this.historyIndex = -1;
        }
    };
    /**
     * Clear browsing history
     */
    Browser.prototype.clearHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Clear in-memory history
                        this.history = [];
                        this.historyIndex = -1;
                        // Delete history file from disk
                        if (fs.existsSync(this.historyFilePath)) {
                            fs.unlinkSync(this.historyFilePath);
                            console.log('History file deleted:', this.historyFilePath);
                        }
                        // Update status
                        this.statusText = 'History cleared';
                        console.log('Browser history cleared');
                        // Update menu bar to reflect empty history (disable back/forward)
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 1:
                        // Update menu bar to reflect empty history (disable back/forward)
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Failed to clear history:', error_3);
                        this.statusText = 'Error clearing history';
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add a bookmark for the current page
     */
    Browser.prototype.addBookmark = function (title) {
        return __awaiter(this, void 0, void 0, function () {
            var bookmarkTitle, bookmark;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.currentUrl) {
                            console.log('No current page to bookmark');
                            return [2 /*return*/];
                        }
                        // Check if already bookmarked
                        if (this.isBookmarked(this.currentUrl)) {
                            console.log('Page already bookmarked:', this.currentUrl);
                            this.statusText = 'Page already bookmarked';
                            return [2 /*return*/];
                        }
                        bookmarkTitle = title || this.pageTitle || this.currentUrl;
                        bookmark = {
                            title: bookmarkTitle,
                            url: this.currentUrl,
                            addedAt: Date.now()
                        };
                        this.bookmarks.push(bookmark);
                        this.saveBookmarks();
                        this.statusText = "Bookmarked: ".concat(bookmarkTitle);
                        console.log('Added bookmark:', bookmark);
                        // Update menu bar to include new bookmark
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 1:
                        // Update menu bar to include new bookmark
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove a bookmark by URL
     */
    Browser.prototype.removeBookmark = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var initialLength;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        initialLength = this.bookmarks.length;
                        this.bookmarks = this.bookmarks.filter(function (b) { return b.url !== url; });
                        if (!(this.bookmarks.length < initialLength)) return [3 /*break*/, 2];
                        this.saveBookmarks();
                        this.statusText = 'Bookmark removed';
                        console.log('Removed bookmark:', url);
                        // Update menu bar to reflect removed bookmark
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 1:
                        // Update menu bar to reflect removed bookmark
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        console.log('Bookmark not found:', url);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a URL is bookmarked
     */
    Browser.prototype.isBookmarked = function (url) {
        return this.bookmarks.some(function (b) { return b.url === url; });
    };
    /**
     * Get all bookmarks
     */
    Browser.prototype.getBookmarks = function () {
        return this.bookmarks;
    };
    /**
     * Load bookmarks from disk
     */
    Browser.prototype.loadBookmarks = function () {
        try {
            if (fs.existsSync(this.bookmarksFilePath)) {
                var data = fs.readFileSync(this.bookmarksFilePath, 'utf8');
                var bookmarksData = JSON.parse(data);
                if (bookmarksData.bookmarks && Array.isArray(bookmarksData.bookmarks)) {
                    this.bookmarks = bookmarksData.bookmarks;
                    console.log('Bookmarks loaded from disk:', this.bookmarks.length, 'entries');
                }
            }
        }
        catch (error) {
            console.error('Failed to load bookmarks:', error);
            // Don't throw - just start with empty bookmarks
            this.bookmarks = [];
        }
    };
    /**
     * Save bookmarks to disk
     */
    Browser.prototype.saveBookmarks = function () {
        try {
            // Ensure the .tsyne directory exists
            var dir = path.dirname(this.bookmarksFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Save bookmarks as JSON
            var bookmarksData = {
                bookmarks: this.bookmarks
            };
            fs.writeFileSync(this.bookmarksFilePath, JSON.stringify(bookmarksData, null, 2), 'utf8');
            console.log('Bookmarks saved to:', this.bookmarksFilePath);
        }
        catch (error) {
            console.error('Failed to save bookmarks:', error);
            // Don't throw - bookmark persistence failure shouldn't crash browser
        }
    };
    /**
     * Export bookmarks to a file
     * @param filePath Path to export file (defaults to bookmarks-export.json in current directory)
     */
    Browser.prototype.exportBookmarks = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var exportPath, exportData, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        exportPath = filePath || path.join(process.cwd(), 'bookmarks-export.json');
                        exportData = {
                            version: '1.0',
                            exportedAt: Date.now(),
                            exportedFrom: 'Tsyne Browser',
                            bookmarks: this.bookmarks
                        };
                        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
                        console.log('Bookmarks exported to:', exportPath);
                        this.statusText = "Exported ".concat(this.bookmarks.length, " bookmark(s) to ").concat(path.basename(exportPath));
                        return [4 /*yield*/, this.window.showInfo('Export Bookmarks', "Successfully exported ".concat(this.bookmarks.length, " bookmark(s) to:\n").concat(exportPath))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Failed to export bookmarks:', error_4);
                        this.statusText = 'Error exporting bookmarks';
                        return [4 /*yield*/, this.window.showError('Export Failed', "Failed to export bookmarks: ".concat(error_4 instanceof Error ? error_4.message : String(error_4)))];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Import bookmarks from a file
     * @param filePath Path to import file
     * @param merge If true, merge with existing bookmarks; if false, replace all bookmarks
     */
    Browser.prototype.importBookmarks = function (filePath_1) {
        return __awaiter(this, arguments, void 0, function (filePath, merge) {
            var data, importData, importedBookmarks, _i, importedBookmarks_1, bookmark, addedCount, existingUrls, _a, importedBookmarks_2, bookmark, error_5;
            if (merge === void 0) { merge = true; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 5]);
                        if (!fs.existsSync(filePath)) {
                            throw new Error("File not found: ".concat(filePath));
                        }
                        data = fs.readFileSync(filePath, 'utf8');
                        importData = JSON.parse(data);
                        // Validate import data format
                        if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
                            throw new Error('Invalid bookmark file format: missing bookmarks array');
                        }
                        importedBookmarks = importData.bookmarks;
                        // Validate each bookmark has required fields
                        for (_i = 0, importedBookmarks_1 = importedBookmarks; _i < importedBookmarks_1.length; _i++) {
                            bookmark = importedBookmarks_1[_i];
                            if (!bookmark.url || !bookmark.title) {
                                throw new Error('Invalid bookmark format: each bookmark must have url and title');
                            }
                        }
                        addedCount = 0;
                        if (merge) {
                            existingUrls = new Set(this.bookmarks.map(function (b) { return b.url; }));
                            for (_a = 0, importedBookmarks_2 = importedBookmarks; _a < importedBookmarks_2.length; _a++) {
                                bookmark = importedBookmarks_2[_a];
                                if (!existingUrls.has(bookmark.url)) {
                                    this.bookmarks.push({
                                        title: bookmark.title,
                                        url: bookmark.url,
                                        addedAt: Date.now() // Use current timestamp for imported bookmarks
                                    });
                                    addedCount++;
                                }
                            }
                        }
                        else {
                            // Replace mode: clear existing bookmarks and use imported ones
                            this.bookmarks = importedBookmarks.map(function (b) { return ({
                                title: b.title,
                                url: b.url,
                                addedAt: b.addedAt || Date.now()
                            }); });
                            addedCount = this.bookmarks.length;
                        }
                        this.saveBookmarks();
                        console.log("Imported ".concat(addedCount, " bookmark(s) from:"), filePath);
                        this.statusText = "Imported ".concat(addedCount, " bookmark(s)");
                        return [4 /*yield*/, this.window.showInfo('Import Bookmarks', "Successfully imported ".concat(addedCount, " bookmark(s) from:\n").concat(filePath, "\n\n") +
                                "Mode: ".concat(merge ? 'Merge (added new bookmarks)' : 'Replace (replaced all bookmarks)'))];
                    case 1:
                        _b.sent();
                        // Update menu bar to show new bookmarks
                        return [4 /*yield*/, this.setupMenuBar()];
                    case 2:
                        // Update menu bar to show new bookmarks
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        error_5 = _b.sent();
                        console.error('Failed to import bookmarks:', error_5);
                        this.statusText = 'Error importing bookmarks';
                        return [4 /*yield*/, this.window.showError('Import Failed', "Failed to import bookmarks: ".concat(error_5 instanceof Error ? error_5.message : String(error_5)))];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find text in current page
     * @param query Search query
     * @param caseSensitive Whether search should be case-sensitive
     * @returns Number of matches found
     */
    Browser.prototype.findInPage = function (query, caseSensitive) {
        if (caseSensitive === void 0) { caseSensitive = false; }
        if (!query || query.trim().length === 0) {
            this.clearFind();
            return 0;
        }
        this.findQuery = query;
        this.findMatches = [];
        this.findCurrentIndex = -1;
        // Get current page code
        if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
            console.log('No page loaded for find');
            return 0;
        }
        var entry = this.history[this.historyIndex];
        var pageCode = entry.pageCode;
        // Search for all matches
        var searchText = caseSensitive ? pageCode : pageCode.toLowerCase();
        var searchQuery = caseSensitive ? query : query.toLowerCase();
        var index = 0;
        while (index < searchText.length) {
            var foundIndex = searchText.indexOf(searchQuery, index);
            if (foundIndex === -1) {
                break;
            }
            this.findMatches.push(foundIndex);
            index = foundIndex + 1;
        }
        // Set current index to first match if any found
        if (this.findMatches.length > 0) {
            this.findCurrentIndex = 0;
        }
        var matchText = this.findMatches.length === 1 ? 'match' : 'matches';
        this.statusText = "Found ".concat(this.findMatches.length, " ").concat(matchText, " for \"").concat(query, "\"");
        console.log("Find in page: \"".concat(query, "\" - ").concat(this.findMatches.length, " matches"));
        return this.findMatches.length;
    };
    /**
     * Move to next match in find results
     * @returns True if moved to next match, false if no next match
     */
    Browser.prototype.findNext = function () {
        if (this.findMatches.length === 0) {
            console.log('No find results to navigate');
            return false;
        }
        if (this.findCurrentIndex < this.findMatches.length - 1) {
            this.findCurrentIndex++;
            this.statusText = "Match ".concat(this.findCurrentIndex + 1, " of ").concat(this.findMatches.length);
            console.log("Find next: ".concat(this.findCurrentIndex + 1, "/").concat(this.findMatches.length));
            return true;
        }
        else {
            // Wrap to first match
            this.findCurrentIndex = 0;
            this.statusText = "Match ".concat(this.findCurrentIndex + 1, " of ").concat(this.findMatches.length, " (wrapped)");
            console.log("Find next: wrapped to first match");
            return true;
        }
    };
    /**
     * Move to previous match in find results
     * @returns True if moved to previous match, false if no previous match
     */
    Browser.prototype.findPrevious = function () {
        if (this.findMatches.length === 0) {
            console.log('No find results to navigate');
            return false;
        }
        if (this.findCurrentIndex > 0) {
            this.findCurrentIndex--;
            this.statusText = "Match ".concat(this.findCurrentIndex + 1, " of ").concat(this.findMatches.length);
            console.log("Find previous: ".concat(this.findCurrentIndex + 1, "/").concat(this.findMatches.length));
            return true;
        }
        else {
            // Wrap to last match
            this.findCurrentIndex = this.findMatches.length - 1;
            this.statusText = "Match ".concat(this.findCurrentIndex + 1, " of ").concat(this.findMatches.length, " (wrapped)");
            console.log("Find previous: wrapped to last match");
            return true;
        }
    };
    /**
     * Clear find state
     */
    Browser.prototype.clearFind = function () {
        this.findQuery = '';
        this.findMatches = [];
        this.findCurrentIndex = -1;
        this.statusText = 'Find cleared';
        console.log('Find cleared');
    };
    /**
     * Get current find query (for testing)
     */
    Browser.prototype.getFindQuery = function () {
        return this.findQuery;
    };
    /**
     * Get find matches count (for testing)
     */
    Browser.prototype.getFindMatchesCount = function () {
        return this.findMatches.length;
    };
    /**
     * Get current find match index (for testing)
     */
    Browser.prototype.getFindCurrentIndex = function () {
        return this.findCurrentIndex;
    };
    /**
     * Get formatted history for display
     * @returns Array of formatted history strings with date/time
     */
    Browser.prototype.getFormattedHistory = function () {
        var _this = this;
        return this.history.map(function (entry, index) {
            var title = entry.title || entry.url;
            var timestamp = entry.visitedAt ? new Date(entry.visitedAt).toLocaleString() : 'Unknown date';
            var isCurrent = index === _this.historyIndex ? ' (current)' : '';
            return "[".concat(index, "] ").concat(title, " - ").concat(timestamp).concat(isCurrent);
        });
    };
    /**
     * Show browsing history in console
     */
    Browser.prototype.showHistory = function () {
        console.log('\n========== Browsing History ==========');
        console.log("Total entries: ".concat(this.history.length));
        console.log("Current index: ".concat(this.historyIndex));
        console.log('======================================');
        if (this.history.length === 0) {
            console.log('(No history)');
        }
        else {
            var formatted = this.getFormattedHistory();
            formatted.forEach(function (line) { return console.log(line); });
        }
        console.log('======================================\n');
    };
    /**
     * Start the browser and show the window
     */
    Browser.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.app.run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the App instance
     */
    Browser.prototype.getApp = function () {
        return this.app;
    };
    /**
     * Get the browser Window instance
     */
    Browser.prototype.getWindow = function () {
        return this.window;
    };
    /**
     * Get browsing history (for testing)
     */
    Browser.prototype.getHistory = function () {
        return this.history;
    };
    /**
     * Get current history index (for testing)
     */
    Browser.prototype.getHistoryIndex = function () {
        return this.historyIndex;
    };
    /**
     * Check if browser can go back (for testing)
     */
    Browser.prototype.canGoBack = function () {
        return this.historyIndex > 0;
    };
    /**
     * Check if browser can go forward (for testing)
     */
    Browser.prototype.canGoForward = function () {
        return this.historyIndex < this.history.length - 1;
    };
    /**
     * Get status text (for testing)
     */
    Browser.prototype.getStatusText = function () {
        return this.statusText;
    };
    return Browser;
}());
exports.Browser = Browser;
/**
 * Create a browser and navigate to initial URL
 */
function createBrowser(initialUrl, options) {
    return __awaiter(this, void 0, void 0, function () {
        var browser;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    browser = new Browser(options);
                    if (!initialUrl) return [3 /*break*/, 2];
                    return [4 /*yield*/, browser.changePage(initialUrl)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, browser];
            }
        });
    });
}
