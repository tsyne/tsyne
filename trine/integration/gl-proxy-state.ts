/**
 * gl-proxy-state.ts - Prototype augmentation for TsyneGLProxy
 *
 * Adds vertex array, drawing, state, depth/stencil, blending, face/polygon,
 * pixel, query, sync, and misc methods to the TsyneGLProxy prototype.
 *
 * This file is part of the gl-proxy split. It does NOT define a new class;
 * instead it patches TsyneGLProxy.prototype so all instances gain these methods.
 * Private field access (this.vertexArrays, this.queries, this.syncs, etc.)
 * works at runtime via the `any` cast. Constants like this.NO_ERROR,
 * this.ALREADY_SIGNALED, etc. are applied to the prototype by gl-constants.ts.
 */

import { TsyneGLProxy, encodeBufferData } from './gl-proxy-core';

const proto = TsyneGLProxy.prototype as any;

// ═══════════════════════════════════════════════════════════════
// VERTEX ARRAY / ATTRIBUTE OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.createVertexArray = function (): WebGLVertexArrayObject | null {
  const id = this.nextObjectId++;
  this.vertexArrays.set(id, { id });
  this.pushCommand('createVertexArray', { vaId: id });
  return { __tsyneId: id } as any;
};

proto.deleteVertexArray = function (vertexArray: WebGLVertexArrayObject | null): void {
  if (!vertexArray) return;
  const id = (vertexArray as any).__tsyneId;
  this.vertexArrays.delete(id);
  this.pushCommand('deleteVertexArray', { vaId: id });
};

proto.bindVertexArray = function (array: WebGLVertexArrayObject | null): void {
  const vaId = array ? (array as any).__tsyneId : 0;
  this.pushCommand('bindVertexArray', { vaId });
};

proto.enableVertexAttribArray = function (index: GLuint): void {
  this.pushCommand('enableVertexAttribArray', { index });
};

proto.disableVertexAttribArray = function (index: GLuint): void {
  this.pushCommand('disableVertexAttribArray', { index });
};

proto.vertexAttribPointer = function (
  index: GLuint,
  size: GLint,
  type: GLenum,
  normalized: GLboolean,
  stride: GLsizei,
  offset: GLintptr
): void {
  // Track this location as used (prevents getAttribLocation from reusing it,
  // important for mat4 attributes that occupy 4 consecutive locations)
  this.usedAttribLocations.add(index);
  this.pushCommand('vertexAttribPointer', {
    location: index,  // Go expects 'location', not 'index'
    size,
    type,
    normalized,
    stride,
    offset,
  });
};

proto.vertexAttribIPointer = function (
  index: GLuint,
  size: GLint,
  type: GLenum,
  stride: GLsizei,
  offset: GLintptr
): void {
  this.pushCommand('vertexAttribIPointer', {
    location: index,
    size,
    type,
    stride,
    offset,
  });
};

proto.vertexAttribDivisor = function (index: GLuint, divisor: GLuint): void {
  this.pushCommand('vertexAttribDivisor', { index, divisor });
};

// Constant attribute value methods (used when attribute is disabled)
proto.vertexAttrib1f = function (index: GLuint, x: GLfloat): void {
  this.pushCommand('vertexAttrib1f', { index, x });
};

proto.vertexAttrib2f = function (index: GLuint, x: GLfloat, y: GLfloat): void {
  this.pushCommand('vertexAttrib2f', { index, x, y });
};

proto.vertexAttrib3f = function (index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat): void {
  this.pushCommand('vertexAttrib3f', { index, x, y, z });
};

proto.vertexAttrib4f = function (index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
  this.pushCommand('vertexAttrib4f', { index, x, y, z, w });
};

proto.vertexAttrib1fv = function (index: GLuint, values: Float32List): void {
  const arr = values instanceof Float32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttrib1fv', { index, values: arr });
};

proto.vertexAttrib2fv = function (index: GLuint, values: Float32List): void {
  const arr = values instanceof Float32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttrib2fv', { index, values: arr });
};

