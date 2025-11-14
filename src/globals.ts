/**
 * Browser Compatibility Globals for Tsyne
 *
 * Provides browser-like globals (localStorage, sessionStorage, navigator, alert, confirm, etc.)
 * to enable npm packages designed for browsers to work in Tsyne applications.
 */

import os from 'os';
import fs from 'fs';
import path from 'path';

// Version imported from package.json
const version = require('../package.json').version;

/**
 * Storage implementation that can be backed by filesystem or memory
 */
class TsyneStorage implements Storage {
  private data: Map<string, string> = new Map();
  private filePath?: string;
  private persistent: boolean;

  constructor(storageName: string, persistent: boolean = false) {
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

  private loadFromDisk(): void {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(content);
        this.data = new Map(Object.entries(data));
      } catch (err) {
        console.error(`Failed to load ${this.filePath}:`, err);
      }
    }
  }

  private saveToDisk(): void {
    if (this.persistent && this.filePath) {
      try {
        const data = Object.fromEntries(this.data);
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error(`Failed to save ${this.filePath}:`, err);
      }
    }
  }

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
    this.saveToDisk();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
    this.saveToDisk();
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
    this.saveToDisk();
  }

  // Allow bracket notation
  [key: string]: any;
}

/**
 * Location-like object for browser compatibility
 */
export interface TsyneLocation {
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  reload(): void;
  replace(url: string): void;
  assign(url: string): void;
}

/**
 * History-like object for browser compatibility
 */
export interface TsyneHistory {
  length: number;
  state: any;
  back(): void;
  forward(): void;
  go(delta?: number): void;
  pushState(state: any, title: string, url?: string): void;
  replaceState(state: any, title: string, url?: string): void;
}

/**
 * Navigator-like object for browser compatibility
 */
export interface TsyneNavigator {
  userAgent: string;
  platform: string;
  language: string;
  languages: readonly string[];
  onLine: boolean;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  vendor: string;
  vendorSub: string;
  appName: string;
  appVersion: string;
  appCodeName: string;
  product: string;
  productSub: string;
}

/**
 * Initialize browser compatibility globals
 * This should be called when the application starts
 */
export function initializeGlobals(): void {
  // Only initialize once
  if ((global as any).__tsyneGlobalsInitialized) {
    return;
  }

  // localStorage - persistent storage
  if (!(global as any).localStorage) {
    (global as any).localStorage = new TsyneStorage('localStorage', true);
  }

  // sessionStorage - in-memory storage (cleared on exit)
  if (!(global as any).sessionStorage) {
    (global as any).sessionStorage = new TsyneStorage('sessionStorage', false);
  }

  // navigator object
  if (!(global as any).navigator) {
    const navigator: TsyneNavigator = {
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
    (global as any).navigator = navigator;
  }

  // alert function - shows info dialog
  if (!(global as any).alert) {
    (global as any).alert = (message: string): void => {
      // Queue the alert to be shown by the app
      if ((global as any).__tsyneAlertHandler) {
        (global as any).__tsyneAlertHandler(message);
      } else {
        // Fallback to console if no handler is registered
        console.log('[ALERT]', message);
      }
    };
  }

  // confirm function - shows confirmation dialog
  if (!(global as any).confirm) {
    (global as any).confirm = async (message: string): Promise<boolean> => {
      // Queue the confirm to be shown by the app
      if ((global as any).__tsyneConfirmHandler) {
        return await (global as any).__tsyneConfirmHandler(message);
      } else {
        // Fallback to console if no handler is registered
        console.log('[CONFIRM]', message);
        return false;
      }
    };
  }

  // prompt function - shows input dialog
  if (!(global as any).prompt) {
    (global as any).prompt = async (message: string, defaultValue?: string): Promise<string | null> => {
      // Queue the prompt to be shown by the app
      if ((global as any).__tsynePromptHandler) {
        return await (global as any).__tsynePromptHandler(message, defaultValue);
      } else {
        // Fallback to console if no handler is registered
        console.log('[PROMPT]', message, defaultValue);
        return null;
      }
    };
  }

  // Mark as initialized
  (global as any).__tsyneGlobalsInitialized = true;
}

/**
 * Set up browser-specific location and history globals
 * This is called by the Browser class when a browser instance is active
 */
export function setBrowserGlobals(location: TsyneLocation, history: TsyneHistory): void {
  (global as any).location = location;
  (global as any).history = history;
}

/**
 * Register handlers for dialog functions (alert, confirm, prompt)
 * These handlers should be set by the App or Window instances
 */
export function registerDialogHandlers(handlers: {
  alert?: (message: string) => void;
  confirm?: (message: string) => Promise<boolean>;
  prompt?: (message: string, defaultValue?: string) => Promise<string | null>;
}): void {
  if (handlers.alert) {
    (global as any).__tsyneAlertHandler = handlers.alert;
  }
  if (handlers.confirm) {
    (global as any).__tsyneConfirmHandler = handlers.confirm;
  }
  if (handlers.prompt) {
    (global as any).__tsynePromptHandler = handlers.prompt;
  }
}

// Export storage classes for testing and advanced usage
export { TsyneStorage };

// Declare global types for TypeScript
declare global {
  var localStorage: Storage;
  var sessionStorage: Storage;
  var navigator: TsyneNavigator;
  var alert: (message: string) => void;
  var confirm: (message: string) => Promise<boolean>;
  var prompt: (message: string, defaultValue?: string) => Promise<string | null>;
  var location: TsyneLocation | undefined;
  var history: TsyneHistory | undefined;
  var __tsyneGlobalsInitialized: boolean | undefined;
  var __tsyneAlertHandler: ((message: string) => void) | undefined;
  var __tsyneConfirmHandler: ((message: string) => Promise<boolean>) | undefined;
  var __tsynePromptHandler: ((message: string, defaultValue?: string) => Promise<string | null>) | undefined;
}
