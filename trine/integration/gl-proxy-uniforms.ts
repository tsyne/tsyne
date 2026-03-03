/**
 * TsyneGLProxy - Uniform methods (prototype augmentation)
 *
 * This file adds uniform-related methods to TsyneGLProxy.prototype.
 * It is part of the gl-proxy split: instead of one massive class file,
 * methods are grouped by category and attached to the prototype.
 *
 * Includes:
 *   - getUniformLocation / getUniformName helper
 *   - uniform{1234}{fi}[v] (scalar + vector, int + float)
 *   - uniformMatrix{234}fv
 *   - UBO operations (getUniformBlockIndex, uniformBlockBinding, etc.)
 *   - WebGL2 unsigned int uniforms (uniform{1234}ui[v])
 *   - WebGL2 non-square matrix uniforms (uniformMatrix{2x3,2x4,3x2,3x4,4x2,4x3}fv)
 */

import { TsyneGLProxy, encodeBufferData } from './gl-proxy-core';

const proto = TsyneGLProxy.prototype as any;

// ═══════════════════════════════════════════════════════════════
// UNIFORM OPERATIONS
// ═══════════════════════════════════════════════════════════════

proto.getUniformLocation = function(program: WebGLProgram, name: string): WebGLUniformLocation | null {
  const id = this.nextObjectId++;
  this.uniformLocations.set(id, { name });
  return { __tsyneId: id } as any;
};

// Helper to get uniform name from location ID
proto.getUniformName = function(locId: number): string {
  const info = this.uniformLocations.get(locId);
  return info?.name || `u_uniform_${locId}`;
};

proto.uniform1f = function(location: WebGLUniformLocation, x: GLfloat): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached === x) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, x);
  this.pushFlat('uniform1f', locId, this.getUniformName(locId), x);
};

proto.uniform2f = function(location: WebGLUniformLocation, x: GLfloat, y: GLfloat): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y]);
  this.pushFlat('uniform2f', locId, this.getUniformName(locId), x, y);
};

proto.uniform3f = function(location: WebGLUniformLocation, x: GLfloat, y: GLfloat, z: GLfloat): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y && cached[2] === z) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y, z]);
  this.pushFlat('uniform3f', locId, this.getUniformName(locId), x, y, z);
};

proto.uniform4f = function(location: WebGLUniformLocation, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y && cached[2] === z && cached[3] === w) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y, z, w]);
  this.pushFlat('uniform4f', locId, this.getUniformName(locId), x, y, z, w);
};

proto.uniform1i = function(location: WebGLUniformLocation, x: GLint): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached === x) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, x);
  this.pushFlat('uniform1i', locId, this.getUniformName(locId), x);
};

proto.uniform2i = function(location: WebGLUniformLocation, x: GLint, y: GLint): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y]);
  this.pushFlat('uniform2i', locId, this.getUniformName(locId), x, y);
};

proto.uniform3i = function(location: WebGLUniformLocation, x: GLint, y: GLint, z: GLint): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y && cached[2] === z) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y, z]);
  this.pushFlat('uniform3i', locId, this.getUniformName(locId), x, y, z);
};

proto.uniform4i = function(location: WebGLUniformLocation, x: GLint, y: GLint, z: GLint, w: GLint): void {
  const locId = (location as any).__tsyneId;
  const cached = this.uniformCache.get(locId);
  if (cached !== undefined && cached[0] === x && cached[1] === y && cached[2] === z && cached[3] === w) { this._commandsSkipped++; return; }
  this.uniformCache.set(locId, [x, y, z, w]);
  this.pushFlat('uniform4i', locId, this.getUniformName(locId), x, y, z, w);
};

