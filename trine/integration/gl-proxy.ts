/**
 * TsyneGLProxy - Barrel file
 *
 * Re-exports the TsyneGLProxy class with all methods attached.
 * The class is defined in gl-proxy-core.ts; methods are added via
 * prototype augmentation in the other gl-proxy-*.ts files.
 *
 * File structure:
 *   gl-constants.ts        — WebGL2 constant definitions (~350 lines)
 *   gl-proxy-core.ts       — Class, constructor, buffer/shader/program ops (~530 lines)
 *   gl-proxy-uniforms.ts   — Uniform + UBO methods (~250 lines)
 *   gl-proxy-textures.ts   — Texture, FBO, RBO methods (~430 lines)
 *   gl-proxy-state.ts      — Vertex array, drawing, state, sync, misc (~570 lines)
 *   gl-proxy.ts            — This barrel file
 */

// Core class + encodeBufferData helper
import { TsyneGLProxy, encodeBufferData } from './gl-proxy-core';

// Side-effect imports: augment TsyneGLProxy.prototype with method groups
import './gl-proxy-uniforms';
import './gl-proxy-textures';
import './gl-proxy-state';

// Re-export everything consumers need
export { TsyneGLProxy, encodeBufferData };
export { GL_CONSTANTS, applyGLConstants } from './gl-constants';
