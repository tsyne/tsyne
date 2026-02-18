/**
 * gl-proxy-textures.ts - Prototype augmentation for TsyneGLProxy
 *
 * Adds texture, framebuffer, and renderbuffer methods to TsyneGLProxy.prototype.
 * This file is part of the gl-proxy split: import it for side effects to register
 * all texture/FBO/RBO methods on the prototype.
 */

import { TsyneGLProxy, encodeBufferData } from './gl-proxy-core';

const proto = TsyneGLProxy.prototype as any;

// ═══════════════════════════════════════════════════════════════
// TEXTURE OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.createTexture = function (): WebGLTexture | null {
  const id = this.nextObjectId++;
  this.textures.set(id, { id });
  this.pushCommand('createTexture', { textureId: id });
  return { __tsyneId: id } as any;
};

proto.deleteTexture = function (texture: WebGLTexture | null): void {
  if (!texture) return;
  const id = (texture as any).__tsyneId;
  this.textures.delete(id);
  this.pushCommand('deleteTexture', { textureId: id });
};

proto.bindTexture = function (target: GLenum, texture: WebGLTexture | null): void {
  const textureId = texture ? (texture as any).__tsyneId : 0;
  this.pushCommand('bindTexture', { target, textureId });
};

proto.activeTexture = function (texture: GLenum): void {
  this.activeTextureUnit = texture - this.TEXTURE0;
  this.pushCommand('activeTexture', { texture });
};

proto.texImage2D = function (
  target: GLenum,
  level: GLint,
  internalformat: GLint,
  width: GLsizei,
  height: GLsizei,
  border: GLint,
  format: GLenum,
  type: GLenum,
  pixels?: ArrayBufferView | null
): void {
  let pixelData: Uint8Array | null = null;
  if (pixels) {
    pixelData = encodeBufferData(pixels);
  }
  this.pushCommand('texImage2D', {
    target,
    level,
    internalformat,
    width,
    height,
    border,
    format,
    type,
    pixels: pixelData,
  });
};

proto.texSubImage2D = function (
  target: GLenum,
  level: GLint,
  xoffset: GLint,
  yoffset: GLint,
  width: GLsizei,
  height: GLsizei,
  format: GLenum,
  type: GLenum,
  pixels?: ArrayBufferView | null
): void {
  let pixelData: Uint8Array | null = null;
  if (pixels) {
    pixelData = encodeBufferData(pixels);
  }
  this.pushCommand('texSubImage2D', {
    target,
    level,
    xoffset,
    yoffset,
    width,
    height,
    format,
    type,
    pixels: pixelData,
  });
};

proto.copyTexImage2D = function (
  target: GLenum,
  level: GLint,
  internalformat: GLenum,
  x: GLint,
  y: GLint,
  width: GLsizei,
  height: GLsizei,
  border: GLint
): void {
  this.pushCommand('copyTexImage2D', {
    target, level, internalformat, x, y, width, height, border,
  });
};

proto.copyTexSubImage2D = function (
  target: GLenum,
  level: GLint,
  xoffset: GLint,
  yoffset: GLint,
  x: GLint,
  y: GLint,
  width: GLsizei,
  height: GLsizei
): void {
  this.pushCommand('copyTexSubImage2D', {
    target, level, xoffset, yoffset, x, y, width, height,
  });
};

proto.texImage3D = function (
  target: GLenum,
  level: GLint,
  internalformat: GLint,
  width: GLsizei,
  height: GLsizei,
  depth: GLsizei,
  border: GLint,
  format: GLenum,
  type: GLenum,
  pixels?: ArrayBufferView | null
): void {
  let pixelData: Uint8Array | null = null;
  if (pixels) {
    pixelData = encodeBufferData(pixels);
  }
  this.pushCommand('texImage3D', {
    target,
    level,
    internalformat,
    width,
    height,
    depth,
    border,
    format,
    type,
    pixels: pixelData,
  });
};

