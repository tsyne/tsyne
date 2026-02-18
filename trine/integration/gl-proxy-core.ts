/**
 * TsyneGLProxy - Fake WebGL2RenderingContext for Tsyne
 *
 * Implements the WebGL2RenderingContext interface by proxying all calls
 * to the Tsyne bridge, which executes them as native OpenGL calls.
 *
 * Uses a command buffer approach: GL calls are queued and sent as a batch
 * for performance (three.js makes hundreds of GL calls per frame).
 *
 * Split into multiple files for maintainability:
 * - gl-constants.ts    — WebGL2 constant definitions
 * - gl-proxy-core.ts   — Class definition, constructor, core + buffer/shader/program ops (this file)
 * - gl-proxy-uniforms.ts  — Uniform and UBO methods
 * - gl-proxy-textures.ts  — Texture, framebuffer, renderbuffer methods
 * - gl-proxy-state.ts     — Vertex array, drawing, state, sync, misc methods
 * - gl-proxy.ts           — Barrel re-export
 */

import { TsyneBridge, GLCommand } from './bridge';
import { TsyneCanvas } from './canvas';
import { applyGLConstants } from './gl-constants';

/**
 * WebGL2RenderingContext implementation
 * All methods return immediately - actual GPU work happens asynchronously on the bridge
 */
export class TsyneGLProxy implements WebGL2RenderingContext {
  // Canvas reference
  readonly canvas: TsyneCanvas;
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;

  // GL object ID tracking (local counter for each type of object)
  private nextObjectId = 1;

  // Command buffer - accumulate GL commands, send as batch
  private commandBuffer: GLCommand[] = [];
  private needsFlush = false;

  // Track GL state locally to avoid re-sending unchanged state
  private boundProgram: number | null = null;
  private boundArrayBuffer: number | null = null;
  private boundElementArrayBuffer: number | null = null;
  private activeTextureUnit = 0;

  // GL state deduplication — track current state to skip redundant commands
  private enabledCaps = new Set<number>();
  private currentDepthFunc: number = 0x0201; // LESS
  private currentDepthMask: boolean = true;
  private currentCullFace: number = 0x0405; // BACK
  private currentFrontFace: number = 0x0901; // CCW
  private currentBlendSrc: number = 0x0001; // ONE
  private currentBlendDst: number = 0x0000; // ZERO
  private currentBlendSrcAlpha: number = 0x0001;
  private currentBlendDstAlpha: number = 0x0000;
  private currentBlendEqRGB: number = 0x8006; // FUNC_ADD
  private currentBlendEqAlpha: number = 0x8006;
  private currentColorMask: [boolean, boolean, boolean, boolean] = [true, true, true, true];
  private currentStencilFunc: number = 0x0207; // ALWAYS
  private currentStencilRef: number = 0;
  private currentStencilMask: number = 0xFFFFFFFF;
  private currentLineWidth: number = 1;

  // Per-frame profiling (enabled via TSYNE_GL_PROFILE=1 env var)
  private _frameCount = 0;
  private _commandsThisFrame = 0;
  private _commandsSkipped = 0;
  private _profilingEnabled = typeof process !== 'undefined' && process.env?.TSYNE_GL_PROFILE === '1';
  private _profilingInterval = 60; // Log every N frames
  private _frameStartTime = 0;
  private _totalFlushTime = 0;

  /**
   * Map of object IDs to actual GL objects (on the bridge)
   * We maintain these IDs to track which objects we've created
   */
  private buffers = new Map<number, { id: number }>();
  private textures = new Map<number, { id: number }>();
  private programs = new Map<number, { id: number }>();
  private shaders = new Map<number, { id: number }>();
  private framebuffers = new Map<number, { id: number }>();
  private renderbuffers = new Map<number, { id: number }>();
  private vertexArrays = new Map<number, { id: number }>();
  private queries = new Map<number, { id: number }>();
  private transformFeedbacks = new Map<number, { id: number }>();
  private samplers = new Map<number, { id: number }>();
  private uniformLocations = new Map<number, { name: string }>();
  private uniformBlockIndices = new Map<string, number>();
  private nextUniformBlockIndex = 0;
  private syncs = new Map<number, { id: number }>();