proto.uniform1fv = function(location: WebGLUniformLocation, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform1fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform2fv = function(location: WebGLUniformLocation, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform2fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform3fv = function(location: WebGLUniformLocation, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform3fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform4fv = function(location: WebGLUniformLocation, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform4fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform1iv = function(location: WebGLUniformLocation, data: Int32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform1iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform2iv = function(location: WebGLUniformLocation, data: Int32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform2iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform3iv = function(location: WebGLUniformLocation, data: Int32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform3iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform4iv = function(location: WebGLUniformLocation, data: Int32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform4iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniformMatrix2fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix3fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  const cached = this.uniformCache.get(locId) as Uint8Array | undefined;
  if (cached !== undefined && cached.byteLength === encoded.byteLength) {
    let same = true;
    for (let i = 0; i < encoded.byteLength; i++) {
      if (cached[i] !== encoded[i]) { same = false; break; }
    }
    if (same) { this._commandsSkipped++; return; }
  }
  // Cache a copy — encoded is an arena view that gets recycled
  const copy = new Uint8Array(encoded.byteLength);
  copy.set(encoded);
  this.uniformCache.set(locId, copy);
  this.pushFlat('uniformMatrix3fv', locId, this.getUniformName(locId), transpose, encoded);
};

proto.uniformMatrix4fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  const cached = this.uniformCache.get(locId) as Uint8Array | undefined;
  if (cached !== undefined && cached.byteLength === encoded.byteLength) {
    let same = true;
    for (let i = 0; i < encoded.byteLength; i++) {
      if (cached[i] !== encoded[i]) { same = false; break; }
    }
    if (same) { this._commandsSkipped++; return; }
  }
  // Cache a copy — encoded is an arena view that gets recycled
  const copy = new Uint8Array(encoded.byteLength);
  copy.set(encoded);
  this.uniformCache.set(locId, copy);
  this.pushFlat('uniformMatrix4fv', locId, this.getUniformName(locId), transpose, encoded);
};

// ═══════════════════════════════════════════════════════════════
// UNIFORM BUFFER OBJECT (UBO) OPERATIONS (WebGL2)
// ═══════════════════════════════════════════════════════════════

proto.getUniformBlockIndex = function(program: WebGLProgram, uniformBlockName: string): GLuint {
  // In real WebGL2 this returns the block index; we return a deterministic ID
  // based on the name so that uniformBlockBinding can reference it
  const programId = (program as any).__tsyneId;
  const key = `${programId}:${uniformBlockName}`;
  if (!this.uniformBlockIndices.has(key)) {
    this.uniformBlockIndices.set(key, this.nextUniformBlockIndex++);
  }
  return this.uniformBlockIndices.get(key)!;
};

proto.uniformBlockBinding = function(program: WebGLProgram, uniformBlockIndex: GLuint, uniformBlockBinding: GLuint): void {
  const programId = (program as any).__tsyneId;
  this.pushCommand('uniformBlockBinding', { programId, uniformBlockIndex, uniformBlockBinding });
};

proto.getActiveUniformBlockParameter = function(program: WebGLProgram, uniformBlockIndex: GLuint, pname: GLenum): any {
  // Would need sync call to bridge - return reasonable defaults
  switch (pname) {
    case 0x8a41: // UNIFORM_BLOCK_BINDING
      return 0;
    case 0x8a40: // UNIFORM_BLOCK_DATA_SIZE
      return 256;
    case 0x8a42: // UNIFORM_BLOCK_ACTIVE_UNIFORMS
      return 0;
    case 0x8a43: // UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES
      return new Uint32Array([]);
    case 0x8a44: // UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER
      return true;
    case 0x8a46: // UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER
      return true;
    default:
      return null;
  }
};

proto.getActiveUniformBlockName = function(program: WebGLProgram, uniformBlockIndex: GLuint): string | null {
  // Would need sync call to bridge - return null for now
  return null;
};

// ═══════════════════════════════════════════════════════════════
// WebGL2 UNSIGNED INT UNIFORM METHODS
// ═══════════════════════════════════════════════════════════════

proto.uniform1ui = function(location: WebGLUniformLocation, v0: GLuint): void {
  const locId = (location as any).__tsyneId;
  this.pushCommand('uniform1ui', { locationId: locId, name: this.getUniformName(locId), v0 });
};

proto.uniform2ui = function(location: WebGLUniformLocation, v0: GLuint, v1: GLuint): void {
  const locId = (location as any).__tsyneId;
  this.pushCommand('uniform2ui', { locationId: locId, name: this.getUniformName(locId), v0, v1 });
};

proto.uniform3ui = function(location: WebGLUniformLocation, v0: GLuint, v1: GLuint, v2: GLuint): void {
  const locId = (location as any).__tsyneId;
  this.pushCommand('uniform3ui', { locationId: locId, name: this.getUniformName(locId), v0, v1, v2 });
};

proto.uniform4ui = function(location: WebGLUniformLocation, v0: GLuint, v1: GLuint, v2: GLuint, v3: GLuint): void {
  const locId = (location as any).__tsyneId;
  this.pushCommand('uniform4ui', { locationId: locId, name: this.getUniformName(locId), v0, v1, v2, v3 });
};

proto.uniform1uiv = function(location: WebGLUniformLocation, data: Uint32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform1uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform2uiv = function(location: WebGLUniformLocation, data: Uint32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform2uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform3uiv = function(location: WebGLUniformLocation, data: Uint32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform3uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

proto.uniform4uiv = function(location: WebGLUniformLocation, data: Uint32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniform4uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
};

// ═══════════════════════════════════════════════════════════════
// WebGL2 NON-SQUARE MATRIX UNIFORM METHODS
// ═══════════════════════════════════════════════════════════════

proto.uniformMatrix2x3fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix2x3fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix2x4fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix2x4fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix3x2fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix3x2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix3x4fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix3x4fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix4x2fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix4x2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};

proto.uniformMatrix4x3fv = function(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
  const locId = (location as any).__tsyneId;
  const encoded = encodeBufferData(data);
  this.pushCommand('uniformMatrix4x3fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
};