proto.vertexAttrib3fv = function (index: GLuint, values: Float32List): void {
  const arr = values instanceof Float32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttrib3fv', { index, values: arr });
};

proto.vertexAttrib4fv = function (index: GLuint, values: Float32List): void {
  const arr = values instanceof Float32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttrib4fv', { index, values: arr });
};

// Integer attribute methods (WebGL2)
proto.vertexAttribI4i = function (index: GLuint, x: GLint, y: GLint, z: GLint, w: GLint): void {
  this.pushCommand('vertexAttribI4i', { index, x, y, z, w });
};

proto.vertexAttribI4iv = function (index: GLuint, values: Int32List): void {
  const arr = values instanceof Int32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttribI4iv', { index, values: arr });
};

proto.vertexAttribI4ui = function (index: GLuint, x: GLuint, y: GLuint, z: GLuint, w: GLuint): void {
  this.pushCommand('vertexAttribI4ui', { index, x, y, z, w });
};

proto.vertexAttribI4uiv = function (index: GLuint, values: Uint32List): void {
  const arr = values instanceof Uint32Array ? Array.from(values) : values;
  this.pushCommand('vertexAttribI4uiv', { index, values: arr });
};

// ═══════════════════════════════════════════════════════════════
// DRAWING OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.drawArrays = function (mode: GLenum, first: GLint, count: GLsizei): void {
  this.pushCommand('drawArrays', { mode, first, count });
};

proto.drawElements = function (mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void {
  this.pushCommand('drawElements', { mode, count, type, offset });
};

proto.drawArraysInstanced = function (mode: GLenum, first: GLint, count: GLsizei, instancecount: GLsizei): void {
  this.pushCommand('drawArraysInstanced', { mode, first, count, instancecount });
};

proto.drawElementsInstanced = function (
  mode: GLenum,
  count: GLsizei,
  type: GLenum,
  offset: GLintptr,
  instancecount: GLsizei
): void {
  this.pushCommand('drawElementsInstanced', { mode, count, type, offset, instancecount });
};

// ═══════════════════════════════════════════════════════════════
// STATE OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.clear = function (mask: GLbitfield): void {
  this.pushCommand('clear', { mask });
};

proto.clearColor = function (red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
  this.pushCommand('clearColor', { red, green, blue, alpha });
};

proto.clearDepth = function (depth: GLclampf): void {
  this.pushCommand('clearDepth', { depth });
};

proto.clearStencil = function (s: GLint): void {
  this.pushCommand('clearStencil', { s });
};

// WebGL2 clear buffer methods (for MRT / integer framebuffers)
proto.clearBufferfv = function (buffer: GLenum, drawbuffer: GLint, values: Float32List, srcOffset?: GLuint): void {
  const encoded = encodeBufferData(values);
  this.pushCommand('clearBufferfv', { buffer, drawbuffer, values: encoded });
};

proto.clearBufferiv = function (buffer: GLenum, drawbuffer: GLint, values: Int32List, srcOffset?: GLuint): void {
  const encoded = encodeBufferData(values);
  this.pushCommand('clearBufferiv', { buffer, drawbuffer, values: encoded });
};

proto.clearBufferuiv = function (buffer: GLenum, drawbuffer: GLint, values: Uint32List, srcOffset?: GLuint): void {
  const encoded = encodeBufferData(values);
  this.pushCommand('clearBufferuiv', { buffer, drawbuffer, values: encoded });
};

proto.clearBufferfi = function (buffer: GLenum, drawbuffer: GLint, depth: GLfloat, stencil: GLint): void {
  this.pushCommand('clearBufferfi', { buffer, drawbuffer, depth, stencil });
};

proto.viewport = function (x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
  this.pushCommand('viewport', { x, y, width, height });
};

proto.scissor = function (x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
  this.pushCommand('scissor', { x, y, width, height });
};

proto.enable = function (cap: GLenum): void {
  if (this.enabledCaps.has(cap)) {
    this._commandsSkipped++;
    return; // Already enabled — skip
  }
  this.enabledCaps.add(cap);
  this.pushCommand('enable', { cap });
};

