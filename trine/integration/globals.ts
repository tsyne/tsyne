/**
 * Browser Global Shims for Non-Browser Environments
 *
 * Three.js expects browser globals like document, window, and requestAnimationFrame.
 * This module provides shims that allow three.js to work in Node.js environments
 * where a Tsyne bridge provides access to native graphics capabilities.
 */

import * as fs from 'fs';
import * as pathModule from 'path';
import { TsyneBridge } from './bridge';
import { TsyneCanvas } from './canvas';
import { TsyneDOMMatrix } from './dom-matrix-polyfill';

let bridge: TsyneBridge | null = null;

/**
 * Initialize the Tsyne globals with a bridge instance.
 * Must be called before using three.js.
 */
export function initTsyneGlobals(tsyneBridge: TsyneBridge): void {
  bridge = tsyneBridge;
}

/**
 * Shim for the document object
 * Provides minimal document API needed by three.js
 */
export const tsyneDocument = {
  /**
   * Create an element
   * Supports 'canvas' for WebGL rendering
   */
  createElement: (tag: string): any => {
    if (tag.toLowerCase() === 'canvas') {
      if (!bridge) {
        throw new Error('Tsyne bridge not initialized. Call initTsyneGlobals() first.');
      }
      return new TsyneCanvas(bridge);
    }
    // For other elements, return a minimal stub
    return {
      style: {},
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  },

  /**
   * Create a namespaced element (used for SVG)
   */
  createElementNS: (ns: string, tag: string): any => {
    return tsyneDocument.createElement(tag);
  },

  /**
   * Body element - stub for appending elements
   */
  body: {
    appendChild: () => {},
    removeChild: () => {},
    insertBefore: () => {},
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  },

  /**
   * Head element - stub for script/style appending
   */
  head: {
    appendChild: () => {},
    removeChild: () => {},
    insertBefore: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  },

  /**
   * Document event handlers
   */
  addEventListener: () => {},
  removeEventListener: () => {},
  ontouchstart: null,
  onmousedown: null,
  onmousemove: null,
  onmouseup: null,
  onwheel: null,
  onscroll: null,

  /**
   * Visibility API stub
   */
  hidden: false,
  visibilityState: 'visible' as const,
  onvisibilitychange: null,

  /**
   * Full screen API stub
   */
  fullscreenElement: null,
  exitFullscreen: async () => {},
  requestFullscreen: async () => {},

  /**
   * Pointer lock API stub
   */
  pointerLockElement: null,
  exitPointerLock: () => {},

  /**
   * Font API stub
   */
  fonts: {
    ready: Promise.resolve(),
    check: () => true,
    load: async () => [],
  },
};

/**
 * Animation frame tracking
 */
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();
let isAnimating = false;

/**
 * Shim for window.requestAnimationFrame
 * Queues callbacks to be called on the next animation frame.
 * The Tsyne bridge will trigger frames via startAnimationLoop().
 */
function requestAnimationFrame(callback: FrameRequestCallback): number {
  const id = ++rafId;
  rafCallbacks.set(id, callback);

  if (!isAnimating) {
    startAnimationLoop();
  }

  return id;
}

/**
 * Shim for window.cancelAnimationFrame
 */
function cancelAnimationFrame(id: number): void {
  rafCallbacks.delete(id);
}

/**
 * Start the animation loop by asking the bridge for the next frame
 */
function startAnimationLoop(): void {
  isAnimating = true;

  // Use setInterval to drive the animation loop at ~60fps
  let animationInterval: NodeJS.Timeout | null = null;
  const targetFrameRate = 60;
  const frameInterval = 1000 / targetFrameRate;

  const processFrame = () => {
    if (rafCallbacks.size === 0) {
      isAnimating = false;
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      return;
    }

    // Execute all queued callbacks with current timestamp
    const timestamp = Date.now();
    const callbacks = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();

    for (const [id, callback] of callbacks) {
      try {
        callback(timestamp);
      } catch (error) {
        console.error(`Error in requestAnimationFrame callback ${id}:`, error);
      }
    }
  };

  // Start the animation loop
  animationInterval = setInterval(processFrame, frameInterval);
}

/**
 * Shim for the window object
 * Provides APIs expected by three.js
 */
export const tsyneWindow = {
  // Dimensions (updated by Tsyne as needed)
  innerWidth: 800,
  innerHeight: 600,
  outerWidth: 800,
  outerHeight: 600,
  devicePixelRatio: 1,

  // Graphics context
  getContext: () => null,

  // Animation
  requestAnimationFrame,
  cancelAnimationFrame,

  // Events
  addEventListener: () => {},
  removeEventListener: () => {},
  onresize: null,
  onload: null,
  onunload: null,
  onbeforeunload: null,

  // Document reference
  document: tsyneDocument,

  // Navigator
  navigator: {
    userAgent: 'Tsyne/1.0 (Node.js)',
    vendor: 'Tsyne',
    language: 'en-US',
    languages: ['en-US'],
    maxTouchPoints: 0,
    hardwareConcurrency: 1,
    deviceMemory: 4,
    platform: 'Linux',
    onLine: true,
  },

  // Performance
  performance: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    getEntries: () => [],
  },

  // Location (stub)
  location: {
    href: 'http://localhost/',
    origin: 'http://localhost/',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    reload: () => {},
    replace: () => {},
    assign: () => {},
  },

  // Storage APIs (stub - in-memory only)
  localStorage: createMemoryStorage(),
  sessionStorage: createMemoryStorage(),

  // Crypto API stub
  crypto: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: async () => new ArrayBuffer(0),
    },
  },

  // Console (pass-through)
  console: global.console,

  // Global reference
  window: null as any,
};

