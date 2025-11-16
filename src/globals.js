"use strict";
/**
 * Browser Compatibility Globals for Tsyne
 *
 * Provides browser-like globals (localStorage, sessionStorage, navigator, alert, confirm, etc.)
 * to enable npm packages designed for browsers to work in Tsyne applications.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsyneStorage = void 0;
exports.initializeGlobals = initializeGlobals;
exports.setBrowserGlobals = setBrowserGlobals;
exports.registerDialogHandlers = registerDialogHandlers;
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Version imported from package.json
const version = require('../package.json').version;
/**
 * Storage implementation that can be backed by filesystem or memory
 */
class TsyneStorage {
    constructor(storageName, persistent = false) {
        this.data = new Map();
        this.persistent = persistent;
        if (persistent) {
            // Store in ~/.tsyne directory
            const tsyneDir = path.join(os.homedir(), '.tsyne');
            if (!fs.existsSync(tsyneDir)) {
                fs.mkdirSync(tsyneDir, { recursive: true });
            }
            this.filePath = path.join(tsyneDir, `${storageName}.json`);
            this.loadFromDisk();
        }
    }
    loadFromDisk() {
        if (this.filePath && fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                const data = JSON.parse(content);
                this.data = new Map(Object.entries(data));
            }
            catch (err) {
                console.error(`Failed to load ${this.filePath}:`, err);
            }
        }
    }
    saveToDisk() {
        if (this.persistent && this.filePath) {
            try {
                const data = Object.fromEntries(this.data);
                fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
            }
            catch (err) {
                console.error(`Failed to save ${this.filePath}:`, err);
            }
        }
    }
    get length() {
        return this.data.size;
    }
    clear() {
        this.data.clear();
        this.saveToDisk();
    }
    getItem(key) {
        return this.data.get(key) ?? null;
    }
    key(index) {
        const keys = Array.from(this.data.keys());
        return keys[index] ?? null;
    }
    removeItem(key) {
        this.data.delete(key);
        this.saveToDisk();
    }
    setItem(key, value) {
        this.data.set(key, value);
        this.saveToDisk();
    }
}
exports.TsyneStorage = TsyneStorage;
/**
 * Initialize browser compatibility globals
 * This should be called when the application starts
 */
function initializeGlobals() {
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
        const navigator = {
            userAgent: `Tsyne/${version} (${os.platform()}; ${os.arch()}) Node/${process.version}`,
            platform: os.platform(),
            language: process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en-US',
            languages: Object.freeze([process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en-US']),
            onLine: true,
            hardwareConcurrency: os.cpus().length,
            maxTouchPoints: 0,
            vendor: 'Tsyne',
            vendorSub: '',
            appName: 'Tsyne',
            appVersion: version,
            appCodeName: 'Tsyne',
            product: 'Tsyne',
            productSub: version,
        };
        global.navigator = navigator;
    }
    // alert function - shows info dialog
    if (!global.alert) {
        global.alert = (message) => {
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
        global.confirm = async (message) => {
            // Queue the confirm to be shown by the app
            if (global.__tsyneConfirmHandler) {
                return await global.__tsyneConfirmHandler(message);
            }
            else {
                // Fallback to console if no handler is registered
                console.log('[CONFIRM]', message);
                return false;
            }
        };
    }
    // prompt function - shows input dialog
    if (!global.prompt) {
        global.prompt = async (message, defaultValue) => {
            // Queue the prompt to be shown by the app
            if (global.__tsynePromptHandler) {
                return await global.__tsynePromptHandler(message, defaultValue);
            }
            else {
                // Fallback to console if no handler is registered
                console.log('[PROMPT]', message, defaultValue);
                return null;
            }
        };
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