proto.disable = function (cap: GLenum): void {
  if (!this.enabledCaps.has(cap)) {
    this._commandsSkipped++;
    return; // Already disabled — skip
  }
  this.enabledCaps.delete(cap);
  this.pushCommand('disable', { cap });
};

proto.isEnabled = function (cap: GLenum): GLboolean {
  return this.enabledCaps.has(cap);
};

// ═══════════════════════════════════════════════════════════════
// DEPTH & STENCIL OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.depthFunc = function (func: GLenum): void {
  if (this.currentDepthFunc === func) { this._commandsSkipped++; return; }
  this.currentDepthFunc = func;
  this.pushCommand('depthFunc', { func });
};

proto.depthMask = function (flag: GLboolean): void {
  if (this.currentDepthMask === flag) { this._commandsSkipped++; return; }
  this.currentDepthMask = flag;
  this.pushCommand('depthMask', { flag });
};

proto.colorMask = function (red: GLboolean, green: GLboolean, blue: GLboolean, alpha: GLboolean): void {
  const cm = this.currentColorMask;
  if (cm[0] === red && cm[1] === green && cm[2] === blue && cm[3] === alpha) {
    this._commandsSkipped++; return;
  }
  cm[0] = red; cm[1] = green; cm[2] = blue; cm[3] = alpha;
  this.pushCommand('colorMask', { red, green, blue, alpha });
};

proto.depthRange = function (zNear: GLclampf, zFar: GLclampf): void {
  this.pushCommand('depthRange', { zNear, zFar });
};

proto.stencilFunc = function (func: GLenum, ref: GLint, mask: GLuint): void {
  if (this.currentStencilFunc === func && this.currentStencilRef === ref && this.currentStencilMask === mask) {
    this._commandsSkipped++; return;
  }
  this.currentStencilFunc = func;
  this.currentStencilRef = ref;
  this.currentStencilMask = mask;
  this.pushCommand('stencilFunc', { func, ref, mask });
};

proto.stencilOp = function (fail: GLenum, zfail: GLenum, zpass: GLenum): void {
  this.pushCommand('stencilOp', { fail, zfail, zpass });
};

proto.stencilMask = function (mask: GLuint): void {
  this.pushCommand('stencilMask', { mask });
};

// ═══════════════════════════════════════════════════════════════
// BLENDING OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.blendColor = function (red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
  this.pushCommand('blendColor', { red, green, blue, alpha });
};

proto.blendEquation = function (mode: GLenum): void {
  if (this.currentBlendEqRGB === mode && this.currentBlendEqAlpha === mode) {
    this._commandsSkipped++; return;
  }
  this.currentBlendEqRGB = mode;
  this.currentBlendEqAlpha = mode;
  this.pushCommand('blendEquation', { mode });
};

proto.blendEquationSeparate = function (modeRGB: GLenum, modeAlpha: GLenum): void {
  if (this.currentBlendEqRGB === modeRGB && this.currentBlendEqAlpha === modeAlpha) {
    this._commandsSkipped++; return;
  }
  this.currentBlendEqRGB = modeRGB;
  this.currentBlendEqAlpha = modeAlpha;
  this.pushCommand('blendEquationSeparate', { modeRGB, modeAlpha });
};

proto.blendFunc = function (sfactor: GLenum, dfactor: GLenum): void {
  if (this.currentBlendSrc === sfactor && this.currentBlendDst === dfactor &&
      this.currentBlendSrcAlpha === sfactor && this.currentBlendDstAlpha === dfactor) {
    this._commandsSkipped++; return;
  }
  this.currentBlendSrc = sfactor;
  this.currentBlendDst = dfactor;
  this.currentBlendSrcAlpha = sfactor;
  this.currentBlendDstAlpha = dfactor;
  this.pushCommand('blendFunc', { sfactor, dfactor });
};

