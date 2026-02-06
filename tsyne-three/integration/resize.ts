/**
 * Aspect-ratio-preserving resize for Three.js GL canvases
 *
 * Computes the largest rectangle that fits within the window while maintaining
 * the original aspect ratio, then resizes the renderer, camera, and bridge canvas.
 * The Go-side center layout handles gutter positioning automatically.
 */

import type { ITsyneWindow } from 'tsyne';
import type { TsyneCanvas } from './canvas';

export interface EnableThreeJSResizeOptions {
  /** Preferred / initial canvas width */
  preferredWidth: number;
  /** Preferred / initial canvas height */
  preferredHeight: number;
  /** The Three.js WebGLRenderer instance */
  renderer: any;
  /** The Three.js camera (PerspectiveCamera or OrthographicCamera) */
  camera: any;
  /** Optional callback invoked after each resize with the new dimensions */
  onResize?: (width: number, height: number) => void;
  /** Throttle interval in ms (default 100) */
  throttleMs?: number;
}

/**
 * Enable aspect-ratio-preserving resize for a Three.js scene.
 *
 * Call this after creating your renderer.  It hooks into `win.onResize` and
 * automatically updates the renderer size, camera projection, and Fyne shader
 * widget whenever the window dimensions change.
 *
 * Must be awaited — it ensures the GL canvas exists as window content before
 * registering the resize handler (otherwise setWindowOnResize wraps the old
 * content which gets replaced by createGLCanvas).
 *
 * @returns A cleanup function that can be called to stop listening
 */
export async function enableThreeJSResize(
  win: ITsyneWindow,
  options: EnableThreeJSResizeOptions,
): Promise<() => void> {
  const {
    preferredWidth,
    preferredHeight,
    renderer,
    camera,
    onResize: userCallback,
    throttleMs = 100,
  } = options;

  const aspectRatio = preferredWidth / preferredHeight;
  let stopped = false;
  let pending = false;
  let lastRun = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestWidth = 0;
  let latestHeight = 0;

  // Ensure the bridge canvas exists as window content BEFORE registering
  // onResize. The Go-side setWindowOnResize wraps the current content's
  // layout — if the GL canvas hasn't replaced the old content yet, the
  // resize wrapper gets lost when createGLCanvas calls SetContent later.
  const canvas = renderer.domElement as TsyneCanvas;
  if (canvas && typeof canvas.getBridgeCanvasId === 'function') {
    await canvas.getBridgeCanvasId();
  }

  async function doResize(winWidth: number, winHeight: number) {
    // Compute the largest rectangle with the original aspect ratio
    let newWidth: number;
    let newHeight: number;

    if (winWidth / winHeight > aspectRatio) {
      // Window is wider than content — pillarbox
      newHeight = Math.floor(winHeight);
      newWidth = Math.floor(newHeight * aspectRatio);
    } else {
      // Window is taller than content — letterbox
      newWidth = Math.floor(winWidth);
      newHeight = Math.floor(newWidth / aspectRatio);
    }

    // Clamp to a minimum of 64px on each axis
    newWidth = Math.max(64, newWidth);
    newHeight = Math.max(64, newHeight);

    // Update the Three.js renderer
    renderer.setSize(newWidth, newHeight);

    // Update camera projection
    if (camera.isPerspectiveCamera) {
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    } else if (camera.isOrthographicCamera) {
      const halfW = newWidth / 2;
      const halfH = newHeight / 2;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    }

    // Resize the bridge-side Fyne shader widget
    if (canvas && typeof canvas.resizeBridge === 'function') {
      await canvas.resizeBridge(newWidth, newHeight);
    }

    // Notify the caller
    userCallback?.(newWidth, newHeight);
  }

  win.onResize((winWidth: number, winHeight: number) => {
    if (stopped) return;
    if (
      !Number.isFinite(winWidth) || !Number.isFinite(winHeight) ||
      winWidth <= 0 || winHeight <= 0
    ) {
      return;
    }

    latestWidth = winWidth;
    latestHeight = winHeight;

    const now = Date.now();
    const elapsed = now - lastRun;

    if (elapsed >= throttleMs && !pending) {
      // Enough time has passed — fire immediately
      pending = true;
      lastRun = now;
      doResize(winWidth, winHeight).finally(() => { pending = false; });
    } else if (!trailingTimer) {
      // Schedule a trailing call so we always process the final size
      const delay = Math.max(0, throttleMs - elapsed);
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        if (stopped || pending) return;
        pending = true;
        lastRun = Date.now();
        doResize(latestWidth, latestHeight).finally(() => { pending = false; });
      }, delay);
    }
  });

  return () => {
    stopped = true;
    if (trailingTimer) clearTimeout(trailingTimer);
  };
}