proto.texSubImage3D = function (
  target: GLenum,
  level: GLint,
  xoffset: GLint,
  yoffset: GLint,
  zoffset: GLint,
  width: GLsizei,
  height: GLsizei,
  depth: GLsizei,
  format: GLenum,
  type: GLenum,
  pixels?: ArrayBufferView | null
): void {
  let pixelData: Uint8Array | null = null;
  if (pixels) {
    pixelData = encodeBufferData(pixels);
  }
  this.pushCommand('texSubImage3D', {
    target,
    level,
    xoffset,
    yoffset,
    zoffset,
    width,
    height,
    depth,
    format,
    type,
    pixels: pixelData,
  });
};

proto.texParameteri = function (target: GLenum, pname: GLenum, param: GLint): void {
  this.pushCommand('texParameteri', { target, pname, param });
};

proto.texParameterf = function (target: GLenum, pname: GLenum, param: GLfloat): void {
  this.pushCommand('texParameterf', { target, pname, param });
};

proto.generateMipmap = function (target: GLenum): void {
  this.pushCommand('generateMipmap', { target });
};

proto.texStorage2D = function (
  target: GLenum,
  levels: GLsizei,
  internalformat: GLenum,
  width: GLsizei,
  height: GLsizei
): void {
  this.pushCommand('texStorage2D', {
    target,
    levels,
    internalformat,
    width,
    height,
  });
};

proto.texStorage3D = function (
  target: GLenum,
  levels: GLsizei,
  internalformat: GLenum,
  width: GLsizei,
  height: GLsizei,
  depth: GLsizei
): void {
  this.pushCommand('texStorage3D', {
    target,
    levels,
    internalformat,
    width,
    height,
    depth,
  });
};

proto.compressedTexImage2D = function (
  target: GLenum,
  level: GLint,
  internalformat: GLenum,
  width: GLsizei,
  height: GLsizei,
  border: GLint,
  data: ArrayBufferView
): void {
  const encoded = encodeBufferData(data);
  this.pushCommand('compressedTexImage2D', {
    target, level, internalformat, width, height, border, data: encoded,
  });
};

proto.compressedTexSubImage2D = function (
  target: GLenum,
  level: GLint,
  xoffset: GLint,
  yoffset: GLint,
  width: GLsizei,
  height: GLsizei,
  format: GLenum,
  data: ArrayBufferView
): void {
  const encoded = encodeBufferData(data);
  this.pushCommand('compressedTexSubImage2D', {
    target, level, xoffset, yoffset, width, height, format, data: encoded,
  });
};

proto.compressedTexImage3D = function (
  target: GLenum,
  level: GLint,
  internalformat: GLenum,
  width: GLsizei,
  height: GLsizei,
  depth: GLsizei,
  border: GLint,
  data: ArrayBufferView
): void {
  const encoded = encodeBufferData(data);
  this.pushCommand('compressedTexImage3D', {
    target, level, internalformat, width, height, depth, border, data: encoded,
  });
};

proto.compressedTexSubImage3D = function (
  target: GLenum,
  level: GLint,
  xoffset: GLint,
  yoffset: GLint,
  zoffset: GLint,
  width: GLsizei,
  height: GLsizei,
  depth: GLsizei,
  format: GLenum,
  data: ArrayBufferView
): void {
  const encoded = encodeBufferData(data);
  this.pushCommand('compressedTexSubImage3D', {
    target, level, xoffset, yoffset, zoffset, width, height, depth, format, data: encoded,
  });
};

// ═══════════════════════════════════════════════════════════════
// FRAMEBUFFER OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.createFramebuffer = function (): WebGLFramebuffer | null {
  const id = this.nextObjectId++;
  this.framebuffers.set(id, { id });
  this.pushCommand('createFramebuffer', { framebufferId: id });
  return { __tsyneId: id } as any;
};

proto.deleteFramebuffer = function (framebuffer: WebGLFramebuffer | null): void {
  if (!framebuffer) return;
  const id = (framebuffer as any).__tsyneId;
  this.framebuffers.delete(id);
  this.pushCommand('deleteFramebuffer', { framebufferId: id });
};

proto.bindFramebuffer = function (target: GLenum, framebuffer: WebGLFramebuffer | null): void {
  const framebufferId = framebuffer ? (framebuffer as any).__tsyneId : 0;
  this.pushCommand('bindFramebuffer', { target, framebufferId });
};