proto.blendFuncSeparate = function (srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum): void {
  if (this.currentBlendSrc === srcRGB && this.currentBlendDst === dstRGB &&
      this.currentBlendSrcAlpha === srcAlpha && this.currentBlendDstAlpha === dstAlpha) {
    this._commandsSkipped++; return;
  }
  this.currentBlendSrc = srcRGB;
  this.currentBlendDst = dstRGB;
  this.currentBlendSrcAlpha = srcAlpha;
  this.currentBlendDstAlpha = dstAlpha;
  this.pushCommand('blendFuncSeparate', { srcRGB, dstRGB, srcAlpha, dstAlpha });
};

// ═══════════════════════════════════════════════════════════════
// FACE & POLYGON OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.cullFace = function (mode: GLenum): void {
  if (this.currentCullFace === mode) { this._commandsSkipped++; return; }
  this.currentCullFace = mode;
  this.pushCommand('cullFace', { mode });
};

proto.frontFace = function (mode: GLenum): void {
  if (this.currentFrontFace === mode) { this._commandsSkipped++; return; }
  this.currentFrontFace = mode;
  this.pushCommand('frontFace', { mode });
};

proto.polygonOffset = function (factor: GLfloat, units: GLfloat): void {
  this.pushCommand('polygonOffset', { factor, units });
};

proto.lineWidth = function (width: GLfloat): void {
  if (this.currentLineWidth === width) { this._commandsSkipped++; return; }
  this.currentLineWidth = width;
  this.pushCommand('lineWidth', { width });
};

// ═══════════════════════════════════════════════════════════════
// PIXEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.pixelStorei = function (pname: GLenum, param: GLint): void {
  this.pushCommand('pixelStorei', { pname, param });
};

proto.readPixels = function (
  x: GLint,
  y: GLint,
  width: GLsizei,
  height: GLsizei,
  format: GLenum,
  type: GLenum,
  pixels: ArrayBufferView | null
): void {
  // Note: This is async in the real implementation
  if (pixels) {
    const encoded = encodeBufferData(pixels);
    this.pushCommand('readPixels', { x, y, width, height, format, type, pixels: encoded });
  }
};

// ═══════════════════════════════════════════════════════════════
// ERROR & STATE QUERIES
// ═══════════════════════════════════════════════════════════════

proto.getError = function (): GLenum {
  // Return NO_ERROR for now - real implementation would query the bridge
  return this.NO_ERROR;
};

proto.getParameter = function (pname: GLenum): any {
  // Return reasonable defaults for common queries
  switch (pname) {
    // String parameters
    case this.VERSION:
      return 'WebGL 2.0 (Tsyne Bridge)';
    case this.VENDOR:
      return 'Tsyne';
    case this.RENDERER:
      return 'Tsyne OpenGL Bridge';
    case this.SHADING_LANGUAGE_VERSION:
      return 'WebGL GLSL ES 3.00';

    // Array parameters
    case this.VIEWPORT:
      return [0, 0, this.drawingBufferWidth, this.drawingBufferHeight];
    case this.SCISSOR_BOX:
      return [0, 0, this.drawingBufferWidth, this.drawingBufferHeight];

    // Integer parameters
    case this.MAX_TEXTURE_SIZE:
      return 2048;
    case this.MAX_CUBE_MAP_TEXTURE_SIZE:
      return 2048;
    case this.MAX_RENDERBUFFER_SIZE:
      return 2048;
    case this.MAX_VERTEX_ATTRIBS:
      return 16;
    case this.MAX_VERTEX_UNIFORM_VECTORS:
      return 256;
    case this.MAX_FRAGMENT_UNIFORM_VECTORS:
      return 256;
    case this.MAX_VARYING_VECTORS:
      return 8;
    case this.MAX_COMBINED_TEXTURE_IMAGE_UNITS:
      return 16;
    case this.MAX_TEXTURE_IMAGE_UNITS:
      return 16;
    case this.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
      return 16;
    case this.COMPRESSED_TEXTURE_FORMATS:
      return new Uint32Array([]);
    case 0x84FF: // MAX_TEXTURE_MAX_ANISOTROPY_EXT
      return 16;
    case 0x8073: // MAX_3D_TEXTURE_SIZE
      return 256;
    case 0x88FF: // MAX_ELEMENT_INDEX
      return 0xFFFFFFFF;
    case 0x8D6B: // MAX_ELEMENTS_VERTICES
      return 65536;
    case 0x80E9: // MAX_ELEMENTS_INDICES
      return 65536;
    case 0x8824: // MAX_DRAW_BUFFERS
      return 8;
    case 0x8B4C: // MAX_VERTEX_UNIFORM_COMPONENTS
      return 1024;
    case 0x8B49: // MAX_FRAGMENT_UNIFORM_COMPONENTS
      return 1024;
    case 0x8A2B: // MAX_UNIFORM_BLOCK_SIZE
      return 16384;
    case 0x8A2F: // MAX_UNIFORM_BUFFER_BINDINGS
      return 24;
    case 0x8C2B: // MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS
      return 64;
    case 0x8C8A: // MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS
      return 4;
    case 0x8D57: // MAX_SAMPLES
      return 4;
    default:
      return null;
  }
};

