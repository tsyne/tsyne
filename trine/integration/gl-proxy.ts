/**
 * TsyneGLProxy - Fake WebGL2RenderingContext for Tsyne
 *
 * Implements the WebGL2RenderingContext interface by proxying all calls
 * to the Tsyne bridge, which executes them as native OpenGL calls.
 *
 * Uses a command buffer approach: GL calls are queued and sent as a batch
 * for performance (three.js makes hundreds of GL calls per frame).
 */

import { TsyneBridge, GLCommand } from './bridge';
import { TsyneCanvas } from './canvas';

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

  // ═══════════════════════════════════════════════════════════════
  // WebGL2 Constants
  // ═══════════════════════════════════════════════════════════════
  // These must match the values in the Go bridge

  // Buffer targets
  readonly ARRAY_BUFFER = 0x8892;
  readonly ELEMENT_ARRAY_BUFFER = 0x8893;
  readonly COPY_READ_BUFFER = 0x8f36;
  readonly COPY_WRITE_BUFFER = 0x8f37;
  readonly UNIFORM_BUFFER = 0x8a11;
  readonly PIXEL_PACK_BUFFER = 0x88eb;
  readonly PIXEL_UNPACK_BUFFER = 0x88ec;
  readonly TRANSFORM_FEEDBACK_BUFFER = 0x8c8e;

  // Buffer usage
  readonly STATIC_DRAW = 0x88e4;
  readonly DYNAMIC_DRAW = 0x88e8;
  readonly STREAM_DRAW = 0x88e0;
  readonly STATIC_READ = 0x8d17;
  readonly DYNAMIC_READ = 0x88e1;
  readonly STREAM_READ = 0x88e2;
  readonly STATIC_COPY = 0x88e5;
  readonly DYNAMIC_COPY = 0x88ea;
  readonly STREAM_COPY = 0x88e3;

  // Primitive modes
  readonly POINTS = 0x0000;
  readonly LINES = 0x0001;
  readonly LINE_LOOP = 0x0002;
  readonly LINE_STRIP = 0x0003;
  readonly TRIANGLES = 0x0004;
  readonly TRIANGLE_STRIP = 0x0005;
  readonly TRIANGLE_FAN = 0x0006;

  // Data types
  readonly BYTE = 0x1400;
  readonly UNSIGNED_BYTE = 0x1401;
  readonly SHORT = 0x1402;
  readonly UNSIGNED_SHORT = 0x1403;
  readonly INT = 0x1404;
  readonly UNSIGNED_INT = 0x1405;
  readonly FLOAT = 0x1406;
  readonly HALF_FLOAT = 0x140b;
  readonly DOUBLE = 0x140a;

  // Shader types
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPUTE_SHADER = 0x91b9;

  // Texture targets
  readonly TEXTURE_2D = 0x0de1;
  readonly TEXTURE_CUBE_MAP = 0x8513;
  readonly TEXTURE_3D = 0x806f;
  readonly TEXTURE_2D_ARRAY = 0x8c1a;
  readonly TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
  readonly TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
  readonly TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851a;

  // Texture parameters
  readonly TEXTURE_MAG_FILTER = 0x2800;
  readonly TEXTURE_MIN_FILTER = 0x2801;
  readonly TEXTURE_WRAP_S = 0x2802;
  readonly TEXTURE_WRAP_T = 0x2803;
  readonly TEXTURE_WRAP_R = 0x8072;
  readonly NEAREST = 0x2600;
  readonly LINEAR = 0x2601;
  readonly NEAREST_MIPMAP_NEAREST = 0x2700;
  readonly LINEAR_MIPMAP_NEAREST = 0x2701;
  readonly NEAREST_MIPMAP_LINEAR = 0x2702;
  readonly LINEAR_MIPMAP_LINEAR = 0x2703;
  readonly CLAMP_TO_EDGE = 0x812f;
  readonly CLAMP_TO_BORDER = 0x812d;
  readonly MIRRORED_REPEAT = 0x8370;
  readonly REPEAT = 0x2901;
  readonly MIRROR_CLAMP_TO_EDGE = 0x8743;

  // Texture formats
  readonly ALPHA = 0x1906;
  readonly RGB = 0x1907;
  readonly RGBA = 0x1908;
  readonly RED = 0x1903;
  readonly RG = 0x8227;
  readonly LUMINANCE = 0x1909;
  readonly LUMINANCE_ALPHA = 0x190a;
  readonly DEPTH_COMPONENT = 0x1902;
  readonly DEPTH_STENCIL = 0x84f9;

  // Framebuffer targets
  readonly FRAMEBUFFER = 0x8d40;
  readonly DRAW_FRAMEBUFFER = 0x8ca9;
  readonly READ_FRAMEBUFFER = 0x8ca8;
  readonly RENDERBUFFER = 0x8d41;

  // Framebuffer attachment points
  readonly COLOR_ATTACHMENT0 = 0x8ce0;
  readonly DEPTH_ATTACHMENT = 0x8d00;
  readonly STENCIL_ATTACHMENT = 0x8d20;
  readonly DEPTH_STENCIL_ATTACHMENT = 0x821a;

  // Framebuffer status
  readonly FRAMEBUFFER_COMPLETE = 0x8cd5;
  readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8cd6;
  readonly FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8cd7;
  readonly FRAMEBUFFER_INCOMPLETE_DRAW_BUFFER = 0x8cdb;
  readonly FRAMEBUFFER_INCOMPLETE_READ_BUFFER = 0x8cdc;
  readonly FRAMEBUFFER_UNSUPPORTED = 0x8cdd;
  readonly FRAMEBUFFER_INCOMPLETE_MULTISAMPLE = 0x8d56;

  // Blend functions
  readonly ZERO = 0;
  readonly ONE = 1;
  readonly SRC_COLOR = 0x0300;
  readonly ONE_MINUS_SRC_COLOR = 0x0301;
  readonly SRC_ALPHA = 0x0302;
  readonly ONE_MINUS_SRC_ALPHA = 0x0303;
  readonly DST_ALPHA = 0x0304;
  readonly ONE_MINUS_DST_ALPHA = 0x0305;
  readonly DST_COLOR = 0x0306;
  readonly ONE_MINUS_DST_COLOR = 0x0307;
  readonly SRC_ALPHA_SATURATE = 0x0308;

  // Blend equations
  readonly FUNC_ADD = 0x8006;
  readonly FUNC_SUBTRACT = 0x800a;
  readonly FUNC_REVERSE_SUBTRACT = 0x800b;
  readonly MIN = 0x8007;
  readonly MAX = 0x8008;

  // Capacity test
  readonly NEVER = 0x0200;
  readonly LESS = 0x0201;
  readonly EQUAL = 0x0202;
  readonly LEQUAL = 0x0203;
  readonly GREATER = 0x0204;
  readonly NOTEQUAL = 0x0205;
  readonly GEQUAL = 0x0206;
  readonly ALWAYS = 0x0207;

  // Stencil operations
  readonly KEEP = 0x1e00;
  readonly REPLACE = 0x1e01;
  readonly INCR = 0x1e02;
  readonly DECR = 0x1e03;
  readonly INVERT = 0x150a;
  readonly INCR_WRAP = 0x8507;
  readonly DECR_WRAP = 0x8508;

  // Face winding
  readonly CW = 0x0900;
  readonly CCW = 0x0901;

  // Capabilities
  readonly CULL_FACE = 0x0b44;
  readonly DEPTH_TEST = 0x0b71;
  readonly DEPTH_WRITE = 0x0b72;
  readonly DITHER = 0x0bd0;
  readonly POLYGON_OFFSET_FILL = 0x8037;
  readonly SAMPLE_ALPHA_TO_COVERAGE = 0x809e;
  readonly SAMPLE_COVERAGE = 0x80a0;
  readonly SCISSOR_TEST = 0x0c11;
  readonly STENCIL_TEST = 0x0b90;
  readonly BLEND = 0x0be2;

  // Error codes
  readonly NO_ERROR = 0x0000;
  readonly INVALID_ENUM = 0x0500;
  readonly INVALID_VALUE = 0x0501;
  readonly INVALID_OPERATION = 0x0502;
  readonly OUT_OF_MEMORY = 0x0505;

  // Uniform types
  readonly FLOAT_VEC2 = 0x8b50;
  readonly FLOAT_VEC3 = 0x8b51;
  readonly FLOAT_VEC4 = 0x8b52;
  readonly INT_VEC2 = 0x8b53;
  readonly INT_VEC3 = 0x8b54;
  readonly INT_VEC4 = 0x8b55;
  readonly BOOL = 0x8b56;
  readonly BOOL_VEC2 = 0x8b57;
  readonly BOOL_VEC3 = 0x8b58;
  readonly BOOL_VEC4 = 0x8b59;
  readonly FLOAT_MAT2 = 0x8b5a;
  readonly FLOAT_MAT3 = 0x8b5b;
  readonly FLOAT_MAT4 = 0x8b5c;
  readonly SAMPLER_2D = 0x8b5e;
  readonly SAMPLER_CUBE = 0x8b60;
  readonly SAMPLER_3D = 0x8b5f;
  readonly SAMPLER_2D_SHADOW = 0x8b62;
  readonly SAMPLER_2D_ARRAY = 0x8dc1;
  readonly SAMPLER_2D_ARRAY_SHADOW = 0x8dc4;
  readonly SAMPLER_CUBE_SHADOW = 0x8dc5;
  readonly INT_SAMPLER_2D = 0x8dca;
  readonly INT_SAMPLER_3D = 0x8dcb;
  readonly INT_SAMPLER_CUBE = 0x8dcc;
  readonly INT_SAMPLER_2D_ARRAY = 0x8dcf;
  readonly UNSIGNED_INT_SAMPLER_2D = 0x8dd2;
  readonly UNSIGNED_INT_SAMPLER_3D = 0x8dd3;
  readonly UNSIGNED_INT_SAMPLER_CUBE = 0x8dd4;
  readonly UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8dd7;

  // Active texture
  readonly TEXTURE0 = 0x84c0;
  readonly TEXTURE1 = 0x84c1;
  readonly TEXTURE2 = 0x84c2;
  readonly TEXTURE3 = 0x84c3;
  readonly TEXTURE4 = 0x84c4;
  readonly TEXTURE5 = 0x84c5;
  readonly TEXTURE6 = 0x84c6;
  readonly TEXTURE7 = 0x84c7;
  readonly TEXTURE8 = 0x84c8;
  readonly TEXTURE9 = 0x84c9;
  readonly TEXTURE10 = 0x84ca;
  readonly TEXTURE11 = 0x84cb;
  readonly TEXTURE12 = 0x84cc;
  readonly TEXTURE13 = 0x84cd;
  readonly TEXTURE14 = 0x84ce;
  readonly TEXTURE15 = 0x84cf;

  // Sized internal formats (for texStorage2D, renderbufferStorage, texImage2D)
  readonly R8 = 0x8229;
  readonly RGBA8 = 0x8058;
  readonly RGBA4 = 0x8056;
  readonly RGB5_A1 = 0x8057;
  readonly RGB565 = 0x8d62;
  readonly DEPTH_COMPONENT16 = 0x81a5;
  readonly DEPTH_COMPONENT24 = 0x81a6;
  readonly DEPTH_COMPONENT32F = 0x8cac;
  readonly DEPTH24_STENCIL8 = 0x88f0;
  readonly DEPTH32F_STENCIL8 = 0x8cad;

  // Color attachments (for MRT)
  readonly COLOR_ATTACHMENT1 = 0x8ce1;
  readonly COLOR_ATTACHMENT2 = 0x8ce2;
  readonly COLOR_ATTACHMENT3 = 0x8ce3;
  readonly NONE = 0;
  readonly BACK = 0x0405;

  // Clear buffer bit masks
  readonly COLOR_BUFFER_BIT = 0x00004000;
  readonly DEPTH_BUFFER_BIT = 0x00000100;
  readonly STENCIL_BUFFER_BIT = 0x00000400;

  // Buffer enum values for clearBuffer* methods
  readonly COLOR = 0x1800;
  readonly DEPTH = 0x1801;
  readonly STENCIL = 0x1802;

  // Additional sized internal formats (WebGL2)
  readonly R8I = 0x8231;
  readonly R8UI = 0x8232;
  readonly R16I = 0x8233;
  readonly R16UI = 0x8234;
  readonly R32I = 0x8235;
  readonly R32UI = 0x8236;
  readonly RG8I = 0x8237;
  readonly RG8UI = 0x8238;
  readonly RG16I = 0x8239;
  readonly RG16UI = 0x823a;
  readonly RG32I = 0x823b;
  readonly RG32UI = 0x823c;
  readonly RGBA8I = 0x8d8e;
  readonly RGBA8UI = 0x8d7c;
  readonly RGBA16I = 0x8d88;
  readonly RGBA16UI = 0x8d76;
  readonly RGBA32I = 0x8d82;
  readonly RGBA32UI = 0x8d70;
  readonly RGB8 = 0x8051;
  readonly SRGB8 = 0x8c41;
  readonly SRGB8_ALPHA8 = 0x8c43;
  readonly R16F = 0x822d;
  readonly RG16F = 0x822f;
  readonly RGB16F = 0x881b;
  readonly RGBA16F = 0x881a;
  readonly R32F = 0x822e;
  readonly RG32F = 0x8230;
  readonly RGB32F = 0x8815;
  readonly RGBA32F = 0x8814;
  readonly R11F_G11F_B10F = 0x8c3a;
  readonly RGB9_E5 = 0x8c3d;
  readonly RGB10_A2 = 0x8059;
  readonly RGB10_A2UI = 0x906f;
  readonly RED_INTEGER = 0x8d94;
  readonly RG_INTEGER = 0x8228;
  readonly RGB_INTEGER = 0x8d98;
  readonly RGBA_INTEGER = 0x8d99;

  // UBO-related constants
  readonly UNIFORM_BLOCK_BINDING = 0x8a3f;
  readonly UNIFORM_BLOCK_DATA_SIZE = 0x8a40;
  readonly UNIFORM_BLOCK_ACTIVE_UNIFORMS = 0x8a42;
  readonly UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES = 0x8a43;
  readonly UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER = 0x8a44;
  readonly UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER = 0x8a46;
  readonly INVALID_INDEX = 0xffffffff;

  // Transform feedback constants
  readonly INTERLEAVED_ATTRIBS = 0x8c8c;
  readonly SEPARATE_ATTRIBS = 0x8c8d;
  readonly TRANSFORM_FEEDBACK = 0x8e22;

  // Cull face modes
  readonly FRONT = 0x0404;
  readonly FRONT_AND_BACK = 0x0408;

  // Extensions
  readonly UNSIGNED_INT_24_8 = 0x84fa;
  readonly HALF_FLOAT_OES = 0x8d61;
  readonly UNSIGNED_SHORT_4_4_4_4 = 0x8033;
  readonly UNSIGNED_SHORT_5_5_5_1 = 0x8034;
  readonly UNSIGNED_SHORT_5_6_5 = 0x8363;

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
      console.error('Error flushing GL commands:', error);
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
    // This is a readback operation - for now, no-op since we can't synchronously return data
    // The Go bridge would need to fill dstBuffer, which requires async support
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

  getShaderParameter(shader: WebGLShader, pname: GLenum): any {
    // Would need sync call to bridge - for now return stub
    if (pname === 0x8b81) { // COMPILE_STATUS
      return true;
    }
    return null;
  }

  getShaderInfoLog(shader: WebGLShader): string {
    // Would need sync call - for now return empty
    return '';
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

  // Constants for program parameters
  readonly ACTIVE_ATTRIBUTES = 0x8b89;
  readonly ACTIVE_UNIFORMS = 0x8b86;
  readonly ACTIVE_UNIFORM_MAX_LENGTH = 0x8b87;
  readonly ACTIVE_ATTRIBUTE_MAX_LENGTH = 0x8b8a;
  readonly LINK_STATUS = 0x8b82;
  readonly VALIDATE_STATUS = 0x8b83;

  // Track vertex shader sources per program for attribute parsing
  private programVertexShaders = new Map<number, string>();

  getProgramParameter(program: WebGLProgram, pname: GLenum): any {
    const programId = (program as any).__tsyneId;

    if (pname === this.LINK_STATUS || pname === this.VALIDATE_STATUS) {
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

  getProgramInfoLog(program: WebGLProgram): string {
    return '';
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
          // Skip common slots if not used
          while (location <= 3) {
            location = this.nextAttribLocation++;
          }
      }
      programAttribs.set(name, location);
    }

    // Send the location to the bridge so it knows the mapping
    this.pushCommand('getAttribLocation', { programId, name, location });

    return location;
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIFORM OPERATIONS (continued)
  // ═══════════════════════════════════════════════════════════════

  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    const id = this.nextObjectId++;
    this.uniformLocations.set(id, { name });
    return { __tsyneId: id } as any;
  }

  // Helper to get uniform name from location ID
  private getUniformName(locId: number): string {
    const info = this.uniformLocations.get(locId);
    return info?.name || `u_uniform_${locId}`;
  }

  uniform1f(location: WebGLUniformLocation, x: GLfloat): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform1f', { locationId: locId, name: this.getUniformName(locId), x });
  }

  uniform2f(location: WebGLUniformLocation, x: GLfloat, y: GLfloat): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform2f', { locationId: locId, name: this.getUniformName(locId), x, y });
  }

  uniform3f(location: WebGLUniformLocation, x: GLfloat, y: GLfloat, z: GLfloat): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform3f', { locationId: locId, name: this.getUniformName(locId), x, y, z });
  }

  uniform4f(location: WebGLUniformLocation, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform4f', { locationId: locId, name: this.getUniformName(locId), x, y, z, w });
  }

  uniform1i(location: WebGLUniformLocation, x: GLint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform1i', { locationId: locId, name: this.getUniformName(locId), x });
  }

  uniform2i(location: WebGLUniformLocation, x: GLint, y: GLint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform2i', { locationId: locId, name: this.getUniformName(locId), x, y });
  }

  uniform3i(location: WebGLUniformLocation, x: GLint, y: GLint, z: GLint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform3i', { locationId: locId, name: this.getUniformName(locId), x, y, z });
  }

  uniform4i(location: WebGLUniformLocation, x: GLint, y: GLint, z: GLint, w: GLint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform4i', { locationId: locId, name: this.getUniformName(locId), x, y, z, w });
  }

  uniform1fv(location: WebGLUniformLocation, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform1fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform2fv(location: WebGLUniformLocation, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform2fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform3fv(location: WebGLUniformLocation, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform3fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform4fv(location: WebGLUniformLocation, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform4fv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform1iv(location: WebGLUniformLocation, data: Int32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform1iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform2iv(location: WebGLUniformLocation, data: Int32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform2iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform3iv(location: WebGLUniformLocation, data: Int32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform3iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform4iv(location: WebGLUniformLocation, data: Int32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform4iv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniformMatrix2fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix3fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix3fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix4fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix4fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIFORM BUFFER OBJECT (UBO) OPERATIONS (WebGL2)
  // ═══════════════════════════════════════════════════════════════

  getUniformBlockIndex(program: WebGLProgram, uniformBlockName: string): GLuint {
    // In real WebGL2 this returns the block index; we return a deterministic ID
    // based on the name so that uniformBlockBinding can reference it
    const programId = (program as any).__tsyneId;
    const key = `${programId}:${uniformBlockName}`;
    if (!this.uniformBlockIndices.has(key)) {
      this.uniformBlockIndices.set(key, this.nextUniformBlockIndex++);
    }
    return this.uniformBlockIndices.get(key)!;
  }

  uniformBlockBinding(program: WebGLProgram, uniformBlockIndex: GLuint, uniformBlockBinding: GLuint): void {
    const programId = (program as any).__tsyneId;
    this.pushCommand('uniformBlockBinding', { programId, uniformBlockIndex, uniformBlockBinding });
  }

  getActiveUniformBlockParameter(program: WebGLProgram, uniformBlockIndex: GLuint, pname: GLenum): any {
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
  }

  getActiveUniformBlockName(program: WebGLProgram, uniformBlockIndex: GLuint): string | null {
    // Would need sync call to bridge - return null for now
    return null;
  }

  // WebGL2 unsigned int uniform methods
  uniform1ui(location: WebGLUniformLocation, v0: GLuint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform1ui', { locationId: locId, name: this.getUniformName(locId), v0 });
  }

  uniform2ui(location: WebGLUniformLocation, v0: GLuint, v1: GLuint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform2ui', { locationId: locId, name: this.getUniformName(locId), v0, v1 });
  }

  uniform3ui(location: WebGLUniformLocation, v0: GLuint, v1: GLuint, v2: GLuint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform3ui', { locationId: locId, name: this.getUniformName(locId), v0, v1, v2 });
  }

  uniform4ui(location: WebGLUniformLocation, v0: GLuint, v1: GLuint, v2: GLuint, v3: GLuint): void {
    const locId = (location as any).__tsyneId;
    this.pushCommand('uniform4ui', { locationId: locId, name: this.getUniformName(locId), v0, v1, v2, v3 });
  }

  uniform1uiv(location: WebGLUniformLocation, data: Uint32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform1uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform2uiv(location: WebGLUniformLocation, data: Uint32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform2uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform3uiv(location: WebGLUniformLocation, data: Uint32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform3uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  uniform4uiv(location: WebGLUniformLocation, data: Uint32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniform4uiv', { locationId: locId, name: this.getUniformName(locId), data: encoded });
  }

  // WebGL2 matrix uniform methods (2x3, 2x4, 3x2, 3x4, 4x2, 4x3)
  uniformMatrix2x3fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix2x3fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix2x4fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix2x4fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix3x2fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix3x2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix3x4fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix3x4fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix4x2fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix4x2fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  uniformMatrix4x3fv(location: WebGLUniformLocation, transpose: GLboolean, data: Float32List): void {
    const locId = (location as any).__tsyneId;
    const encoded = encodeBufferData(data);
    this.pushCommand('uniformMatrix4x3fv', { locationId: locId, name: this.getUniformName(locId), transpose, data: encoded });
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXTURE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createTexture(): WebGLTexture | null {
    const id = this.nextObjectId++;
    this.textures.set(id, { id });
    this.pushCommand('createTexture', { textureId: id });
    return { __tsyneId: id } as any;
  }

  deleteTexture(texture: WebGLTexture | null): void {
    if (!texture) return;
    const id = (texture as any).__tsyneId;
    this.textures.delete(id);
    this.pushCommand('deleteTexture', { textureId: id });
  }

  bindTexture(target: GLenum, texture: WebGLTexture | null): void {
    const textureId = texture ? (texture as any).__tsyneId : 0;
    this.pushCommand('bindTexture', { target, textureId });
  }

  activeTexture(texture: GLenum): void {
    this.activeTextureUnit = texture - this.TEXTURE0;
    this.pushCommand('activeTexture', { texture });
  }

  texImage2D(
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
    let pixelData: string | null = null;
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
  }

  texSubImage2D(
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
    let pixelData: string | null = null;
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
  }

  copyTexImage2D(
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
  }

  copyTexSubImage2D(
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
  }

  texImage3D(
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
    let pixelData: string | null = null;
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
  }

  texSubImage3D(
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
    let pixelData: string | null = null;
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
  }

  texParameteri(target: GLenum, pname: GLenum, param: GLint): void {
    this.pushCommand('texParameteri', { target, pname, param });
  }

  texParameterf(target: GLenum, pname: GLenum, param: GLfloat): void {
    this.pushCommand('texParameterf', { target, pname, param });
  }

  generateMipmap(target: GLenum): void {
    this.pushCommand('generateMipmap', { target });
  }

  texStorage2D(
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
  }

  texStorage3D(
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
  }

  compressedTexImage2D(
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
  }

  compressedTexSubImage2D(
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
  }

  compressedTexImage3D(
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
  }

  compressedTexSubImage3D(
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
  }

  // ═══════════════════════════════════════════════════════════════
  // FRAMEBUFFER OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createFramebuffer(): WebGLFramebuffer | null {
    const id = this.nextObjectId++;
    this.framebuffers.set(id, { id });
    this.pushCommand('createFramebuffer', { framebufferId: id });
    return { __tsyneId: id } as any;
  }

  deleteFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (!framebuffer) return;
    const id = (framebuffer as any).__tsyneId;
    this.framebuffers.delete(id);
    this.pushCommand('deleteFramebuffer', { framebufferId: id });
  }

  bindFramebuffer(target: GLenum, framebuffer: WebGLFramebuffer | null): void {
    const framebufferId = framebuffer ? (framebuffer as any).__tsyneId : 0;
    this.pushCommand('bindFramebuffer', { target, framebufferId });
  }

  framebufferTexture2D(
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
  }

  checkFramebufferStatus(target: GLenum): GLenum {
    // Return a valid status for now - actual implementation would query the bridge
    return this.FRAMEBUFFER_COMPLETE;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDERBUFFER OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createRenderbuffer(): WebGLRenderbuffer | null {
    const id = this.nextObjectId++;
    this.renderbuffers.set(id, { id });
    this.pushCommand('createRenderbuffer', { renderbufferId: id });
    return { __tsyneId: id } as any;
  }

  deleteRenderbuffer(renderbuffer: WebGLRenderbuffer | null): void {
    if (!renderbuffer) return;
    const id = (renderbuffer as any).__tsyneId;
    this.renderbuffers.delete(id);
    this.pushCommand('deleteRenderbuffer', { renderbufferId: id });
  }

  bindRenderbuffer(target: GLenum, renderbuffer: WebGLRenderbuffer | null): void {
    const renderbufferId = renderbuffer ? (renderbuffer as any).__tsyneId : 0;
    this.pushCommand('bindRenderbuffer', { target, renderbufferId });
  }

  renderbufferStorage(target: GLenum, internalformat: GLenum, width: GLsizei, height: GLsizei): void {
    this.pushCommand('renderbufferStorage', { target, internalformat, width, height });
  }

  renderbufferStorageMultisample(
    target: GLenum,
    samples: GLsizei,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei
  ): void {
    this.pushCommand('renderbufferStorageMultisample', { target, samples, internalformat, width, height });
  }

  framebufferRenderbuffer(
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
  }

  drawBuffers(buffers: GLenum[]): void {
    // WebGL2 method to specify which color buffers to draw to
    // For now, just send to bridge - many cases work with default single buffer
    this.pushCommand('drawBuffers', { buffers });
  }

  readBuffer(src: GLenum): void {
    // WebGL2 method to specify read buffer for readPixels
    this.pushCommand('readBuffer', { src });
  }

  blitFramebuffer(
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
  }

  framebufferTextureLayer(
    target: GLenum,
    attachment: GLenum,
    texture: WebGLTexture | null,
    level: GLint,
    layer: GLint
  ): void {
    const textureId = texture ? (texture as any).__tsyneId : 0;
    this.pushCommand('framebufferTextureLayer', { target, attachment, textureId, level, layer });
  }

  invalidateFramebuffer(target: GLenum, attachments: GLenum[]): void {
    this.pushCommand('invalidateFramebuffer', { target, attachments });
  }

  invalidateSubFramebuffer(target: GLenum, attachments: GLenum[], x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
    this.pushCommand('invalidateSubFramebuffer', { target, attachments, x, y, width, height });
  }

  // ═══════════════════════════════════════════════════════════════
  // VERTEX ARRAY / ATTRIBUTE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  createVertexArray(): WebGLVertexArrayObject | null {
    const id = this.nextObjectId++;
    this.vertexArrays.set(id, { id });
    this.pushCommand('createVertexArray', { vaId: id });
    return { __tsyneId: id } as any;
  }

  deleteVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
    if (!vertexArray) return;
    const id = (vertexArray as any).__tsyneId;
    this.vertexArrays.delete(id);
    this.pushCommand('deleteVertexArray', { vaId: id });
  }

  bindVertexArray(array: WebGLVertexArrayObject | null): void {
    const vaId = array ? (array as any).__tsyneId : 0;
    this.pushCommand('bindVertexArray', { vaId });
  }

  enableVertexAttribArray(index: GLuint): void {
    this.pushCommand('enableVertexAttribArray', { index });
  }

  disableVertexAttribArray(index: GLuint): void {
    this.pushCommand('disableVertexAttribArray', { index });
  }

  vertexAttribPointer(
    index: GLuint,
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr
  ): void {
    this.pushCommand('vertexAttribPointer', {
      location: index,  // Go expects 'location', not 'index'
      size,
      type,
      normalized,
      stride,
      offset,
    });
  }

  vertexAttribIPointer(
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
  }

  vertexAttribDivisor(index: GLuint, divisor: GLuint): void {
    this.pushCommand('vertexAttribDivisor', { index, divisor });
  }

  // Constant attribute value methods (used when attribute is disabled)
  vertexAttrib1f(index: GLuint, x: GLfloat): void {
    this.pushCommand('vertexAttrib1f', { index, x });
  }

  vertexAttrib2f(index: GLuint, x: GLfloat, y: GLfloat): void {
    this.pushCommand('vertexAttrib2f', { index, x, y });
  }

  vertexAttrib3f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat): void {
    this.pushCommand('vertexAttrib3f', { index, x, y, z });
  }

  vertexAttrib4f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
    this.pushCommand('vertexAttrib4f', { index, x, y, z, w });
  }

  vertexAttrib1fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttrib1fv', { index, values: arr });
  }

  vertexAttrib2fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttrib2fv', { index, values: arr });
  }

  vertexAttrib3fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttrib3fv', { index, values: arr });
  }

  vertexAttrib4fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttrib4fv', { index, values: arr });
  }

  // Integer attribute methods (WebGL2)
  vertexAttribI4i(index: GLuint, x: GLint, y: GLint, z: GLint, w: GLint): void {
    this.pushCommand('vertexAttribI4i', { index, x, y, z, w });
  }

  vertexAttribI4iv(index: GLuint, values: Int32List): void {
    const arr = values instanceof Int32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttribI4iv', { index, values: arr });
  }

  vertexAttribI4ui(index: GLuint, x: GLuint, y: GLuint, z: GLuint, w: GLuint): void {
    this.pushCommand('vertexAttribI4ui', { index, x, y, z, w });
  }

  vertexAttribI4uiv(index: GLuint, values: Uint32List): void {
    const arr = values instanceof Uint32Array ? Array.from(values) : values;
    this.pushCommand('vertexAttribI4uiv', { index, values: arr });
  }

  // ═══════════════════════════════════════════════════════════════
  // DRAWING OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  drawArrays(mode: GLenum, first: GLint, count: GLsizei): void {
    this.pushCommand('drawArrays', { mode, first, count });
  }

  drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void {
    this.pushCommand('drawElements', { mode, count, type, offset });
  }

  drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instancecount: GLsizei): void {
    this.pushCommand('drawArraysInstanced', { mode, first, count, instancecount });
  }

  drawElementsInstanced(
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr,
    instancecount: GLsizei
  ): void {
    this.pushCommand('drawElementsInstanced', { mode, count, type, offset, instancecount });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  clear(mask: GLbitfield): void {
    this.pushCommand('clear', { mask });
  }

  clearColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
    this.pushCommand('clearColor', { red, green, blue, alpha });
  }

  clearDepth(depth: GLclampf): void {
    this.pushCommand('clearDepth', { depth });
  }

  clearStencil(s: GLint): void {
    this.pushCommand('clearStencil', { s });
  }

  // WebGL2 clear buffer methods (for MRT / integer framebuffers)
  clearBufferfv(buffer: GLenum, drawbuffer: GLint, values: Float32List, srcOffset?: GLuint): void {
    const encoded = encodeBufferData(values);
    this.pushCommand('clearBufferfv', { buffer, drawbuffer, values: encoded });
  }

  clearBufferiv(buffer: GLenum, drawbuffer: GLint, values: Int32List, srcOffset?: GLuint): void {
    const encoded = encodeBufferData(values);
    this.pushCommand('clearBufferiv', { buffer, drawbuffer, values: encoded });
  }

  clearBufferuiv(buffer: GLenum, drawbuffer: GLint, values: Uint32List, srcOffset?: GLuint): void {
    const encoded = encodeBufferData(values);
    this.pushCommand('clearBufferuiv', { buffer, drawbuffer, values: encoded });
  }

  clearBufferfi(buffer: GLenum, drawbuffer: GLint, depth: GLfloat, stencil: GLint): void {
    this.pushCommand('clearBufferfi', { buffer, drawbuffer, depth, stencil });
  }

  viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
    this.pushCommand('viewport', { x, y, width, height });
  }

  scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
    this.pushCommand('scissor', { x, y, width, height });
  }

  enable(cap: GLenum): void {
    this.pushCommand('enable', { cap });
  }

  disable(cap: GLenum): void {
    this.pushCommand('disable', { cap });
  }

  isEnabled(cap: GLenum): GLboolean {
    // Return a reasonable default - true implementation would query the bridge
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPTH & STENCIL OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  depthFunc(func: GLenum): void {
    this.pushCommand('depthFunc', { func });
  }

  depthMask(flag: GLboolean): void {
    this.pushCommand('depthMask', { flag });
  }

  colorMask(red: GLboolean, green: GLboolean, blue: GLboolean, alpha: GLboolean): void {
    this.pushCommand('colorMask', { red, green, blue, alpha });
  }

  depthRange(zNear: GLclampf, zFar: GLclampf): void {
    this.pushCommand('depthRange', { zNear, zFar });
  }

  stencilFunc(func: GLenum, ref: GLint, mask: GLuint): void {
    this.pushCommand('stencilFunc', { func, ref, mask });
  }

  stencilOp(fail: GLenum, zfail: GLenum, zpass: GLenum): void {
    this.pushCommand('stencilOp', { fail, zfail, zpass });
  }

  stencilMask(mask: GLuint): void {
    this.pushCommand('stencilMask', { mask });
  }

  // ═══════════════════════════════════════════════════════════════
  // BLENDING OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  blendColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
    this.pushCommand('blendColor', { red, green, blue, alpha });
  }

  blendEquation(mode: GLenum): void {
    this.pushCommand('blendEquation', { mode });
  }

  blendEquationSeparate(modeRGB: GLenum, modeAlpha: GLenum): void {
    this.pushCommand('blendEquationSeparate', { modeRGB, modeAlpha });
  }

  blendFunc(sfactor: GLenum, dfactor: GLenum): void {
    this.pushCommand('blendFunc', { sfactor, dfactor });
  }

  blendFuncSeparate(srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum): void {
    this.pushCommand('blendFuncSeparate', { srcRGB, dstRGB, srcAlpha, dstAlpha });
  }

  // ═══════════════════════════════════════════════════════════════
  // FACE & POLYGON OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  cullFace(mode: GLenum): void {
    this.pushCommand('cullFace', { mode });
  }

  frontFace(mode: GLenum): void {
    this.pushCommand('frontFace', { mode });
  }

  polygonOffset(factor: GLfloat, units: GLfloat): void {
    this.pushCommand('polygonOffset', { factor, units });
  }

  lineWidth(width: GLfloat): void {
    this.pushCommand('lineWidth', { width });
  }

  // ═══════════════════════════════════════════════════════════════
  // PIXEL OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  pixelStorei(pname: GLenum, param: GLint): void {
    this.pushCommand('pixelStorei', { pname, param });
  }

  readPixels(
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
  }

  // ═══════════════════════════════════════════════════════════════
  // ERROR & STATE QUERIES
  // ═══════════════════════════════════════════════════════════════

  getError(): GLenum {
    // Return NO_ERROR for now - real implementation would query the bridge
    return this.NO_ERROR;
  }

  getParameter(pname: GLenum): any {
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
      default:
        return null;
    }
  }

  getShaderPrecisionFormat(
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
  }

  getContextAttributes(): WebGLContextAttributes {
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
  }

  // Additional constants for getParameter
  readonly VERSION = 0x1f02;
  readonly VENDOR = 0x1f00;
  readonly RENDERER = 0x1f01;
  readonly SHADING_LANGUAGE_VERSION = 0x8b8c;
  readonly VIEWPORT = 0x0ba2;
  readonly SCISSOR_BOX = 0x0c44;
  readonly MAX_TEXTURE_SIZE = 0x0d33;
  readonly MAX_CUBE_MAP_TEXTURE_SIZE = 0x851c;
  readonly MAX_RENDERBUFFER_SIZE = 0x84e8;
  readonly MAX_VERTEX_ATTRIBS = 0x8869;
  readonly MAX_VERTEX_UNIFORM_VECTORS = 0x8dfb;
  readonly MAX_FRAGMENT_UNIFORM_VECTORS = 0x8dfd;
  readonly MAX_VARYING_VECTORS = 0x8dfc;
  readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8b4d;
  readonly MAX_TEXTURE_IMAGE_UNITS = 0x8872;
  readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8b4c;
  readonly COMPRESSED_TEXTURE_FORMATS = 0x86a3;

  // ═══════════════════════════════════════════════════════════════
  // EXTENSIONS & MISC
  // ═══════════════════════════════════════════════════════════════

  getExtension(name: string): any {
    // Return null for unsupported extensions for now
    // Can be extended to support specific extensions
    return null;
  }

  getSupportedExtensions(): string[] {
    return [];
  }

  hint(target: GLenum, mode: GLenum): void {
    this.pushCommand('hint', { target, mode });
  }

  setSize(width: number, height: number): void {
    (this as any).drawingBufferWidth = width;
    (this as any).drawingBufferHeight = height;
    // Update canvas dimensions directly (don't call canvas.setSize to avoid recursion)
    this.canvas.width = width;
    this.canvas.height = height;
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC OBJECTS (WebGL2)
  // ═══════════════════════════════════════════════════════════════

  readonly SYNC_GPU_COMMANDS_COMPLETE = 0x9117;
  readonly ALREADY_SIGNALED = 0x911a;
  readonly TIMEOUT_EXPIRED = 0x911b;
  readonly CONDITION_SATISFIED = 0x911c;
  readonly WAIT_FAILED = 0x911d;
  readonly SYNC_FLUSH_COMMANDS_BIT = 0x00000001;

  fenceSync(condition: GLenum, flags: GLbitfield): WebGLSync | null {
    const id = this.nextObjectId++;
    this.syncs.set(id, { id });
    this.pushCommand('fenceSync', { syncId: id, condition, flags });
    return { __tsyneId: id } as any;
  }

  deleteSync(sync: WebGLSync | null): void {
    if (!sync) return;
    const id = (sync as any).__tsyneId;
    this.syncs.delete(id);
    this.pushCommand('deleteSync', { syncId: id });
  }

  clientWaitSync(sync: WebGLSync, flags: GLbitfield, timeout: GLuint64): GLenum {
    // Cannot truly block in JS - return ALREADY_SIGNALED as optimistic stub
    return this.ALREADY_SIGNALED;
  }

  waitSync(sync: WebGLSync, flags: GLbitfield, timeout: GLint64): void {
    // Server-side wait - push command to bridge
    const syncId = (sync as any).__tsyneId;
    this.pushCommand('waitSync', { syncId, flags, timeout });
  }

  isSync(sync: WebGLSync | null): GLboolean {
    if (!sync) return false;
    const id = (sync as any).__tsyneId;
    return this.syncs.has(id);
  }

  getSyncParameter(sync: WebGLSync, pname: GLenum): any {
    // Would need sync call to bridge - return signaled for now
    if (pname === 0x9114) { // SYNC_STATUS
      return 0x9119; // SIGNALED
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // MISCELLANEOUS WebGL2 METHODS
  // ═══════════════════════════════════════════════════════════════

  getFragDataLocation(program: WebGLProgram, name: string): GLint {
    // Most programs use gl_FragColor / layout(location=0), return 0 as default
    return 0;
  }

  // Sampler objects (WebGL2)
  createSampler(): WebGLSampler | null {
    const id = this.nextObjectId++;
    this.samplers.set(id, { id });
    this.pushCommand('createSampler', { samplerId: id });
    return { __tsyneId: id } as any;
  }

  deleteSampler(sampler: WebGLSampler | null): void {
    if (!sampler) return;
    const id = (sampler as any).__tsyneId;
    this.samplers.delete(id);
    this.pushCommand('deleteSampler', { samplerId: id });
  }

  bindSampler(unit: GLuint, sampler: WebGLSampler | null): void {
    const samplerId = sampler ? (sampler as any).__tsyneId : 0;
    this.pushCommand('bindSampler', { unit, samplerId });
  }

  samplerParameteri(sampler: WebGLSampler, pname: GLenum, param: GLint): void {
    const samplerId = (sampler as any).__tsyneId;
    this.pushCommand('samplerParameteri', { samplerId, pname, param });
  }

  samplerParameterf(sampler: WebGLSampler, pname: GLenum, param: GLfloat): void {
    const samplerId = (sampler as any).__tsyneId;
    this.pushCommand('samplerParameterf', { samplerId, pname, param });
  }

  // Transform feedback (WebGL2)
  createTransformFeedback(): WebGLTransformFeedback | null {
    const id = this.nextObjectId++;
    this.transformFeedbacks.set(id, { id });
    this.pushCommand('createTransformFeedback', { tfId: id });
    return { __tsyneId: id } as any;
  }

  deleteTransformFeedback(tf: WebGLTransformFeedback | null): void {
    if (!tf) return;
    const id = (tf as any).__tsyneId;
    this.transformFeedbacks.delete(id);
    this.pushCommand('deleteTransformFeedback', { tfId: id });
  }

  bindTransformFeedback(target: GLenum, tf: WebGLTransformFeedback | null): void {
    const tfId = tf ? (tf as any).__tsyneId : 0;
    this.pushCommand('bindTransformFeedback', { target, tfId });
  }

  beginTransformFeedback(primitiveMode: GLenum): void {
    this.pushCommand('beginTransformFeedback', { primitiveMode });
  }

  endTransformFeedback(): void {
    this.pushCommand('endTransformFeedback', {});
  }

  transformFeedbackVaryings(program: WebGLProgram, varyings: string[], bufferMode: GLenum): void {
    const programId = (program as any).__tsyneId;
    this.pushCommand('transformFeedbackVaryings', { programId, varyings, bufferMode });
  }

  getTransformFeedbackVarying(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
    // Would need sync call to bridge - return null for now
    return null;
  }

  // Query objects (WebGL2)
  createQuery(): WebGLQuery | null {
    const id = this.nextObjectId++;
    this.queries.set(id, { id });
    this.pushCommand('createQuery', { queryId: id });
    return { __tsyneId: id } as any;
  }

  deleteQuery(query: WebGLQuery | null): void {
    if (!query) return;
    const id = (query as any).__tsyneId;
    this.queries.delete(id);
    this.pushCommand('deleteQuery', { queryId: id });
  }

  beginQuery(target: GLenum, query: WebGLQuery): void {
    const queryId = (query as any).__tsyneId;
    this.pushCommand('beginQuery', { target, queryId });
  }

  endQuery(target: GLenum): void {
    this.pushCommand('endQuery', { target });
  }

  getQueryParameter(query: WebGLQuery, pname: GLenum): any {
    // Would need sync call to bridge - return reasonable defaults
    if (pname === 0x8866) { // QUERY_RESULT
      return 0;
    }
    if (pname === 0x8867) { // QUERY_RESULT_AVAILABLE
      return true;
    }
    return null;
  }

  getQuery(target: GLenum, pname: GLenum): WebGLQuery | null {
    return null;
  }

  isQuery(query: WebGLQuery | null): GLboolean {
    if (!query) return false;
    const id = (query as any).__tsyneId;
    return this.queries.has(id);
  }

  // Additional WebGL1/2 state queries
  getRenderbufferParameter(target: GLenum, pname: GLenum): any {
    return null;
  }

  getTexParameter(target: GLenum, pname: GLenum): any {
    return null;
  }

  getUniform(program: WebGLProgram, location: WebGLUniformLocation): any {
    return null;
  }

  getVertexAttrib(index: GLuint, pname: GLenum): any {
    return null;
  }

  getVertexAttribOffset(index: GLuint, pname: GLenum): GLintptr {
    return 0;
  }

  isBuffer(buffer: WebGLBuffer | null): GLboolean {
    if (!buffer) return false;
    return this.buffers.has((buffer as any).__tsyneId);
  }

  isFramebuffer(framebuffer: WebGLFramebuffer | null): GLboolean {
    if (!framebuffer) return false;
    return this.framebuffers.has((framebuffer as any).__tsyneId);
  }

  isProgram(program: WebGLProgram | null): GLboolean {
    if (!program) return false;
    return this.programs.has((program as any).__tsyneId);
  }

  isRenderbuffer(renderbuffer: WebGLRenderbuffer | null): GLboolean {
    if (!renderbuffer) return false;
    return this.renderbuffers.has((renderbuffer as any).__tsyneId);
  }

  isShader(shader: WebGLShader | null): GLboolean {
    if (!shader) return false;
    return this.shaders.has((shader as any).__tsyneId);
  }

  isTexture(texture: WebGLTexture | null): GLboolean {
    if (!texture) return false;
    return this.textures.has((texture as any).__tsyneId);
  }

  isVertexArray(vertexArray: WebGLVertexArrayObject | null): GLboolean {
    if (!vertexArray) return false;
    return this.vertexArrays.has((vertexArray as any).__tsyneId);
  }

  isSampler(sampler: WebGLSampler | null): GLboolean {
    if (!sampler) return false;
    return this.samplers.has((sampler as any).__tsyneId);
  }

  isTransformFeedback(tf: WebGLTransformFeedback | null): GLboolean {
    if (!tf) return false;
    return this.transformFeedbacks.has((tf as any).__tsyneId);
  }

  // Stencil separate face operations
  stencilFuncSeparate(face: GLenum, func: GLenum, ref: GLint, mask: GLuint): void {
    this.pushCommand('stencilFuncSeparate', { face, func, ref, mask });
  }

  stencilOpSeparate(face: GLenum, sfail: GLenum, dpfail: GLenum, dppass: GLenum): void {
    this.pushCommand('stencilOpSeparate', { face, sfail, dpfail, dppass });
  }

  stencilMaskSeparate(face: GLenum, mask: GLuint): void {
    this.pushCommand('stencilMaskSeparate', { face, mask });
  }

  // WebGL2 getInternalformatParameter
  getInternalformatParameter(target: GLenum, internalformat: GLenum, pname: GLenum): any {
    // Return empty array for SAMPLES query
    if (pname === 0x80a9) { // SAMPLES
      return new Int32Array([4, 2]);
    }
    return null;
  }

  // Catch-all for unimplemented methods (prevents runtime errors)
  [key: string]: any;
}

/**
 * Encode buffer data for transmission
 */
function encodeBufferData(data: ArrayBufferView | ArrayBuffer | number[]): string {
  let buffer: ArrayBuffer;

  if (data instanceof ArrayBuffer) {
    buffer = data;
  } else if (ArrayBuffer.isView(data)) {
    buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } else if (Array.isArray(data)) {
    // Handle plain number arrays (common from three.js)
    const float32 = new Float32Array(data);
    buffer = float32.buffer;
  } else {
    console.warn('[encodeBufferData] Unhandled data type:', typeof data);
    return '';
  }

  // Convert to base64 for bridge transmission
  const view = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}
