/**
 * Browser Compatibility Globals for Tsyne
 *
 * Provides browser-like globals (localStorage, sessionStorage, navigator, alert, confirm, etc.)
 * to enable npm packages designed for browsers to work in Tsyne applications.
 */
/**
 * Storage interface (subset of browser Storage API)
 */
export interface Storage {
    readonly length: number;
    clear(): void;
    getItem(key: string): string | null;
    key(index: number): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
    [key: string]: any;
}
/**
 * Storage implementation that can be backed by filesystem or memory
 */
declare class TsyneStorage implements Storage {
    private data;
    private filePath?;
    private persistent;
    constructor(storageName: string, persistent?: boolean);
    private loadFromDisk;
    private saveToDisk;
    get length(): number;
    clear(): void;
    getItem(key: string): string | null;
    key(index: number): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
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
export declare function initializeGlobals(): void;
/**
 * Set up browser-specific location and history globals
 * This is called by the Browser class when a browser instance is active
 */
export declare function setBrowserGlobals(location: TsyneLocation, history: TsyneHistory): void;
/**
 * Register handlers for dialog functions (alert, confirm, prompt)
 * These handlers should be set by the App or Window instances
 */
export declare function registerDialogHandlers(handlers: {
    alert?: (message: string) => void;
    confirm?: (message: string) => Promise<boolean>;
    prompt?: (message: string, defaultValue?: string) => Promise<string | null>;
}): void;
export { TsyneStorage };
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