proto.getShaderPrecisionFormat = function (
  shaderType: GLenum,
  precisionType: GLenum
): WebGLShaderPrecisionFormat {
  // Return high precision format
  // In a real implementation, would query the bridge
  return {
    rangeMin: 127,
    rangeMax: 127,
    precision: 23,
  };
};

proto.getContextAttributes = function (): WebGLContextAttributes {
  // Return default context attributes
  return {
    alpha: true,
    antialias: true,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'default',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
    desynchronized: false,
    xrCompatible: false,
  };
};

// Constants for getParameter, sync, etc. are applied via applyGLConstants() in gl-proxy-core.ts

// ═══════════════════════════════════════════════════════════════
// EXTENSIONS & MISC
// ═══════════════════════════════════════════════════════════════

proto.getExtension = function (name: string): any {
  switch (name) {
    case 'EXT_color_buffer_half_float':
    case 'EXT_color_buffer_float':
    case 'OES_texture_float_linear':
      return {};  // Empty stub — signals "supported"
    case 'EXT_texture_filter_anisotropic':
    case 'WEBKIT_EXT_texture_filter_anisotropic':
    case 'MOZ_EXT_texture_filter_anisotropic':
      return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16 };
    case 'WEBGL_clip_cull_distance':
    case 'WEBGL_multisampled_render_to_texture':
    case 'WEBGL_render_shared_exponent':
      return {};
    default:
      return null;
  }
};

proto.getSupportedExtensions = function (): string[] {
  return [
    'EXT_color_buffer_half_float',
    'EXT_color_buffer_float',
    'OES_texture_float_linear',
    'EXT_texture_filter_anisotropic',
    'WEBGL_clip_cull_distance',
    'WEBGL_multisampled_render_to_texture',
    'WEBGL_render_shared_exponent',
  ];
};

proto.hint = function (target: GLenum, mode: GLenum): void {
  this.pushCommand('hint', { target, mode });
};

proto.setSize = function (width: number, height: number): void {
  (this as any).drawingBufferWidth = width;
  (this as any).drawingBufferHeight = height;
  // Update canvas dimensions directly (don't call canvas.setSize to avoid recursion)
  this.canvas.width = width;
  this.canvas.height = height;
};

// ═══════════════════════════════════════════════════════════════
// SYNC OBJECTS (WebGL2)
// ═══════════════════════════════════════════════════════════════

proto.fenceSync = function (condition: GLenum, flags: GLbitfield): WebGLSync | null {
  const id = this.nextObjectId++;
  this.syncs.set(id, { id });
  this.pushCommand('fenceSync', { syncId: id, condition, flags });
  return { __tsyneId: id } as any;
};

proto.deleteSync = function (sync: WebGLSync | null): void {
  if (!sync) return;
  const id = (sync as any).__tsyneId;
  this.syncs.delete(id);
  this.pushCommand('deleteSync', { syncId: id });
};

proto.clientWaitSync = function (sync: WebGLSync, flags: GLbitfield, timeout: GLuint64): GLenum {
  // Cannot truly block in JS - return ALREADY_SIGNALED as optimistic stub
  return this.ALREADY_SIGNALED;
};

