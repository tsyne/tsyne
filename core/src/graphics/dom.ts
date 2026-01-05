/**
 * Tsyne DOM Abstraction
 *
 * Provides stub implementations of DOM APIs for running browser code
 * in Node.js/Tsyne. These are minimal no-op implementations.
 */

import { Point } from './geometry';

// ============================================================================
// Type Stubs for DOM APIs (not provided by lib in non-browser environments)
// ============================================================================

/** Stub AddEventListenerOptions interface */
export interface AddEventListenerOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
    signal?: AbortSignal;
}

/** Stub DOMRect interface */
export interface DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/** Stub FrameRequestCallback type */
export type FrameRequestCallback = (time: number) => void;

/** Stub Event interface */
export interface Event {
    type: string;
    target: unknown;
}

/** Stub EventListener type */
export type EventListener = (evt: Event) => void;

/** Stub MediaQueryList interface */
export interface MediaQueryList {
    matches: boolean;
    media: string;
    onchange: ((this: MediaQueryList, ev: Event) => void) | null;
    addListener(callback: (this: MediaQueryList, ev: Event) => void): void;
    removeListener(callback: (this: MediaQueryList, ev: Event) => void): void;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
}

/** Stub CSSStyleDeclaration interface */
export interface CSSStyleDeclaration {
    [property: string]: unknown;
}

// ============================================================================
// Element Stub
// ============================================================================

/**
 * Minimal HTMLElement stub
 */
export class TsyneElement {
    tagName: string;
    className: string = '';
    id: string = '';
    style: Record<string, string> = {};
    children: TsyneElement[] = [];
    parentNode: TsyneElement | null = null;

    private _innerHTML: string = '';
    private _textContent: string = '';
    private _attributes: Map<string, string> = new Map();
    private _eventListeners: Map<string, Set<Function>> = new Map();

    constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    get innerHTML(): string {
        return this._innerHTML;
    }

    set innerHTML(value: string) {
        this._innerHTML = value;
    }

    get textContent(): string {
        return this._textContent;
    }

    set textContent(value: string) {
        this._textContent = value;
    }

    appendChild(child: TsyneElement): TsyneElement {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child: TsyneElement): TsyneElement {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentNode = null;
        }
        return child;
    }

    insertBefore(newChild: TsyneElement, refChild: TsyneElement | null): TsyneElement {
        if (!refChild) {
            return this.appendChild(newChild);
        }
        const idx = this.children.indexOf(refChild);
        if (idx !== -1) {
            this.children.splice(idx, 0, newChild);
            newChild.parentNode = this;
        }
        return newChild;
    }

    setAttribute(name: string, value: string): void {
        this._attributes.set(name, value);
        if (name === 'id') this.id = value;
        if (name === 'class') this.className = value;
    }

    getAttribute(name: string): string | null {
        return this._attributes.get(name) ?? null;
    }

    removeAttribute(name: string): void {
        this._attributes.delete(name);
    }

    hasAttribute(name: string): boolean {
        return this._attributes.has(name);
    }

    setAttributeNS(_ns: string | null, name: string, value: string): void {
        this.setAttribute(name, value);
    }

    addEventListener(type: string, listener: Function, _options?: boolean | AddEventListenerOptions): void {
        if (!this._eventListeners.has(type)) {
            this._eventListeners.set(type, new Set());
        }
        this._eventListeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: Function): void {
        this._eventListeners.get(type)?.delete(listener);
    }

    dispatchEvent(_event: Event): boolean {
        return true;
    }

    getBoundingClientRect(): DOMRect {
        return {
            x: 0, y: 0,
            top: 0, left: 0, bottom: 0, right: 0,
            width: 0, height: 0,
            toJSON: () => ({})
        } as DOMRect;
    }

    get offsetWidth(): number { return 0; }
    get offsetHeight(): number { return 0; }
    get offsetTop(): number { return 0; }
    get offsetLeft(): number { return 0; }
    get clientWidth(): number { return 0; }
    get clientHeight(): number { return 0; }
    get scrollWidth(): number { return 0; }
    get scrollHeight(): number { return 0; }
    get scrollTop(): number { return 0; }
    set scrollTop(_value: number) {}
    get scrollLeft(): number { return 0; }
    set scrollLeft(_value: number) {}

    focus(): void {}
    blur(): void {}
    click(): void {}

    contains(other: TsyneElement | null): boolean {
        if (!other) return false;
        let node: TsyneElement | null = other;
        while (node) {
            if (node === this) return true;
            node = node.parentNode;
        }
        return false;
    }

    querySelector(_selector: string): TsyneElement | null {
        return null;
    }

    querySelectorAll(_selector: string): TsyneElement[] {
        return [];
    }

    getElementsByClassName(_className: string): TsyneElement[] {
        return [];
    }

    getElementsByTagName(_tagName: string): TsyneElement[] {
        return [];
    }

    remove(): void {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    cloneNode(_deep?: boolean): TsyneElement {
        const clone = new TsyneElement(this.tagName);
        clone.className = this.className;
        clone.id = this.id;
        clone._innerHTML = this._innerHTML;
        clone._textContent = this._textContent;
        for (const [k, v] of this._attributes) {
            clone._attributes.set(k, v);
        }
        return clone;
    }
}

// ============================================================================
// Document Stub
// ============================================================================

