/**
 * Tsyne Initialization for Three.js
 *
 * This module provides a simple entry point for initializing three.js with Tsyne.
 * Use this when you want to run three.js through the Tsyne bridge instead of the browser.
 *
 * IMPORTANT: This MUST be imported BEFORE importing three.js
 *
 * Usage:
 *   import { setupTsyneThreeJS } from './tsyne/init';
 *
 *   // Initialize Tsyne (must be before three.js import)
 *   const { bridge, THREE } = await setupTsyneThreeJS(
 *     (msg) => window.ipc?.send('gl-command', msg)
 *   );
 *
 *   // Now use three.js normally
 *   const scene = new THREE.Scene();
 *   const camera = new THREE.PerspectiveCamera(75, 800 / 600);
 *   const renderer = new THREE.WebGLRenderer();
 *   // ... render loop
 */

import { TsyneBridge } from './bridge';
import { initTsyne, setGlobalBridge } from './three-integration';

/**
 * Set up three.js to work with Tsyne
 *
 * @param sendFn - Function to send messages to the Go bridge
 * @param options - Configuration options
 * @returns Object with bridge and THREE module
 */
export async function setupTsyneThreeJS(
  sendFn: (msg: any) => Promise<any>,
  options: {
    width?: number;
    height?: number;
    windowId?: string;
    autoInject?: boolean;
    interactive?: boolean;
    coreBridge?: any; // Pass the core Tsyne bridge to wire up event handling
  } = {}
): Promise<{
  bridge: TsyneBridge;
  THREE: any;
  canvasId: string;
}> {
  // Initialize Tsyne first (must be before three.js is imported)
  const bridge = initTsyne(sendFn, {
    width: options.width ?? 800,
    height: options.height ?? 600,
    windowId: options.windowId ?? '',
    autoInject: options.autoInject ?? true,
    interactive: options.interactive ?? false,
  });
  setGlobalBridge(bridge);

  // Now we can import three.js
  // The patched createCanvasElement() will detect our __tsyneCanvasFactory
  const THREE = await import('../../three/src/Three.js');

  // Get the canvas ID that was created
  const canvasId = (bridge as any).canvasId || 'gl_canvas_1';

  // Wire up event handling if core bridge is provided
  if (options.coreBridge && options.interactive) {
    // Register handler for glMouseEvent on the core bridge
    options.coreBridge.on('glMouseEvent', (data: any) => {
      bridge.handleEvent({
        type: 'glMouseEvent',
        widgetId: data.widgetId,
        data: data,
      });
    });
  } else if (options.interactive) {
    console.warn('[Tsyne] Interactive mode enabled but no coreBridge provided - mouse events will not work');
  }

  console.log('[Tsyne] Three.js setup complete - ready to use THREE module');

  return {
    bridge,
    THREE,
    canvasId,
  };
}

/**
 * Alternative: initialize Tsyne and return all setup utilities
 *
 * @param sendFn - Function to send messages to the Go bridge
 * @param options - Configuration options
 * @returns Complete setup with utilities
 */
export async function setupTsyneThreeJSFull(
  sendFn: (msg: any) => void,
  options: {
    width?: number;
    height?: number;
    autoInject?: boolean;
  } = {}
): Promise<{
  bridge: TsyneBridge;
  THREE: any;
  createScene: () => any;
  createCamera: (width: number, height: number) => any;
  createRenderer: (canvas?: any) => any;
}> {
  const { bridge, THREE } = await setupTsyneThreeJS(sendFn, options);

  return {
    bridge,
    THREE,
    createScene: () => new THREE.Scene(),
    createCamera: (w: number, h: number) =>
      new THREE.PerspectiveCamera(75, w / h, 0.1, 1000),
    createRenderer: (canvas?: any) => {
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      return new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    },
  };
}

export default {
  setupTsyneThreeJS,
  setupTsyneThreeJSFull,
};