proto.waitSync = function (sync: WebGLSync, flags: GLbitfield, timeout: GLint64): void {
  // Server-side wait - push command to bridge
  const syncId = (sync as any).__tsyneId;
  this.pushCommand('waitSync', { syncId, flags, timeout });
};

proto.isSync = function (sync: WebGLSync | null): GLboolean {
  if (!sync) return false;
  const id = (sync as any).__tsyneId;
  return this.syncs.has(id);
};

proto.getSyncParameter = function (sync: WebGLSync, pname: GLenum): any {
  // Would need sync call to bridge - return signaled for now
  if (pname === 0x9114) { // SYNC_STATUS
    return 0x9119; // SIGNALED
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════
// MISCELLANEOUS WebGL2 METHODS
// ═══════════════════════════════════════════════════════════════

proto.getFragDataLocation = function (program: WebGLProgram, name: string): GLint {
  // Most programs use gl_FragColor / layout(location=0), return 0 as default
  return 0;
};

// Sampler objects (WebGL2)
proto.createSampler = function (): WebGLSampler | null {
  const id = this.nextObjectId++;
  this.samplers.set(id, { id });
  this.pushCommand('createSampler', { samplerId: id });
  return { __tsyneId: id } as any;
};

proto.deleteSampler = function (sampler: WebGLSampler | null): void {
  if (!sampler) return;
  const id = (sampler as any).__tsyneId;
  this.samplers.delete(id);
  this.pushCommand('deleteSampler', { samplerId: id });
};

proto.bindSampler = function (unit: GLuint, sampler: WebGLSampler | null): void {
  const samplerId = sampler ? (sampler as any).__tsyneId : 0;
  this.pushCommand('bindSampler', { unit, samplerId });
};

proto.samplerParameteri = function (sampler: WebGLSampler, pname: GLenum, param: GLint): void {
  const samplerId = (sampler as any).__tsyneId;
  this.pushCommand('samplerParameteri', { samplerId, pname, param });
};

proto.samplerParameterf = function (sampler: WebGLSampler, pname: GLenum, param: GLfloat): void {
  const samplerId = (sampler as any).__tsyneId;
  this.pushCommand('samplerParameterf', { samplerId, pname, param });
};

// Transform feedback (WebGL2)
proto.createTransformFeedback = function (): WebGLTransformFeedback | null {
  const id = this.nextObjectId++;
  this.transformFeedbacks.set(id, { id });
  this.pushCommand('createTransformFeedback', { tfId: id });
  return { __tsyneId: id } as any;
};

proto.deleteTransformFeedback = function (tf: WebGLTransformFeedback | null): void {
  if (!tf) return;
  const id = (tf as any).__tsyneId;
  this.transformFeedbacks.delete(id);
  this.pushCommand('deleteTransformFeedback', { tfId: id });
};

proto.bindTransformFeedback = function (target: GLenum, tf: WebGLTransformFeedback | null): void {
  const tfId = tf ? (tf as any).__tsyneId : 0;
  this.pushCommand('bindTransformFeedback', { target, tfId });
};

proto.beginTransformFeedback = function (primitiveMode: GLenum): void {
  this.pushCommand('beginTransformFeedback', { primitiveMode });
};

proto.endTransformFeedback = function (): void {
  this.pushCommand('endTransformFeedback', {});
};

proto.transformFeedbackVaryings = function (program: WebGLProgram, varyings: string[], bufferMode: GLenum): void {
  const programId = (program as any).__tsyneId;
  this.pushCommand('transformFeedbackVaryings', { programId, varyings, bufferMode });
};

proto.getTransformFeedbackVarying = function (program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
  // Would need sync call to bridge - return null for now
  return null;
};

// Query objects (WebGL2)
proto.createQuery = function (): WebGLQuery | null {
  const id = this.nextObjectId++;
  this.queries.set(id, { id });
  this.pushCommand('createQuery', { queryId: id });
  return { __tsyneId: id } as any;
};

proto.deleteQuery = function (query: WebGLQuery | null): void {
  if (!query) return;
  const id = (query as any).__tsyneId;
  this.queries.delete(id);
  this.pushCommand('deleteQuery', { queryId: id });
};

proto.beginQuery = function (target: GLenum, query: WebGLQuery): void {
  const queryId = (query as any).__tsyneId;
  this.pushCommand('beginQuery', { target, queryId });
};

proto.endQuery = function (target: GLenum): void {
  this.pushCommand('endQuery', { target });
};

proto.getQueryParameter = function (query: WebGLQuery, pname: GLenum): any {
  // Would need sync call to bridge - return reasonable defaults
  if (pname === 0x8866) { // QUERY_RESULT
    return 0;
  }
  if (pname === 0x8867) { // QUERY_RESULT_AVAILABLE
    return true;
  }
  return null;
};

proto.getQuery = function (target: GLenum, pname: GLenum): WebGLQuery | null {
  return null;
};

proto.isQuery = function (query: WebGLQuery | null): GLboolean {
  if (!query) return false;
  const id = (query as any).__tsyneId;
  return this.queries.has(id);
};

// Additional WebGL1/2 state queries
proto.getRenderbufferParameter = function (target: GLenum, pname: GLenum): any {
  return null;
};

proto.getTexParameter = function (target: GLenum, pname: GLenum): any {
  return null;
};

proto.getUniform = function (program: WebGLProgram, location: WebGLUniformLocation): any {
  return null;
};

proto.getVertexAttrib = function (index: GLuint, pname: GLenum): any {
  return null;
};

proto.getVertexAttribOffset = function (index: GLuint, pname: GLenum): GLintptr {
  return 0;
};

proto.isBuffer = function (buffer: WebGLBuffer | null): GLboolean {
  if (!buffer) return false;
  return this.buffers.has((buffer as any).__tsyneId);
};

proto.isFramebuffer = function (framebuffer: WebGLFramebuffer | null): GLboolean {
  if (!framebuffer) return false;
  return this.framebuffers.has((framebuffer as any).__tsyneId);
};

proto.isProgram = function (program: WebGLProgram | null): GLboolean {
  if (!program) return false;
  return this.programs.has((program as any).__tsyneId);
};

proto.isRenderbuffer = function (renderbuffer: WebGLRenderbuffer | null): GLboolean {
  if (!renderbuffer) return false;
  return this.renderbuffers.has((renderbuffer as any).__tsyneId);
};

proto.isShader = function (shader: WebGLShader | null): GLboolean {
  if (!shader) return false;
  return this.shaders.has((shader as any).__tsyneId);
};

proto.isTexture = function (texture: WebGLTexture | null): GLboolean {
  if (!texture) return false;
  return this.textures.has((texture as any).__tsyneId);
};

proto.isVertexArray = function (vertexArray: WebGLVertexArrayObject | null): GLboolean {
  if (!vertexArray) return false;
  return this.vertexArrays.has((vertexArray as any).__tsyneId);
};

proto.isSampler = function (sampler: WebGLSampler | null): GLboolean {
  if (!sampler) return false;
  return this.samplers.has((sampler as any).__tsyneId);
};

proto.isTransformFeedback = function (tf: WebGLTransformFeedback | null): GLboolean {
  if (!tf) return false;
  return this.transformFeedbacks.has((tf as any).__tsyneId);
};

// Stencil separate face operations
proto.stencilFuncSeparate = function (face: GLenum, func: GLenum, ref: GLint, mask: GLuint): void {
  this.pushCommand('stencilFuncSeparate', { face, func, ref, mask });
};

proto.stencilOpSeparate = function (face: GLenum, sfail: GLenum, dpfail: GLenum, dppass: GLenum): void {
  this.pushCommand('stencilOpSeparate', { face, sfail, dpfail, dppass });
};

proto.stencilMaskSeparate = function (face: GLenum, mask: GLuint): void {
  this.pushCommand('stencilMaskSeparate', { face, mask });
};

// WebGL2 getInternalformatParameter
proto.getInternalformatParameter = function (target: GLenum, internalformat: GLenum, pname: GLenum): any {
  // Return empty array for SAMPLES query
  if (pname === 0x80a9) { // SAMPLES
    return new Int32Array([4, 2]);
  }
  return null;
};