proto.framebufferTexture2D = function (
  target: GLenum,
  attachment: GLenum,
  textarget: GLenum,
  texture: WebGLTexture | null,
  level: GLint
): void {
  const textureId = texture ? (texture as any).__tsyneId : 0;
  this.pushCommand('framebufferTexture2D', {
    target,
    attachment,
    textarget,
    textureId,
    level,
  });
};

proto.checkFramebufferStatus = function (target: GLenum): GLenum {
  // Return a valid status for now - actual implementation would query the bridge
  return this.FRAMEBUFFER_COMPLETE;
};

// ═══════════════════════════════════════════════════════════════
// RENDERBUFFER OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.createRenderbuffer = function (): WebGLRenderbuffer | null {
  const id = this.nextObjectId++;
  this.renderbuffers.set(id, { id });
  this.pushCommand('createRenderbuffer', { renderbufferId: id });
  return { __tsyneId: id } as any;
};

proto.deleteRenderbuffer = function (renderbuffer: WebGLRenderbuffer | null): void {
  if (!renderbuffer) return;
  const id = (renderbuffer as any).__tsyneId;
  this.renderbuffers.delete(id);
  this.pushCommand('deleteRenderbuffer', { renderbufferId: id });
};

proto.bindRenderbuffer = function (target: GLenum, renderbuffer: WebGLRenderbuffer | null): void {
  const renderbufferId = renderbuffer ? (renderbuffer as any).__tsyneId : 0;
  this.pushCommand('bindRenderbuffer', { target, renderbufferId });
};

proto.renderbufferStorage = function (target: GLenum, internalformat: GLenum, width: GLsizei, height: GLsizei): void {
  this.pushCommand('renderbufferStorage', { target, internalformat, width, height });
};

proto.renderbufferStorageMultisample = function (
  target: GLenum,
  samples: GLsizei,
  internalformat: GLenum,
  width: GLsizei,
  height: GLsizei
): void {
  this.pushCommand('renderbufferStorageMultisample', { target, samples, internalformat, width, height });
};

proto.framebufferRenderbuffer = function (
  target: GLenum,
  attachment: GLenum,
  renderbuffertarget: GLenum,
  renderbuffer: WebGLRenderbuffer | null
): void {
  const renderbufferId = renderbuffer ? (renderbuffer as any).__tsyneId : 0;
  this.pushCommand('framebufferRenderbuffer', {
    target,
    attachment,
    renderbuffertarget,
    renderbufferId,
  });
};

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL FRAMEBUFFER OPERATIONS (WebGL2)
// ═══════════════════════════════════════════════════════════════

proto.drawBuffers = function (buffers: GLenum[]): void {
  // WebGL2 method to specify which color buffers to draw to
  // For now, just send to bridge - many cases work with default single buffer
  this.pushCommand('drawBuffers', { buffers });
};

proto.readBuffer = function (src: GLenum): void {
  // WebGL2 method to specify read buffer for readPixels
  this.pushCommand('readBuffer', { src });
};

proto.blitFramebuffer = function (
  srcX0: GLint,
  srcY0: GLint,
  srcX1: GLint,
  srcY1: GLint,
  dstX0: GLint,
  dstY0: GLint,
  dstX1: GLint,
  dstY1: GLint,
  mask: GLbitfield,
  filter: GLenum
): void {
  this.pushCommand('blitFramebuffer', {
    srcX0, srcY0, srcX1, srcY1,
    dstX0, dstY0, dstX1, dstY1,
    mask, filter,
  });
};

proto.framebufferTextureLayer = function (
  target: GLenum,
  attachment: GLenum,
  texture: WebGLTexture | null,
  level: GLint,
  layer: GLint
): void {
  const textureId = texture ? (texture as any).__tsyneId : 0;
  this.pushCommand('framebufferTextureLayer', { target, attachment, textureId, level, layer });
};

proto.invalidateFramebuffer = function (target: GLenum, attachments: GLenum[]): void {
  this.pushCommand('invalidateFramebuffer', { target, attachments });
};

proto.invalidateSubFramebuffer = function (target: GLenum, attachments: GLenum[], x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
  this.pushCommand('invalidateSubFramebuffer', { target, attachments, x, y, width, height });
};
