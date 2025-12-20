import {
  now,
  setNow,
  restoreNow,
  requestAnimationFrame,
  cancelAnimationFrame,
  frame,
  RenderTarget,
  createRenderTarget,
  clearRenderTarget,
  setPixel,
  blendPixel,
  resolveURL,
  getDevicePixelRatio,
  isBrowser,
  isNodeJS
} from './platform';

describe('Time utilities', () => {
  afterEach(() => {
    restoreNow();
  });

  it('returns current time from now()', () => {
    const t = now();
    expect(typeof t).toBe('number');
    expect(t).toBeGreaterThan(0);
  });

  it('allows setting a fixed time with setNow()', () => {
    setNow(1000);
    expect(now()).toBe(1000);
    setNow(2000);
    expect(now()).toBe(2000);
  });

  it('restores normal time with restoreNow()', () => {
    setNow(1000);
    expect(now()).toBe(1000);
    restoreNow();
    const t = now();
    expect(t).not.toBe(1000);
    expect(t).toBeGreaterThan(0);
  });
});

describe('Animation frame', () => {
  it('schedules a callback with requestAnimationFrame', async () => {
    let called = false;
    let timestamp = 0;

    requestAnimationFrame((t) => {
      called = true;
      timestamp = t;
    });

    // Wait for the callback to be called
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    expect(called).toBe(true);
    expect(timestamp).toBeGreaterThan(0);
  });

  it('cancels a pending animation frame', async () => {
    let called = false;

    const id = requestAnimationFrame(() => {
      called = true;
    });

    cancelAnimationFrame(id);

    // Wait to ensure callback doesn't run
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    expect(called).toBe(false);
  });

  it('frame() returns cancelable object', async () => {
    let called = false;

    const handle = frame(() => {
      called = true;
    });

    handle.cancel();

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    expect(called).toBe(false);
  });
});

describe('RenderTarget', () => {
  let target: RenderTarget;

  beforeEach(() => {
    target = createRenderTarget(100, 50);
  });

  it('creates a render target with correct dimensions', () => {
    expect(target.width).toBe(100);
    expect(target.height).toBe(50);
    expect(target.pixels.length).toBe(100 * 50 * 4);
  });

  it('initializes pixels to zero', () => {
    expect(target.pixels[0]).toBe(0);
    expect(target.pixels[1]).toBe(0);
    expect(target.pixels[2]).toBe(0);
    expect(target.pixels[3]).toBe(0);
  });

  it('clears to a solid color', () => {
    clearRenderTarget(target, 255, 128, 64, 200);

    // Check first pixel
    expect(target.pixels[0]).toBe(255);
    expect(target.pixels[1]).toBe(128);
    expect(target.pixels[2]).toBe(64);
    expect(target.pixels[3]).toBe(200);

    // Check last pixel
    const lastIdx = (100 * 50 - 1) * 4;
    expect(target.pixels[lastIdx]).toBe(255);
    expect(target.pixels[lastIdx + 1]).toBe(128);
    expect(target.pixels[lastIdx + 2]).toBe(64);
    expect(target.pixels[lastIdx + 3]).toBe(200);
  });

  it('sets a single pixel', () => {
    setPixel(target, 10, 20, 100, 150, 200, 255);

    const idx = (20 * 100 + 10) * 4;
    expect(target.pixels[idx]).toBe(100);
    expect(target.pixels[idx + 1]).toBe(150);
    expect(target.pixels[idx + 2]).toBe(200);
    expect(target.pixels[idx + 3]).toBe(255);
  });

  it('ignores out-of-bounds pixels in setPixel', () => {
    // Should not throw
    setPixel(target, -1, 0, 255, 0, 0, 255);
    setPixel(target, 0, -1, 255, 0, 0, 255);
    setPixel(target, 100, 0, 255, 0, 0, 255);
    setPixel(target, 0, 50, 255, 0, 0, 255);
  });

  it('blends a pixel with alpha', () => {
    // Set initial color
    setPixel(target, 5, 5, 0, 0, 0, 255);

    // Blend 50% white
    blendPixel(target, 5, 5, 255, 255, 255, 128);

    const idx = (5 * 100 + 5) * 4;
    // Expect roughly 50% blend
    expect(target.pixels[idx]).toBeGreaterThan(100);
    expect(target.pixels[idx]).toBeLessThan(150);
  });

  it('ignores out-of-bounds pixels in blendPixel', () => {
    // Should not throw
    blendPixel(target, -1, 0, 255, 0, 0, 128);
    blendPixel(target, 0, -1, 255, 0, 0, 128);
    blendPixel(target, 100, 0, 255, 0, 0, 128);
    blendPixel(target, 0, 50, 255, 0, 0, 128);
  });
});

describe('URL resolution', () => {
  it('resolves relative URLs', () => {
    const result = resolveURL('/path/to/file', 'https://example.com/base/');
    expect(result).toBe('https://example.com/path/to/file');
  });

  it('handles already absolute URLs', () => {
    const result = resolveURL('https://other.com/file', 'https://example.com/');
    expect(result).toBe('https://other.com/file');
  });

  it('uses localhost as default base', () => {
    const result = resolveURL('/test');
    expect(result).toBe('https://localhost/test');
  });

  it('returns original path if URL parsing fails', () => {
    // Invalid base URL
    const result = resolveURL('test', 'not-a-url');
    expect(result).toBe('test');
  });
});

describe('Environment detection', () => {
  it('detects Node.js environment', () => {
    // In test environment (Node.js), this should be true
    expect(isNodeJS).toBe(true);
  });

  it('detects non-browser environment', () => {
    // In test environment (Node.js), this should be false
    expect(isBrowser).toBe(false);
  });

  it('returns 1 for device pixel ratio in Node.js', () => {
    expect(getDevicePixelRatio()).toBe(1);
  });
});
