/**
 * Type definitions for Renderer3D
 */

import { RenderTarget } from '../../core/src/graphics/platform';

/**
 * A renderable item with depth information for canvas rendering
 */
export interface RenderItem {
  depth: number;
  render: (app: any) => void;
}

/**
 * A renderable item for buffer rendering
 */
export interface BufferRenderItem {
  depth: number;
  renderToBuffer: (target: RenderTarget) => void;
}

/**
 * Screen-space projection of a point
 */
export interface ScreenPoint {
  x: number;
  y: number;
  z: number; // NDC depth for visibility check
  visible: boolean;
}