  constructor(
    private bridge: TsyneBridge,
    canvas: TsyneCanvas,
    private attributes: Record<string, any> = {}
  ) {
    this.canvas = canvas;
    this.drawingBufferWidth = canvas.width;
    this.drawingBufferHeight = canvas.height;
  }

  /**
   * Push a command to the buffer
   */
  private pushCommand(cmd: string, args: Record<string, any> = {}): void {
    this.commandBuffer.push({ cmd, args });
    this.needsFlush = true;
  }

  /**
   * Flush the command buffer to the bridge
   * Should be called after each render() call
   */
  async flush(): Promise<void> {
    if (!this.needsFlush || this.commandBuffer.length === 0) {
      return;
    }

    const flushStart = this._profilingEnabled ? performance.now() : 0;

    try {
      const canvasId = await (this.canvas as any).getBridgeCanvasId();
      const response = await this.bridge.executeBatch(canvasId, this.commandBuffer);

      // Process any mouse events piggybacked on the response
      // Note: Go JSON uses capitalized field names (Type, X, Y, Button)
      const mouseEvents = response?.mouseEvents || response?.Result?.mouseEvents;
      if (mouseEvents && Array.isArray(mouseEvents)) {
        for (const evt of mouseEvents) {
          const eventType = evt.Type || evt.type;
          const x = evt.X ?? evt.x;
          const y = evt.Y ?? evt.y;
          const button = evt.Button ?? evt.button ?? 0;
          this.canvas.dispatchMouseEvent(eventType, x, y, button);
        }
      }
    } catch (error) {
      console.error('[TsyneGL] Flush failed:', error);
    }

    // Per-frame profiling
    if (this._profilingEnabled) {
      const flushTime = performance.now() - flushStart;
      this._totalFlushTime += flushTime;
      this._commandsThisFrame = this.commandBuffer.length;
      this._frameCount++;
      if (this._frameCount % this._profilingInterval === 0) {
        const avgFlush = this._totalFlushTime / this._profilingInterval;
        console.log(
          `[TsyneGL Profile] frame=${this._frameCount} cmds=${this._commandsThisFrame} ` +
          `skipped=${this._commandsSkipped} avgFlush=${avgFlush.toFixed(1)}ms`
        );
        this._totalFlushTime = 0;
        this._commandsSkipped = 0;
      }
    }

    this.commandBuffer = [];
    this.needsFlush = false;
  }

  /**
   * Fire-and-forget flush - sends commands without waiting for response
   * Use this for higher frame rates when command ordering is guaranteed
   */
  flushAsync(): void {
    if (!this.needsFlush || this.commandBuffer.length === 0) {
      return;
    }

    const commands = this.commandBuffer;
    this.commandBuffer = [];
    this.needsFlush = false;

    // Fire and forget - don't wait for response
    (this.canvas as any).getBridgeCanvasId().then((canvasId: string) => {
      this.bridge.sendAsync('executeBatch', { canvasId, commands });
    });
  }

  /**
   * Finalize rendering (called by WebGLRenderer.render)
   */
  async finalize(): Promise<void> {
    await this.flush();
  }