// Self-reference
tsyneWindow.window = tsyneWindow;

/**
 * Create a simple in-memory storage implementation
 */
function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    length: 0,
    clear: () => items.clear(),
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
    key: (index: number) => {
      return Array.from(items.keys())[index] ?? null;
    },
  };
}

// --- fetch() shim for GLTFLoader / FileLoader ---

let _fetchBasePath = process.cwd();

/** Set the base directory used to resolve relative URLs in the fetch shim. */
export function setFetchBasePath(base: string): void {
  _fetchBasePath = base;
}

// In-memory blob store for blob: URLs (used by GLTFLoader for embedded textures)
const _blobStore = new Map<string, Buffer>();
let _blobCounter = 0;

class TsyneHeaders {
  private _map = new Map<string, string>();
  constructor(init?: Record<string, string>) {
    if (init) for (const [k, v] of Object.entries(init)) this._map.set(k.toLowerCase(), v);
  }
  get(name: string) { return this._map.get(name.toLowerCase()) ?? null; }
  set(name: string, value: string) { this._map.set(name.toLowerCase(), value); }
  has(name: string) { return this._map.has(name.toLowerCase()); }
  forEach(cb: (value: string, key: string) => void) { this._map.forEach(cb); }
}

class TsyneResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: TsyneHeaders;
  url: string;
  private _body: Buffer;
  private _bodyUsed = false;
  constructor(body: Buffer, init: { status?: number; statusText?: string; headers?: Record<string, string>; url?: string } = {}) {
    this._body = body;
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new TsyneHeaders(init.headers);
    this.url = init.url ?? '';
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    this._bodyUsed = true;
    return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength);
  }
  async text(): Promise<string> {
    this._bodyUsed = true;
    return this._body.toString('utf-8');
  }
  async json(): Promise<any> {
    return JSON.parse(await this.text());
  }
  async blob(): Promise<any> {
    this._bodyUsed = true;
    return new TsyneBlob([this._body]);
  }
  get bodyUsed() { return this._bodyUsed; }
}

class TsyneBlob {
  private _parts: Buffer[];
  size: number;
  type: string;
  constructor(parts?: any[], options?: { type?: string }) {
    this._parts = (parts || []).map((p: any) => {
      if (Buffer.isBuffer(p)) return p;
      if (p instanceof ArrayBuffer) return Buffer.from(p);
      if (ArrayBuffer.isView(p)) return Buffer.from(p.buffer, p.byteOffset, p.byteLength);
      return Buffer.from(String(p), 'utf-8');
    });
    this.size = this._parts.reduce((s, b) => s + b.length, 0);
    this.type = options?.type ?? '';
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    const buf = Buffer.concat(this._parts);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  async text(): Promise<string> {
    return Buffer.concat(this._parts).toString('utf-8');
  }
  slice(start?: number, end?: number, contentType?: string): TsyneBlob {
    const buf = Buffer.concat(this._parts);
    return new TsyneBlob([buf.slice(start ?? 0, end ?? buf.length)], { type: contentType ?? this.type });
  }
}

const TsyneURL = {
  createObjectURL(blob: any): string {
    const id = `blob:tsyne/${++_blobCounter}`;
    // Store the blob's data as a Buffer
    if (blob && typeof blob.arrayBuffer === 'function') {
      // Synchronously extract from TsyneBlob
      const parts = (blob as any)._parts;
      if (parts) _blobStore.set(id, Buffer.concat(parts));
    }
    return id;
  },
  revokeObjectURL(url: string): void {
    _blobStore.delete(url);
  },
};

function tsyneFetch(input: string | { url?: string }, init?: any): Promise<TsyneResponse> {
  const url = typeof input === 'string' ? input : (input?.url ?? '');

  // Handle blob: URLs
  if (url.startsWith('blob:')) {
    const data = _blobStore.get(url);
    if (data) {
      return Promise.resolve(new TsyneResponse(data, { status: 200, url }));
    }
    return Promise.resolve(new TsyneResponse(Buffer.alloc(0), { status: 404, statusText: 'Not Found', url }));
  }

  // Handle data: URLs
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    if (comma === -1) return Promise.resolve(new TsyneResponse(Buffer.alloc(0), { status: 400, url }));
    const meta = url.slice(5, comma);
    const isBase64 = meta.endsWith(';base64');
    const payload = url.slice(comma + 1);
    const buf = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf-8');
    return Promise.resolve(new TsyneResponse(buf, { status: 200, url }));
  }

