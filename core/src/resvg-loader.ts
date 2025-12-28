/**
 * Cross-platform resvg loader
 *
 * Uses native @resvg/resvg-js on x86_64 (prebuilt binaries available)
 * Falls back to @resvg/resvg-wasm on aarch64 (no prebuilt native binaries)
 */

import { arch } from 'os';

// Both packages export the same Resvg class with identical API
export let Resvg: any;
let wasmInitialized = false;

const architecture = arch();

if (architecture === 'x64') {
  // x86_64: use native bindings (faster, prebuilt available)
  try {
    const native = require('@resvg/resvg-js');
    Resvg = native.Resvg;
  } catch {
    // Fallback to wasm if native fails
    const wasm = require('@resvg/resvg-wasm');
    Resvg = wasm.Resvg;
  }
} else {
  // aarch64/arm64: use wasm (no prebuilt native binaries)
  const wasm = require('@resvg/resvg-wasm');
  Resvg = wasm.Resvg;
}

/**
 * Initialize wasm if needed (must be called before using Resvg on wasm platforms)
 */
export async function initResvg(): Promise<void> {
  if (architecture === 'x64') {
    // Native doesn't need initialization
    return;
  }

  if (wasmInitialized) {
    return;
  }

  const { initWasm } = require('@resvg/resvg-wasm');
  const fs = require('fs');
  const path = require('path');

  // Find the wasm file in node_modules
  const wasmPath = path.join(
    __dirname,
    '../../node_modules/@resvg/resvg-wasm/index_bg.wasm'
  );

  const wasmBuffer = fs.readFileSync(wasmPath);
  await initWasm(wasmBuffer);
  wasmInitialized = true;
}
