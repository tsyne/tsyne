/**
 * Tsyne Platform Abstraction Layer
 *
 * Provides Node.js/Tsyne-compatible replacements for browser APIs.
 * Includes animation frames, render targets, and pixel buffer utilities.
 */

// ============================================================================
// Canvas Interface
// ============================================================================

/**
 * Interface for Tsyne canvas widgets that accept pixel buffers
 */
export interface TsyneCanvas {
    width: number;
    height: number;
    setPixelBuffer(data: Uint8Array): Promise<void>;
}

// ============================================================================
// Time and Animation
// ============================================================================

let stubTime: number | undefined;
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, (timestamp: number) => void>();
let animationRunning = false;

/**
 * High-resolution time in milliseconds (replacement for performance.now())
 */
export function now(): number {
    if (stubTime !== undefined) {
        return stubTime;
    }
    if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
    }
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1_000_000;
}

/**
 * Set a fixed time for testing/animation control
 */
export function setNow(time: number): void {
    stubTime = time;
}

/**
 * Restore normal time behavior
 */
export function restoreNow(): void {
    stubTime = undefined;
}

/**
 * Request an animation frame (replacement for requestAnimationFrame)
 */
export function requestAnimationFrame(callback: (timestamp: number) => void): number {
    const global = globalThis as { requestAnimationFrame?: (cb: (t: number) => void) => number };
    if (typeof global.requestAnimationFrame === 'function') {
        return global.requestAnimationFrame(callback);
    }

    const id = ++animationFrameId;
    animationFrameCallbacks.set(id, callback);

    if (!animationRunning) {
        animationRunning = true;
        setImmediate(() => {
            runAnimationFrame();
        });
    }

    return id;
}

/**
 * Cancel a pending animation frame
 */
export function cancelAnimationFrame(id: number): void {
    const global = globalThis as { cancelAnimationFrame?: (id: number) => void };
    if (typeof global.cancelAnimationFrame === 'function') {
        global.cancelAnimationFrame(id);
        return;
    }
    animationFrameCallbacks.delete(id);
}

function runAnimationFrame(): void {
    const timestamp = now();
    const callbacks = Array.from(animationFrameCallbacks.entries());
    animationFrameCallbacks.clear();

    for (const [, callback] of callbacks) {
        callback(timestamp);
    }

    if (animationFrameCallbacks.size > 0) {
        setImmediate(() => runAnimationFrame());
    } else {
        animationRunning = false;
    }
}

/**
 * Cancelable frame request (matches browser.frame() signature)
 */
export function frame(fn: (timestamp: number) => void): { cancel: () => void } {
    const id = requestAnimationFrame(fn);
    return { cancel: () => cancelAnimationFrame(id) };
}

// ============================================================================
// Render Target (Pixel Buffer)
// ============================================================================

/**
 * A software render target - a 2D pixel buffer
 */
export interface RenderTarget {
    width: number;
    height: number;
    pixels: Uint8Array;
}

/**
 * Create a new render target
 */
export function createRenderTarget(width: number, height: number): RenderTarget {
    return {
        width,
        height,
        pixels: new Uint8Array(width * height * 4)
    };
}

/**
 * Clear render target to a solid color
 */
export function clearRenderTarget(
    target: RenderTarget,
    r: number, g: number, b: number, a: number = 255
): void {
    for (let i = 0; i < target.pixels.length; i += 4) {
        target.pixels[i] = r;
        target.pixels[i + 1] = g;
        target.pixels[i + 2] = b;
        target.pixels[i + 3] = a;
    }
}

/**
 * Set a single pixel (no blending)
 */
export function setPixel(
    target: RenderTarget,
    x: number, y: number,
    r: number, g: number, b: number, a: number = 255
): void {
    if (x < 0 || x >= target.width || y < 0 || y >= target.height) return;

    const idx = (y * target.width + x) * 4;
    target.pixels[idx] = r;
    target.pixels[idx + 1] = g;
    target.pixels[idx + 2] = b;
    target.pixels[idx + 3] = a;
}

/**
 * Alpha-blend a pixel onto the render target
 */
export function blendPixel(
    target: RenderTarget,
    x: number, y: number,
    r: number, g: number, b: number, a: number
): void {
    if (x < 0 || x >= target.width || y < 0 || y >= target.height) return;

    const idx = (y * target.width + x) * 4;
    const alpha = a / 255;
    const invAlpha = 1 - alpha;

    target.pixels[idx] = Math.round(target.pixels[idx] * invAlpha + r * alpha);
    target.pixels[idx + 1] = Math.round(target.pixels[idx + 1] * invAlpha + g * alpha);
    target.pixels[idx + 2] = Math.round(target.pixels[idx + 2] * invAlpha + b * alpha);
    target.pixels[idx + 3] = Math.min(255, target.pixels[idx + 3] + a);
}

/**
 * Copy render target to a Tsyne canvas widget
 */
export async function copyToCanvas(
    target: RenderTarget,
    canvas: TsyneCanvas
): Promise<void> {
    await canvas.setPixelBuffer(target.pixels);
}

// ============================================================================
// URL Resolution
// ============================================================================

/**
 * Resolve a relative URL to absolute
 */
export function resolveURL(path: string, base?: string): string {
    try {
        return new URL(path, base || 'https://localhost/').href;
    } catch {
        return path;
    }
}

// ============================================================================
// Fetch / Network
// ============================================================================

export interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: ArrayBuffer | string;
    signal?: AbortSignal;
}

export interface FetchResponse {
    ok: boolean;
    status: number;
    headers: Headers;
    arrayBuffer(): Promise<ArrayBuffer>;
    json(): Promise<unknown>;
    text(): Promise<string>;
}

/**
 * Fetch a resource (works in both browser and Node.js)
 */
export async function fetchResource(url: string, options?: FetchOptions): Promise<FetchResponse> {
    const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
        signal: options?.signal
    });

    return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        arrayBuffer: () => response.arrayBuffer(),
        json: () => response.json(),
        text: () => response.text()
    };
}

// ============================================================================
// Device Properties
// ============================================================================

// Browser-like window interface for device properties
interface WindowLike {
    devicePixelRatio?: number;
    matchMedia?: (query: string) => { matches: boolean };
    requestAnimationFrame?: (callback: (timestamp: number) => void) => number;
}

declare const window: WindowLike | undefined;
declare const document: unknown;

/**
 * Get device pixel ratio (always 1 in Node.js)
 */
export function getDevicePixelRatio(): number {
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
        return window.devicePixelRatio;
    }
    return 1;
}

/**
 * Check if user prefers reduced motion
 */
export function getPrefersReducedMotion(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function';

/**
 * Check if running in Node.js/Tsyne environment
 */
export const isNodeJS = !isBrowser && typeof process !== 'undefined' && !!process.versions?.node;
