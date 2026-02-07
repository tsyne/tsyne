/**
 * Tsyne Three.js Integration
 *
 * This is the entry point for using three.js with Tsyne's native OpenGL backend.
 * It provides browser shims, a fake canvas, and a WebGL2 proxy.
 */

export { TsyneBridge, GLCommand, BridgeMessage, BridgeResponse } from './bridge';
export { TsyneCanvas } from './canvas';
export { TsyneGLProxy } from './gl-proxy';
export { tsyneWindow, tsyneDocument, initTsyneGlobals, injectGlobals } from './globals';
export {
  initTsyne as initTsyneIntegration,
  setGlobalBridge,
  getGlobalBridge,
  setupThreeJSWithTsyne,
} from './three-integration';
export { setupTsyneThreeJS, setupTsyneThreeJSFull } from './init';

import { TsyneBridge, setDefaultBridge } from './bridge';
import { initTsyneGlobals, injectGlobals } from './globals';

/**
 * Initialize Tsyne for three.js rendering
 *
 * This should be called once at application startup, before importing three.js.
 * It sets up the browser shims and bridge communication.
 *
 * @param sendFn - Function to send messages to the Tsyne Go bridge
 * @returns The initialized TsyneBridge instance
 */
export function initTsyne(sendFn: (msg: any) => void): TsyneBridge {
  const bridge = new TsyneBridge(sendFn);

  // Initialize globals with the bridge
  initTsyneGlobals(bridge);

  // Inject globals into globalThis for three.js to find them
  injectGlobals();

  // Set as default bridge for convenience
  setDefaultBridge(bridge);

  return bridge;
}

/**
 * Example usage:
 *
 * import { initTsyne } from './three/src/tsyne';
 * import * as THREE from './three/build/three.module.js';
 *
 * // Initialize Tsyne
 * const bridge = initTsyne((msg) => {
 *   // Send message to Go bridge via your IPC mechanism
 *   process.send(msg);
 * });
 *
 * // Now use three.js normally
 * const scene = new THREE.Scene();
 * const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
 * const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
 * // ... rest of three.js code ...
 */
