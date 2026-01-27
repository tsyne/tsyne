/**
 * Cross-platform SVG rasterizer
 *
 * Uses native @resvg/resvg-js on x86_64 (prebuilt binaries available)
 * Falls back to @resvg/resvg-wasm on aarch64 (no prebuilt native binaries)
 *
 * Lazy initialization - just call getSvgRasterizer() and it handles everything.
 */

import { arch } from 'os';

const architecture = arch();
let _Rasterizer: any = null;
let _initPromise: Promise<any> | null = null;

/**
 * Get the SVG rasterizer class, initializing if needed.
 * Returns a class with the Resvg API (constructor takes SVG string/buffer, .render().asPng()).
 * Handles native vs wasm transparently.
 */
export async function getSvgRasterizer(): Promise<any> {
  if (_Rasterizer) {
    return _Rasterizer;
  }

  // Avoid multiple concurrent initializations
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    if (architecture === 'x64') {
      // x86_64: use native bindings (faster, prebuilt available)
      try {
        _Rasterizer = require('@resvg/resvg-js').Resvg;
      } catch {
        // Fallback to wasm if native fails
        await initWasm();
      }
    } else {
      // aarch64/arm64: use wasm (no prebuilt native binaries)
      await initWasm();
    }
    return _Rasterizer;
  })();

  return _initPromise;
}

async function initWasm(): Promise<void> {
  const wasm = require('@resvg/resvg-wasm');
  const fs = require('fs');
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);
  await wasm.initWasm(wasmBuffer);
  _Rasterizer = wasm.Resvg;
}