  // ═══════════════════════════════════════════════════════════════
  // BUFFER OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createBuffer(): WebGLBuffer | null {
    const id = this.nextObjectId++;
    this.buffers.set(id, { id });
    this.pushCommand('createBuffer', { bufferId: id });
    return { __tsyneId: id } as any;
  }

  deleteBuffer(buffer: WebGLBuffer | null): void {
    if (!buffer) return;
    const id = (buffer as any).__tsyneId;
    this.buffers.delete(id);
    this.pushCommand('deleteBuffer', { bufferId: id });
  }

  bindBuffer(target: GLenum, buffer: WebGLBuffer | null): void {
    const bufferId = buffer ? (buffer as any).__tsyneId : 0;

    // Update local state
    if (target === this.ARRAY_BUFFER) {
      this.boundArrayBuffer = bufferId || null;
    } else if (target === this.ELEMENT_ARRAY_BUFFER) {
      this.boundElementArrayBuffer = bufferId || null;
    }

    this.pushCommand('bindBuffer', { target, bufferId });
  }

  bindBufferBase(target: GLenum, index: GLuint, buffer: WebGLBuffer | null): void {
    const bufferId = buffer ? (buffer as any).__tsyneId : 0;
    this.pushCommand('bindBufferBase', { target, index, bufferId });
  }

  bindBufferRange(target: GLenum, index: GLuint, buffer: WebGLBuffer | null, offset: GLintptr, size: GLsizeiptr): void {
    const bufferId = buffer ? (buffer as any).__tsyneId : 0;
    this.pushCommand('bindBufferRange', { target, index, bufferId, offset, size });
  }

  copyBufferSubData(
    readTarget: GLenum,
    writeTarget: GLenum,
    readOffset: GLintptr,
    writeOffset: GLintptr,
    size: GLsizeiptr
  ): void {
    this.pushCommand('copyBufferSubData', { readTarget, writeTarget, readOffset, writeOffset, size });
  }

  getBufferSubData(target: GLenum, srcByteOffset: GLintptr, dstBuffer: ArrayBufferView, dstOffset?: GLuint, length?: GLuint): void {
    // Readback operations require sync bridge round-trip which isn't supported.
    // Three.js doesn't use this in normal rendering paths — it's for GPU→CPU readback.
    // If called, dstBuffer is left unchanged (zeroed).
  }

  bufferData(
    target: GLenum,
    srcData: ArrayBufferView | ArrayBuffer | number | null,
    usage: GLenum,
    srcOffset?: number,
    length?: number
  ): void {
    let data: any = null;

    if (typeof srcData === 'number') {
      // Size only
      data = srcData;
    } else if (srcData instanceof ArrayBuffer) {
      // Raw ArrayBuffer
      data = encodeBufferData(srcData);
    } else if (ArrayBuffer.isView(srcData)) {
      // TypedArray
      data = encodeBufferData(srcData);
    }

    this.pushCommand('bufferData', { target, data, usage, srcOffset, length });
  }

  bufferSubData(
    target: GLenum,
    dstByteOffset: GLintptr,
    srcData: ArrayBufferView | ArrayBuffer,
    srcOffset?: number,
    length?: number
  ): void {
    const data = encodeBufferData(srcData);
    this.pushCommand('bufferSubData', { target, dstByteOffset, data, srcOffset, length });
  }

  // ═══════════════════════════════════════════════════════════════
  // SHADER OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  // Track shader types and sources locally
  private shaderTypes = new Map<number, GLenum>();
  private shaderSources = new Map<number, string>();

  createShader(type: GLenum): WebGLShader | null {
    const id = this.nextObjectId++;
    this.shaders.set(id, { id });
    this.shaderTypes.set(id, type);  // Track shader type
    this.pushCommand('createShader', { shaderId: id, type });
    return { __tsyneId: id } as any;
  }

  deleteShader(shader: WebGLShader | null): void {
    if (!shader) return;
    const id = (shader as any).__tsyneId;
    this.shaders.delete(id);
    this.shaderTypes.delete(id);
    this.shaderSources.delete(id);
    this.pushCommand('deleteShader', { shaderId: id });
  }

  shaderSource(shader: WebGLShader, source: string): void {
    const shaderId = (shader as any).__tsyneId;
    this.shaderSources.set(shaderId, source);  // Track shader source
    this.pushCommand('shaderSource', { shaderId, source });
  }

  compileShader(shader: WebGLShader): void {
    const shaderId = (shader as any).__tsyneId;
    this.pushCommand('compileShader', { shaderId });
  }

  // Track shader compile errors locally (filled by bridge response if available)
  private shaderCompileErrors = new Map<number, string>();

  getShaderParameter(shader: WebGLShader, pname: GLenum): any {
    const shaderId = (shader as any).__tsyneId;
    if (pname === 0x8b81) { // COMPILE_STATUS
      // Return true unless we have a known error for this shader
      return !this.shaderCompileErrors.has(shaderId);
    }
    if (pname === 0x8b4f) { // SHADER_TYPE
      return this.shaderTypes.get(shaderId) || null;
    }
    if (pname === 0x8b80) { // DELETE_STATUS
      return !this.shaders.has(shaderId);
    }
    return null;
  }

  getShaderInfoLog(shader: WebGLShader): string {
    const shaderId = (shader as any).__tsyneId;
    return this.shaderCompileErrors.get(shaderId) || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // PROGRAM OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createProgram(): WebGLProgram | null {
    const id = this.nextObjectId++;
    this.programs.set(id, { id });
    this.pushCommand('createProgram', { programId: id });
    return { __tsyneId: id } as any;
  }

  deleteProgram(program: WebGLProgram | null): void {
    if (!program) return;
    const id = (program as any).__tsyneId;
    this.programs.delete(id);
    this.pushCommand('deleteProgram', { programId: id });
  }

  attachShader(program: WebGLProgram, shader: WebGLShader): void {
    const programId = (program as any).__tsyneId;
    const shaderId = (shader as any).__tsyneId;
    const shaderType = this.shaderTypes.get(shaderId);
    const source = this.shaderSources.get(shaderId);

    // Track shader sources for attribute/uniform parsing
    if (source) {
      if (shaderType === this.VERTEX_SHADER) {
        this.programVertexShaders.set(programId, source);
      } else if (shaderType === this.FRAGMENT_SHADER) {
        this.programFragmentShaders.set(programId, source);
      }
    }

    this.pushCommand('attachShader', { programId, shaderId });
  }

  detachShader(program: WebGLProgram, shader: WebGLShader): void {
    const programId = (program as any).__tsyneId;
    const shaderId = (shader as any).__tsyneId;
    this.pushCommand('detachShader', { programId, shaderId });
  }

  linkProgram(program: WebGLProgram): void {
    const programId = (program as any).__tsyneId;
    this.pushCommand('linkProgram', { programId });
  }

  useProgram(program: WebGLProgram | null): void {
    const programId = program ? (program as any).__tsyneId : 0;
    this.boundProgram = programId || null;
    this.pushCommand('useProgram', { programId });
  }

  // Track vertex shader sources per program for attribute parsing
  private programVertexShaders = new Map<number, string>();

  getProgramParameter(program: WebGLProgram, pname: GLenum): any {
    const programId = (program as any).__tsyneId;

    if (pname === this.LINK_STATUS) {
      return !this.programLinkErrors.has(programId);
    }
    if (pname === this.VALIDATE_STATUS) {
      return true;
    }

    if (pname === this.ACTIVE_ATTRIBUTES) {
      // Parse the vertex shader to count attributes
      const vertexSrc = this.programVertexShaders.get(programId);
      if (vertexSrc) {
        const attrs = this.parseVertexAttributes(vertexSrc);
        return attrs.length;
      }
      // Default: return common three.js attribute count
      return 3; // position, normal, uv
    }

    if (pname === this.ACTIVE_UNIFORMS) {
      // Parse both shaders to count uniforms
      const vertexSrc = this.programVertexShaders.get(programId);
      const fragmentSrc = this.programFragmentShaders.get(programId);
      const uniforms = new Set<string>();

      if (vertexSrc) {
        for (const u of this.parseShaderUniforms(vertexSrc)) {
          uniforms.add(u.name);
        }
      }
      if (fragmentSrc) {
        for (const u of this.parseShaderUniforms(fragmentSrc)) {
          uniforms.add(u.name);
        }
      }

      return uniforms.size || 10; // Return parsed count or reasonable default
    }

    return null;
  }

  // Track program link errors
  private programLinkErrors = new Map<number, string>();

  getProgramInfoLog(program: WebGLProgram): string {
    const programId = (program as any).__tsyneId;
    return this.programLinkErrors.get(programId) || '';
  }

  /**
   * Get information about an active attribute
   */
  getActiveAttrib(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
    const programId = (program as any).__tsyneId;
    const vertexSrc = this.programVertexShaders.get(programId);

    if (vertexSrc) {
      const attrs = this.parseVertexAttributes(vertexSrc);
      if (index < attrs.length) {
        return {
          name: attrs[index].name,
          size: 1, // Number of elements (1 for vec/mat, array length for arrays)
          type: attrs[index].glType,
        };
      }
    }

    // Fallback: return common three.js attributes
    const defaultAttrs = [
      { name: 'position', type: this.FLOAT_VEC3 },
      { name: 'normal', type: this.FLOAT_VEC3 },
      { name: 'uv', type: this.FLOAT_VEC2 },
    ];

    if (index < defaultAttrs.length) {
      return {
        name: defaultAttrs[index].name,
        size: 1,
        type: defaultAttrs[index].type,
      };
    }

    return null;
  }

  /**
   * Parse vertex shader source to extract attribute declarations
   */
  private parseVertexAttributes(source: string): Array<{name: string, glType: number}> {
    const attrs: Array<{name: string, glType: number}> = [];

    // Match both GLSL 110 style (attribute) and GLSL 300 ES style (in)
    // Also handle #define attribute in (three.js compatibility macros)
    const attrRegex = /(?:attribute|in)\s+(vec2|vec3|vec4|float|mat2|mat3|mat4)\s+(\w+)\s*;/g;

    let match;
    while ((match = attrRegex.exec(source)) !== null) {
      const [, glslType, name] = match;

      // Skip built-in or internal attributes
      if (name.startsWith('gl_')) continue;

      let glType: number;
      switch (glslType) {
        case 'float': glType = this.FLOAT; break;
        case 'vec2': glType = this.FLOAT_VEC2; break;
        case 'vec3': glType = this.FLOAT_VEC3; break;
        case 'vec4': glType = this.FLOAT_VEC4; break;
        case 'mat2': glType = this.FLOAT_MAT2; break;
        case 'mat3': glType = this.FLOAT_MAT3; break;
        case 'mat4': glType = this.FLOAT_MAT4; break;
        default: glType = this.FLOAT;
      }

      attrs.push({ name, glType });
    }

    return attrs;
  }

  // Track fragment shader sources per program for uniform parsing
  private programFragmentShaders = new Map<number, string>();

  /**
   * Get information about an active uniform
   */
  getActiveUniform(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
    const programId = (program as any).__tsyneId;

    // Collect uniforms from both vertex and fragment shaders
    const uniforms: Array<{name: string, type: number, size: number}> = [];

    const vertexSrc = this.programVertexShaders.get(programId);
    const fragmentSrc = this.programFragmentShaders.get(programId);

    if (vertexSrc) {
      uniforms.push(...this.parseShaderUniforms(vertexSrc));
    }
    if (fragmentSrc) {
      uniforms.push(...this.parseShaderUniforms(fragmentSrc));
    }

    // Remove duplicates (same uniform in both shaders)
    const uniqueUniforms = new Map<string, {name: string, type: number, size: number}>();
    for (const u of uniforms) {
      uniqueUniforms.set(u.name, u);
    }

    const uniformList = Array.from(uniqueUniforms.values());

    if (index < uniformList.length) {
      return {
        name: uniformList[index].name,
        size: uniformList[index].size,
        type: uniformList[index].type,
      };
    }

    return null;
  }

  /**
   * Parse shader source to extract uniform declarations
   * Handles both basic types and struct uniforms (including light structs)
   */
  private parseShaderUniforms(source: string): Array<{name: string, type: number, size: number}> {
    const uniforms: Array<{name: string, type: number, size: number}> = [];

    // First, parse struct definitions to know their fields
    const structDefs = this.parseStructDefinitions(source);

    // Match uniform declarations - handle all common GLSL types AND custom struct types
    const basicTypes = 'float|vec2|vec3|vec4|int|ivec2|ivec3|ivec4|uint|uvec2|uvec3|uvec4|mat2|mat3|mat4|mat2x3|mat2x4|mat3x2|mat3x4|mat4x2|mat4x3|sampler2D|samplerCube|sampler3D|sampler2DArray|sampler2DShadow|samplerCubeShadow|sampler2DArrayShadow|isampler2D|isampler3D|isamplerCube|isampler2DArray|usampler2D|usampler3D|usamplerCube|usampler2DArray|bool';
    const uniformRegex = new RegExp(`uniform\\s+(${basicTypes}|\\w+)\\s+(\\w+)(?:\\s*\\[\\s*(\\d+)\\s*\\])?\\s*;`, 'g');

    let match;
    while ((match = uniformRegex.exec(source)) !== null) {
      const [, glslType, name, arraySize] = match;

      // Check if this is a struct type
      const structFields = structDefs.get(glslType);
      if (structFields) {
        // Expand struct uniform into member uniforms
        const count = arraySize ? parseInt(arraySize, 10) : 1;
        for (let i = 0; i < count; i++) {
          for (const field of structFields) {
            const memberName = arraySize
              ? `${name}[${i}].${field.name}`
              : `${name}.${field.name}`;
            // Struct member uniforms have size 1
            uniforms.push({ name: memberName, type: field.type, size: 1 });
          }
        }
      } else {
        // Basic type
        const glType = this.glslTypeToGL(glslType);
        const size = arraySize ? parseInt(arraySize, 10) : 1;
        if (arraySize) {
          // For arrays, WebGL returns the base name with [0]
          uniforms.push({ name: `${name}[0]`, type: glType, size });
        } else {
          uniforms.push({ name, type: glType, size: 1 });
        }
      }
    }

    return uniforms;
  }

  /**
   * Parse struct definitions from GLSL source
   * Returns a map of struct name -> array of {name, type} for each field
   */
  private parseStructDefinitions(source: string): Map<string, Array<{name: string, type: number}>> {
    const structs = new Map<string, Array<{name: string, type: number}>>();

    // Match struct definitions: struct Name { fields };
    const structRegex = /struct\s+(\w+)\s*\{([^}]+)\}/g;
    let structMatch;

    while ((structMatch = structRegex.exec(source)) !== null) {
      const [, structName, fieldsBlock] = structMatch;
      const fields: Array<{name: string, type: number}> = [];

      // Parse fields within the struct
      const fieldRegex = /(\w+)\s+(\w+)\s*;/g;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(fieldsBlock)) !== null) {
        const [, fieldType, fieldName] = fieldMatch;
        fields.push({
          name: fieldName,
          type: this.glslTypeToGL(fieldType)
        });
      }

      structs.set(structName, fields);
    }

    return structs;
  }

  /**
   * Convert GLSL type string to GL constant
   */
  private glslTypeToGL(glslType: string): number {
    switch (glslType) {
      case 'float': return this.FLOAT;
      case 'vec2': return this.FLOAT_VEC2;
      case 'vec3': return this.FLOAT_VEC3;
      case 'vec4': return this.FLOAT_VEC4;
      case 'int': return this.INT;
      case 'ivec2': return this.INT_VEC2;
      case 'ivec3': return this.INT_VEC3;
      case 'ivec4': return this.INT_VEC4;
      case 'bool': return this.BOOL;
      case 'mat2': return this.FLOAT_MAT2;
      case 'mat3': return this.FLOAT_MAT3;
      case 'mat4': return this.FLOAT_MAT4;
      case 'sampler2D': return this.SAMPLER_2D;
      case 'samplerCube': return this.SAMPLER_CUBE;
      case 'sampler3D': return this.SAMPLER_3D;
      default: return this.FLOAT;
    }
  }

  // Track attribute locations per program
  private attribLocationMap = new Map<number, Map<string, number>>();
  private nextAttribLocation = 0;
  // Track locations used by vertexAttribPointer (prevents mat4 column collisions)
  private usedAttribLocations = new Set<number>();

  bindAttribLocation(program: WebGLProgram, index: GLuint, name: string): void {
    const programId = (program as any).__tsyneId;

    // Update local tracking so getAttribLocation returns the correct value
    let programAttribs = this.attribLocationMap.get(programId);
    if (!programAttribs) {
      programAttribs = new Map<string, number>();
      this.attribLocationMap.set(programId, programAttribs);
    }
    programAttribs.set(name, index);

    this.pushCommand('bindAttribLocation', { programId, index, name });
  }

  getAttribLocation(program: WebGLProgram, name: string): GLint {
    const programId = (program as any).__tsyneId;

    // Get or create the location map for this program
    let programAttribs = this.attribLocationMap.get(programId);
    if (!programAttribs) {
      programAttribs = new Map<string, number>();
      this.attribLocationMap.set(programId, programAttribs);
    }

    // Check if we already have a location for this attribute
    let location = programAttribs.get(name);
    if (location === undefined) {
      // Assign a new location based on common attribute names
      switch (name) {
        case 'position':
        case 'aPosition':
          location = 0;
          break;
        case 'normal':
        case 'aNormal':
          location = 1;
          break;
        case 'uv':
        case 'aUv':
        case 'texcoord':
          location = 2;
          break;
        case 'color':
        case 'aColor':
          location = 3;
          break;
        default:
          // Use incrementing locations for unknown attributes
          location = this.nextAttribLocation++;
          // Skip common slots and locations already used (e.g. mat4 sub-columns)
          while (location <= 3 || this.usedAttribLocations.has(location)) {
            location = this.nextAttribLocation++;
          }
          // For mat4 attributes, reserve 4 consecutive locations
          const vertSrc = this.programVertexShaders.get(programId) || '';
          const attrTypeMatch = vertSrc.match(new RegExp(`(?:attribute|in)\\s+(mat4|mat3|mat2)\\s+${name}\\s*;`));
          if (attrTypeMatch) {
            const cols = attrTypeMatch[1] === 'mat4' ? 4 : attrTypeMatch[1] === 'mat3' ? 3 : 2;
            for (let c = 0; c < cols; c++) {
              this.usedAttribLocations.add(location + c);
            }
            // Advance nextAttribLocation past the reserved range
            if (this.nextAttribLocation <= location + cols) {
              this.nextAttribLocation = location + cols;
            }
          } else {
            this.usedAttribLocations.add(location);
          }
      }
      programAttribs.set(name, location);
    }

    // Send the location to the bridge so it knows the mapping
    this.pushCommand('getAttribLocation', { programId, name, location });

    return location;
  }

  // Catch-all for unimplemented methods (prevents runtime errors)
  [key: string]: any;
}

// Apply WebGL2 constants to the prototype
applyGLConstants(TsyneGLProxy.prototype);

/**
 * Encode buffer data for transmission.
 * Returns a Uint8Array which msgpack natively encodes as binary (bin type).
 */
export function encodeBufferData(data: ArrayBufferView | ArrayBuffer | number[]): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else if (Array.isArray(data)) {
    // Handle plain number arrays (common from three.js)
    const float32 = new Float32Array(data);
    return new Uint8Array(float32.buffer);
  } else {
    console.warn('[encodeBufferData] Unhandled data type:', typeof data);
    return new Uint8Array(0);
  }
}