  // Resolve file path — strip leading ./ and resolve against base path
  let filePath = url;
  // Strip protocol if present (file://)
  if (filePath.startsWith('file://')) filePath = filePath.slice(7);
  // Strip http://localhost-style URLs (used by location shim)
  if (/^https?:\/\/localhost\/?/.test(filePath)) filePath = filePath.replace(/^https?:\/\/localhost\/?/, '');

  if (!pathModule.isAbsolute(filePath)) {
    filePath = pathModule.resolve(_fetchBasePath, filePath);
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = pathModule.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.bin': 'application/octet-stream', '.txt': 'text/plain', '.html': 'text/html',
    };
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';
    return Promise.resolve(new TsyneResponse(data, {
      status: 200,
      url: filePath,
      headers: { 'content-type': contentType, 'content-length': String(data.length) },
    }));
  } catch (e: any) {
    return Promise.resolve(new TsyneResponse(Buffer.alloc(0), {
      status: 404,
      statusText: e.message || 'Not Found',
      url: filePath,
    }));
  }
}

/**
 * Export globally if in a runtime where we can set globals
 * (some environments like Node.js allow this, others don't)
 */
export function injectGlobals(): void {
  try {
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).document = tsyneDocument;
      (globalThis as any).window = tsyneWindow;

      // Navigator is read-only in Node.js, so try to set it but don't fail if we can't
      try {
        (globalThis as any).navigator = tsyneWindow.navigator;
      } catch (e) {
        // Navigator is likely read-only, skip it
        // The global navigator will still be available
      }

      (globalThis as any).requestAnimationFrame = requestAnimationFrame;
      (globalThis as any).cancelAnimationFrame = cancelAnimationFrame;
      (globalThis as any).performance = tsyneWindow.performance;
      (globalThis as any).console = global.console;

      // fetch shim — always override since Node's native fetch can't handle relative file paths
      (globalThis as any).fetch = tsyneFetch;
      // Override Request/Headers — native Request rejects relative file paths
      (globalThis as any).Request = class TsyneRequest {
        url: string; method: string; headers: any; credentials: string; signal: any;
        constructor(input: string, init?: any) {
          this.url = typeof input === 'string' ? input : (input as any)?.url ?? '';
          this.method = init?.method ?? 'GET';
          this.headers = init?.headers instanceof TsyneHeaders ? init.headers : new TsyneHeaders(init?.headers);
          this.credentials = init?.credentials ?? 'same-origin';
          this.signal = init?.signal ?? null;
        }
      };
      (globalThis as any).Headers = TsyneHeaders;
      (globalThis as any).Response = (globalThis as any).Response ?? TsyneResponse;
      (globalThis as any).Blob = (globalThis as any).Blob ?? TsyneBlob;
      // Patch URL.createObjectURL / revokeObjectURL
      if (typeof URL !== 'undefined') {
        if (!(URL as any).createObjectURL) (URL as any).createObjectURL = TsyneURL.createObjectURL;
        if (!(URL as any).revokeObjectURL) (URL as any).revokeObjectURL = TsyneURL.revokeObjectURL;
      }

      // DOMPoint polyfill (needed by raw WebGL games using DOMPoint/EnhancedDOMPoint)
      if (typeof (globalThis as any).DOMPoint === 'undefined') {
        (globalThis as any).DOMPoint = class TsyneDOMPoint {
          x: number; y: number; z: number; w: number;
          constructor(x = 0, y = 0, z = 0, w = 1) {
            this.x = x; this.y = y; this.z = z; this.w = w;
          }
          matrixTransform(matrix: any): any {
            if (matrix && typeof matrix.transformPoint === 'function') {
              return matrix.transformPoint(this);
            }
            return new (globalThis as any).DOMPoint(this.x, this.y, this.z, this.w);
          }
          toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
        };
      }

      // DOMMatrix polyfill (full 4×4 matrix for raw WebGL games)
      if (typeof (globalThis as any).DOMMatrix === 'undefined') {
        (globalThis as any).DOMMatrix = TsyneDOMMatrix;
      }

      // ImageData polyfill (needed for procedural texture generation)
      if (typeof (globalThis as any).ImageData === 'undefined') {
        (globalThis as any).ImageData = class TsyneImageData {
          width: number;
          height: number;
          data: Uint8ClampedArray;
          constructor(swOrData: number | Uint8ClampedArray, sh: number, height?: number) {
            if (typeof swOrData === 'number') {
              this.width = swOrData;
              this.height = sh;
              this.data = new Uint8ClampedArray(swOrData * sh * 4);
            } else {
              this.data = swOrData;
              this.width = sh;
              this.height = height ?? (swOrData.length / (sh * 4));
            }
          }
        };
      }
    }
  } catch (e) {
    console.warn('Could not inject globals:', e);
  }
}
