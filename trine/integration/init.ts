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

import type { App, ITsyneWindow } from 'tsyne';
import { TsyneBridge } from './bridge';
import { initTsyne, setGlobalBridge } from './three-integration';
import { TsyneCanvas } from './canvas';

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
    id?: string;
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
    id: options.id,
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

  // console.log('[Tsyne] Three.js setup complete - ready to use THREE module');

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

/**
 * High-level helper that replaces the boilerplate in every example.
 *
 * Before:
 *   const bridge = (a as any).getBridge();
 *   const windowId = (win as any).id;
 *   const sendFn = async (msg: any) => bridge.send(msg.type, msg.payload || {});
 *   const { THREE } = await setupTsyneThreeJS(sendFn, { width, height, windowId });
 *
 * After:
 *   const { THREE } = await initThreeJS(a, win, { width, height });
 */
export async function initThreeJS(
  a: App,
  win: ITsyneWindow,
  options: { width?: number; height?: number; interactive?: boolean } = {}
): Promise<{
  bridge: TsyneBridge;
  THREE: any;
  canvasId: string;
}> {
  const coreBridge = (a as any).getBridge();
  const sendFn = async (msg: any) => coreBridge.send(msg.type, msg.payload || {});
  return setupTsyneThreeJS(sendFn, {
    width: options.width ?? 800,
    height: options.height ?? 600,
    windowId: win.id,
    interactive: options.interactive ?? false,
    coreBridge: options.interactive ? coreBridge : undefined,
  });
}

/**
 * Initialize Three.js as a Tsyne widget.
 * This allows embedding a Three.js scene inside a layout container (vbox, grid, etc.)
 * alongside other Tsyne widgets.
 */
export async function initThreeJSWidget(
  a: App,
  options: { width?: number; height?: number; interactive?: boolean } = {}
): Promise<{
  bridge: TsyneBridge;
  THREE: any;
  canvasId: string;
  widget: any; // GLCanvas
  canvas: any; // TsyneCanvas
}> {
  const width = options.width ?? 400;
  const height = options.height ?? 300;

  // 1. Create the GLCanvas widget - this adds it to the current container
  const widget = a.glCanvas(width, height, { interactive: options.interactive });

  // 2. Initialize Three.js integration using the widget's ID
  const coreBridge = (a as any).getBridge();
  const sendFn = async (msg: any) => coreBridge.send(msg.type, msg.payload || {});

  const { bridge, THREE, canvasId } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    id: widget.id,
    interactive: options.interactive ?? false,
    coreBridge: options.interactive ? coreBridge : undefined,
  });

  // 3. Explicitly create a TsyneCanvas bound to this widget ID
  // This avoids the race condition of global document.createElement factory
  const canvas = new TsyneCanvas(bridge, { interactive: options.interactive });
  canvas.width = width;
  canvas.height = height;
  canvas.setPredefinedId(widget.id);

  return {
    bridge,
    THREE,
    canvasId,
    widget,
    canvas,
  };
}

export { enableThreeJSResize } from './resize';
export type { EnableThreeJSResizeOptions } from './resize';

export default {
  setupTsyneThreeJS,
  setupTsyneThreeJSFull,
  initThreeJS,
};
