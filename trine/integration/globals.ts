/**
 * Browser Global Shims for Non-Browser Environments
 *
 * Three.js expects browser globals like document, window, and requestAnimationFrame.
 * This module provides shims that allow three.js to work in Node.js environments
 * where a Tsyne bridge provides access to native graphics capabilities.
 */

import { TsyneBridge } from './bridge';
import { TsyneCanvas } from './canvas';

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
    }
  } catch (e) {
    console.warn('Could not inject globals:', e);
  }
}