class TsyneDocument {
    body = new TsyneElement('body');
    head = new TsyneElement('head');
    documentElement = new TsyneElement('html');

    createElement<T extends string>(tagName: T): TsyneElement {
        return new TsyneElement(tagName);
    }

    createElementNS(_ns: string, tagName: string): TsyneElement {
        return new TsyneElement(tagName);
    }

    createTextNode(_text: string): TsyneElement {
        return new TsyneElement('#text');
    }

    createDocumentFragment(): TsyneElement {
        return new TsyneElement('#fragment');
    }

    getElementById(_id: string): TsyneElement | null {
        return null;
    }

    querySelector(_selector: string): TsyneElement | null {
        return null;
    }

    querySelectorAll(_selector: string): TsyneElement[] {
        return [];
    }

    addEventListener(_type: string, _listener: Function, _options?: boolean | AddEventListenerOptions): void {}
    removeEventListener(_type: string, _listener: Function): void {}

    get activeElement(): TsyneElement | null {
        return null;
    }

    get hidden(): boolean {
        return false;
    }

    get visibilityState(): string {
        return 'visible';
    }
}

export const document = new TsyneDocument();

// ============================================================================
// Window Stub
// ============================================================================

class TsyneWindow {
    devicePixelRatio = 1;
    innerWidth = 800;
    innerHeight = 600;
    outerWidth = 800;
    outerHeight = 600;
    screenX = 0;
    screenY = 0;

    document = document;
    location = {
        href: 'https://localhost/',
        protocol: 'https:',
        host: 'localhost',
        hostname: 'localhost',
        port: '',
        pathname: '/',
        search: '',
        hash: '',
        origin: 'https://localhost'
    };

    navigator = {
        userAgent: 'Tsyne/1.0 (compatible; Node.js)',
        language: 'en-US',
        languages: ['en-US', 'en'],
        platform: 'Linux',
        vendor: '',
        onLine: true
    };

    performance = {
        now: () => {
            const [seconds, nanoseconds] = process.hrtime();
            return seconds * 1000 + nanoseconds / 1_000_000;
        },
        mark: () => {},
        measure: () => {},
        getEntriesByName: () => [],
        getEntriesByType: () => []
    };

    setTimeout = globalThis.setTimeout;
    clearTimeout = globalThis.clearTimeout;
    setInterval = globalThis.setInterval;
    clearInterval = globalThis.clearInterval;
    setImmediate = globalThis.setImmediate;

    requestAnimationFrame(callback: FrameRequestCallback): number {
        return globalThis.setImmediate(() => callback(this.performance.now())) as unknown as number;
    }

    cancelAnimationFrame(id: number): void {
        globalThis.clearImmediate(id as unknown as NodeJS.Immediate);
    }

    addEventListener(_type: string, _listener: Function, _options?: boolean | AddEventListenerOptions): void {}
    removeEventListener(_type: string, _listener: Function): void {}

    matchMedia(_query: string): MediaQueryList {
        return {
            matches: false,
            media: _query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
            onchange: null
        } as MediaQueryList;
    }

    getComputedStyle(_el: TsyneElement): CSSStyleDeclaration {
        return {} as CSSStyleDeclaration;
    }

    open(): null { return null; }
    close(): void {}
    focus(): void {}
    blur(): void {}
    scroll(): void {}
    scrollTo(): void {}
    scrollBy(): void {}

    URL = globalThis.URL;
    URLSearchParams = globalThis.URLSearchParams;
    Blob = globalThis.Blob;
    File = (globalThis as unknown as Record<string, unknown>).File ?? class {};
    FileReader = (globalThis as unknown as Record<string, unknown>).FileReader ?? class {};
    FormData = (globalThis as unknown as Record<string, unknown>).FormData ?? class {};
    Headers: typeof globalThis.Headers = globalThis.Headers;
    Request: typeof globalThis.Request = globalThis.Request;
    Response: typeof globalThis.Response = globalThis.Response;
    fetch = globalThis.fetch;
    AbortController = globalThis.AbortController;
}

export const window = new TsyneWindow();

// ============================================================================
// DOM Utility Functions
// ============================================================================

/**
 * Create an element with optional class and container
 */
export function createElement<T extends string>(
    tagName: T,
    className?: string | null,
    container?: TsyneElement
): TsyneElement {
    const el = new TsyneElement(tagName);
    if (className) el.className = className;
    if (container) container.appendChild(el);
    return el;
}

/**
 * Create an SVG element
 */
export function createSVGElement(
    tagName: string,
    attributes: Record<string, string | number>,
    container?: TsyneElement
): TsyneElement {
    const el = new TsyneElement(tagName);
    for (const [name, value] of Object.entries(attributes)) {
        el.setAttribute(name, String(value));
    }
    if (container) container.appendChild(el);
    return el;
}

/**
 * Get mouse position relative to element (stub)
 */
export function getMousePosition(_el: TsyneElement, e: { clientX: number; clientY: number }): Point {
    return new Point(e.clientX, e.clientY);
}

/**
 * Get touch positions relative to element (stub)
 */
export function getTouchPositions(_el: TsyneElement, touches: Array<{ clientX: number; clientY: number }>): Point[] {
    return touches.map(t => new Point(t.clientX, t.clientY));
}

// No-op drag prevention functions
export function disableDrag(): void {}
export function enableDrag(): void {}
export function suppressClick(): void {}
