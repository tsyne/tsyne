/**
 * Renderer3D - Software renderer for Cosyne 3D scenes
 *
 * Renders 3D primitives to Tsyne's 2D canvas using projection
 * and the existing canvas primitives (canvasSphere, canvasPolygon, etc.)
 *
 * This module re-exports from split files:
 * - renderer3d-types.ts: Type definitions
 * - renderer3d-buffer.ts: Buffer rendering (software rasterization)
 * - renderer3d-canvas.ts: Canvas rendering (Tsyne canvas primitives)
 */

import { Cosyne3dContext } from './context3d';
import { RenderTarget } from '../../core/dist/src/graphics/platform';
import { renderToCanvas } from './renderer3d-canvas';
import { renderToBuffer as bufferRenderToBuffer } from './renderer3d-buffer';

// Re-export types
export type { RenderItem, BufferRenderItem, ScreenPoint } from './renderer3d-types';

/**
 * Renderer3D class - renders Cosyne3D scenes to Tsyne canvas primitives
 */
export class Renderer3D {
  /**
   * Render a Cosyne3D context to the app using canvas primitives
   */
  render(ctx: Cosyne3dContext, app: any): void {
    renderToCanvas(ctx, app);
  }

  /**
   * Render a Cosyne3D context to a pixel buffer (software rendering)
   * Use this for high-frequency animation to avoid widget creation overhead.
   *
   * @param ctx - The Cosyne3D context to render
   * @param target - Optional existing RenderTarget to reuse (for performance)
   * @returns The pixel buffer as a Uint8Array (RGBA format)
   */
  renderToBuffer(ctx: Cosyne3dContext, target?: RenderTarget): Uint8Array {
    return bufferRenderToBuffer(ctx, target);
  }
}

/**
 * Default renderer instance
 */
export const renderer3d = new Renderer3D();
