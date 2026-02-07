/**
 * Three.js + Tsyne Integration
 *
 * This module patches three.js to use Tsyne's fake canvas and WebGL2 proxy
 * instead of browser APIs. It should be imported BEFORE three.js.
 *
 * Usage:
 *   import { initTsyne } from './tsyne/three-integration';
 *   import * as THREE from './Three.js';
 *
 *   const bridge = initTsyne(messageSendFn);
 *   // Now three.js will render through Tsyne
 */

import { TsyneBridge } from './bridge';
import { TsyneCanvas } from './canvas';
import { initTsyneGlobals, injectGlobals, tsyneDocument, tsyneWindow } from './globals';

/**
 * Initialize Tsyne for three.js and patch three.js utilities
 *
 * @param sendFn - Function to send messages to the Go bridge
 * @param options - Configuration options
 * @returns The initialized TsyneBridge instance
 */
export function initTsyne(
  sendFn: (msg: any) => Promise<any>,
  options: {
    width?: number;
    height?: number;
    windowId?: string;
    autoInject?: boolean;
    interactive?: boolean;
  } = {}
): TsyneBridge {
  const { width = 800, height = 600, windowId = '', autoInject = true, interactive = false } = options;

  // Create and initialize the bridge
  const bridge = new TsyneBridge(sendFn);
  initTsyneGlobals(bridge);

  // Inject globals so three.js can find them
  if (autoInject) {
    injectGlobals();
  }

  // Patch three.js utilities to use Tsyne canvas
  patchThreeJSUtils(width, height, windowId, bridge, interactive);

  console.log('[Tsyne] Initialized three.js integration');
  console.log(`[Tsyne] Canvas size: ${width}x${height}, window: ${windowId || 'auto'}${interactive ? ' (interactive)' : ''}`);

  return bridge;
}

/**
 * Patch three.js utility functions to use Tsyne canvas
 * This must be called before three.js is imported
 */
function patchThreeJSUtils(width: number, height: number, windowId: string, bridge: TsyneBridge, interactive: boolean = false): void {
  // Store reference to create patched canvas elements
  (globalThis as any).__tsyneCanvasWidth = width;
  (globalThis as any).__tsyneCanvasHeight = height;
  (globalThis as any).__tsyneWindowId = windowId;
  (globalThis as any).__tsyneInteractive = interactive;

  // Create canvas factory for three.js utils.js to use
  (globalThis as any).__tsyneCanvasFactory = () => {
    const canvas = new TsyneCanvas(bridge, { interactive });
    canvas.width = width;
    canvas.height = height;
    canvas.setWindowId(windowId);
    return canvas;
  };

  // Also patch document methods for completeness
  const originalCreateElement = tsyneDocument.createElement;
  const originalCreateElementNS = tsyneDocument.createElementNS;

  tsyneDocument.createElement = function (tag: string): any {
    if (tag.toLowerCase() === 'canvas') {
      const canvas = new TsyneCanvas(bridge, { interactive });
      canvas.width = width;
      canvas.height = height;
      canvas.setWindowId(windowId);
      return canvas;
    }
    return originalCreateElement.call(this, tag);
  };

  tsyneDocument.createElementNS = function (ns: string, tag: string): any {
    if (tag.toLowerCase() === 'canvas') {
      const canvas = new TsyneCanvas(bridge, { interactive });
      canvas.width = width;
      canvas.height = height;
      canvas.setWindowId(windowId);
      return canvas;
    }
    return originalCreateElementNS.call(this, ns, tag);
  };

  console.log('[Tsyne] Patched three.js canvas creation');
}

/**
 * Store the bridge globally so patches can access it
 */
export function setGlobalBridge(bridge: TsyneBridge): void {
  (globalThis as any).__tsyneBridge = bridge;
}

/**
 * Get the stored global bridge
 */
export function getGlobalBridge(): TsyneBridge | undefined {
  return (globalThis as any).__tsyneBridge;
}

/**
 * Helper to create a full three.js + Tsyne setup
 *
 * Usage:
 *   const setup = await setupThreeJSWithTsyne(
 *     (msg) => ipc.send('gl-command', msg),
 *     { width: 1920, height: 1080 }
 *   );
 *
 *   const scene = new setup.THREE.Scene();
 *   // ... render loop
 *   await setup.bridge.flush(); // or renderer.finalize()
 */
export async function setupThreeJSWithTsyne(
  sendFn: (msg: any) => void,
  options?: { width?: number; height?: number }
): Promise<{
  bridge: TsyneBridge;
  THREE: any;
  createScene: () => any;
  createRenderer: (canvas?: any) => any;
}> {
  // Initialize Tsyne first
  const bridge = initTsyne(sendFn, options);
  setGlobalBridge(bridge);

  // Import three.js AFTER Tsyne is initialized
  // Note: This assumes three.js is available as a module export
  // In actual usage, import THREE directly
  const THREE = await import('../../three/src/Three.js');

  return {
    bridge,
    THREE,
    createScene: () => new THREE.Scene(),
    createRenderer: (canvas?: any) => {
      if (!canvas) {
        canvas = tsyneDocument.createElement('canvas');
      }
      return new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    },
  };
}

/**
 * Minimal example of using Tsyne with three.js
 *
 * This would be in your application code:
 *
 * ```typescript
 * import { initTsyne, setGlobalBridge } from './tsyne/three-integration';
 * import * as THREE from './Three.js';
 *
 * // Set up message handling
 * const bridge = initTsyne((msg) => {
 *   // Send message to Go bridge (via IPC, socket, etc.)
 *   window.ipc?.send('gl-command', msg);
 * });
 * setGlobalBridge(bridge);
 *
 * // Now use three.js normally
 * const scene = new THREE.Scene();
 * const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
 * const renderer = new THREE.WebGLRenderer();
 *
 * // Create geometry
 * const geometry = new THREE.BoxGeometry();
 * const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
 * const mesh = new THREE.Mesh(geometry, material);
 * scene.add(mesh);
 *
 * // Render
 * renderer.render(scene, camera);
 *
 * // Flush GL commands to bridge
 * await bridge.flush();
 * ```
 */

export default {
  initTsyne,
  setGlobalBridge,
  getGlobalBridge,
  setupThreeJSWithTsyne,
};
