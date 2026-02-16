# Three.js Integration Plan for Tsyne

## Overview

This document outlines the plan to integrate our fork of three.js (`three/`) with Tsyne's native canvas system. The goal is to run three.js scenes directly on Tsyne's Go/Fyne/OpenGL backend, bypassing the browser entirely.

## Key Insight: We Don't Have WebGL

**Important:** In Tsyne's npm/Node.js environment, there is no WebGL. There's no browser, no HTML canvas, no WebGL context. What we have is:

- **TypeScript side**: Pure Node.js - no graphics APIs at all
- **Go/Fyne side**: Native OpenGL (desktop) or OpenGL ES 3.0 (mobile)
- **Bridge**: msgpack/stdio protocol connecting the two

Three.js expects the WebGL2 API, which is just a JavaScript binding for OpenGL ES 3.0. Our strategy is to **implement a fake WebGL2 API in TypeScript** that proxies all calls to native OpenGL via the bridge.

```
three.js: gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
              ↓
TsyneGLProxy: serialize to bridge message
              ↓
Go bridge: receives message, calls gl.BindBuffer(gl.ARRAY_BUFFER, buffer)
              ↓
Native OpenGL: actual GPU operation
```

This is a **shim/proxy pattern** - the TypeScript side implements the WebGL2 interface but does zero graphics work. All real GL operations happen in Go.

## Architecture Summary

### Current State

**Three.js expects:**
- `document.createElement('canvas')` for canvas creation
- `canvas.getContext('webgl2')` for WebGL2 context
- Browser globals: `window`, `document`, `navigator`, `requestAnimationFrame`
- WebGL2 API (~150 methods) for all rendering

**Tsyne provides:**
- **No WebGL** - we're in Node.js, not a browser
- Go bridge with native OpenGL access via `setup-fyne-fork.sh` patches
- Current GL support: uniforms, textures, cubemaps, vertex buffers, element buffers
- GLSL 110 (desktop OpenGL) / GLSL ES (mobile OpenGL ES)

**What we're building:**
- **Fake browser globals** - shims for `document`, `window`, `requestAnimationFrame`
- **Fake WebGL2 context** - implements WebGL2RenderingContext interface, proxies to bridge
- **Extended Go bridge** - handlers for all GL operations three.js needs

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Three.js Application                      │
│  (Scene, Camera, Mesh, Material, Geometry, etc.)            │
├─────────────────────────────────────────────────────────────┤
│                    WebGLRenderer                             │
│  (unchanged three.js code - thinks it's talking to WebGL2)  │
├─────────────────────────────────────────────────────────────┤
│          Tsyne WebGL2 Proxy Layer (TypeScript)              │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│  │ TsyneCanvas │  │ TsyneGL2Proxy │  │ Browser Shims   │   │
│  │ (fake HTML  │  │ (implements   │  │ (document,      │   │
│  │  canvas)    │  │  WebGL2 API,  │  │  window, RAF)   │   │
│  │             │  │  proxies to   │  │                 │   │
│  │             │  │  bridge)      │  │                 │   │
│  └─────────────┘  └───────────────┘  └─────────────────┘   │
│                           ↓                                  │
│              Serializes GL calls to messages                 │
├─────────────────────────────────────────────────────────────┤
│                 Tsyne Bridge Protocol                        │
│  (TypeScript ↔ Go via msgpack/stdio)                        │
├─────────────────────────────────────────────────────────────┤
│              Go Bridge + Fyne Fork                           │
│  (receives messages, calls actual OpenGL)                   │
│  (setup-fyne-fork.sh patched GL layer)                      │
├─────────────────────────────────────────────────────────────┤
│                  Native OpenGL                               │
│  (Desktop: OpenGL 3.x via go-gl)                            │
│  (Mobile: OpenGL ES 3.0 via gomobile)                       │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works

WebGL2 is essentially a 1:1 JavaScript binding for OpenGL ES 3.0. The method names and semantics are nearly identical:

| WebGL2 (JavaScript)           | OpenGL (Go/C)                |
|------------------------------|------------------------------|
| `gl.bindBuffer(target, buf)` | `gl.BindBuffer(target, buf)` |
| `gl.bindTexture(target, tex)`| `gl.BindTexture(target, tex)`|
| `gl.drawArrays(mode, 0, n)`  | `gl.DrawArrays(mode, 0, n)`  |
| `gl.uniform4fv(loc, data)`   | `gl.Uniform4fv(loc, data)`   |

The main challenges are:
1. **Async vs sync**: Browser WebGL is synchronous; our bridge is async
2. **Object handles**: WebGL returns opaque objects; we track IDs across the bridge
3. **GLSL versions**: WebGL2 uses GLSL 300 ES; desktop OpenGL uses GLSL 110/130/etc.

---

## Phase 1: Browser API Shims

### 1.1 Create `three/src/tsyne/globals.ts`

Shim browser globals that three.js depends on:

```typescript
// Global shims for non-browser environment
export const tsyneDocument = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return new TsyneCanvas();
    throw new Error(`createElement('${tag}') not supported`);
  },
  createElementNS: (ns: string, tag: string) => {
    return tsyneDocument.createElement(tag);
  },
  body: {
    appendChild: () => {}, // no-op, Tsyne handles display
    removeChild: () => {},
  },
  head: {
    appendChild: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

export const tsyneWindow = {
  innerWidth: 800,   // Will be updated by Tsyne window
  innerHeight: 600,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb: FrameRequestCallback) => tsyneRAF(cb),
  cancelAnimationFrame: (id: number) => tsyneCancelRAF(id),
  performance: {
    now: () => Date.now(),
  },
  navigator: {
    userAgent: 'Tsyne/1.0',
    maxTouchPoints: 0,
  },
};
```

### 1.2 Patch `three/src/utils.js`

Modify `createCanvasElement()` and `createElementNS()` to use Tsyne shims:

```javascript
// At top of utils.js
import { tsyneDocument } from './tsyne/globals.js';
const _document = typeof document !== 'undefined' ? document : tsyneDocument;

function createElementNS(name) {
  return _document.createElementNS('http://www.w3.org/1999/xhtml', name);
}

function createCanvasElement() {
  const canvas = createElementNS('canvas');
  if (canvas.style) canvas.style.display = 'block';
  return canvas;
}
```

### 1.3 Animation Frame Handling

```typescript
// three/src/tsyne/animation.ts
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();
let animating = false;

export function tsyneRAF(callback: FrameRequestCallback): number {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  if (!animating) startAnimationLoop();
  return id;
}

export function tsyneCancelRAF(id: number): void {
  rafCallbacks.delete(id);
}

function startAnimationLoop() {
  animating = true;
  const tick = () => {
    if (rafCallbacks.size === 0) {
      animating = false;
      return;
    }
    const time = performance.now();
    for (const [id, cb] of rafCallbacks) {
      rafCallbacks.delete(id);
      cb(time);
    }
    // Bridge will call back for next frame
    tsyneBridge.requestFrame(tick);
  };
  tsyneBridge.requestFrame(tick);
}
```

---

## Phase 2: TsyneCanvas Implementation

### 2.1 Create `three/src/tsyne/TsyneCanvas.ts`

A **fake HTMLCanvasElement** that three.js can use. When `getContext('webgl2')` is called, it returns our `TsyneGLProxy` instead of a real WebGL2 context.

**Key points:**
- Looks like an HTMLCanvasElement to three.js
- `getContext('webgl2')` returns our proxy, not real WebGL
- Tells Go bridge to create a render surface for this canvas
- Event methods are stubs (we handle input differently in Tsyne)

```typescript
export class TsyneCanvas {
  width = 800;
  height = 600;
  style: Partial<CSSStyleDeclaration> = {};

  private glProxy: TsyneGLProxy | null = null;
  private bridgeCanvasId: string | null = null;

  getContext(contextType: string, attributes?: WebGLContextAttributes): TsyneGLProxy | null {
    if (contextType !== 'webgl2' && contextType !== 'webgl') {
      return null;
    }

    if (!this.glProxy) {
      // Tell Go to create a render surface
      this.bridgeCanvasId = tsyneBridge.createGLCanvas(this.width, this.height);
      // Return our proxy that implements WebGL2RenderingContext
      this.glProxy = new TsyneGLProxy(this.bridgeCanvasId, this.width, this.height, attributes);
    }

    return this.glProxy;
  }

  addEventListener(type: string, listener: EventListener): void {
    // Forward to bridge for mouse/touch events if needed
  }

  removeEventListener(type: string, listener: EventListener): void {}

  getBoundingClientRect(): DOMRect {
    return {
      x: 0, y: 0,
      width: this.width, height: this.height,
      top: 0, left: 0, right: this.width, bottom: this.height,
      toJSON: () => ({})
    };
  }
}
```

---

## Phase 3: WebGL2 Proxy Implementation

### 3.1 Create `three/src/tsyne/TsyneGLProxy.ts`

This is the core integration layer - a **fake WebGL2RenderingContext** that implements the WebGL2 interface but does no actual GL work. Every method serializes its arguments and sends them to the Go bridge, where real OpenGL calls happen.

**Key design points:**
- Implements `WebGL2RenderingContext` interface so three.js thinks it's real WebGL2
- All GL objects (buffers, textures, shaders, etc.) are represented by local integer IDs
- Methods are mostly fire-and-forget (async to bridge)
- Some methods need sync responses (getParameter, getError) - these block on bridge

```typescript
export class TsyneGLProxy implements WebGL2RenderingContext {
  readonly canvas: TsyneCanvas;
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;

  private bridgeId: string;
  private nextId = 1;

  // Command buffer - accumulate GL commands, send as batch
  private commandBuffer: GLCommand[] = [];
  private needsFlush = false;

  // WebGL constants (subset - add as needed)
  readonly ELEMENT_ARRAY_BUFFER = 0x8893;
  readonly STATIC_DRAW = 0x88E4;
  readonly DYNAMIC_DRAW = 0x88E8;
  readonly TRIANGLES = 0x0004;
  readonly FLOAT = 0x1406;
  readonly UNSIGNED_SHORT = 0x1403;
  readonly FRAGMENT_SHADER = 0x8B30;
  readonly VERTEX_SHADER = 0x8B31;
  // ... ~200 more constants

  private bridgeId: string;
  private nextId = 1;

  constructor(bridgeId: string, width: number, height: number, attributes?: WebGLContextAttributes) {
    this.bridgeId = bridgeId;
    this.drawingBufferWidth = width;
    this.drawingBufferHeight = height;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMAND BUFFER APPROACH
  // ═══════════════════════════════════════════════════════════════
  // Instead of sending each GL call over the bridge immediately,
  // we buffer commands and flush them as a batch. This is critical
  // for performance - three.js makes hundreds of GL calls per frame.

  private pushCommand(cmd: string, args: any): void {
    this.commandBuffer.push({ cmd, args });
    this.needsFlush = true;
  }

  // Called at end of render() or explicitly
  flush(): void {
    if (!this.needsFlush) return;
    tsyneBridge.send('gl_executeBatch', {
      canvasId: this.bridgeId,
      commands: this.commandBuffer
    });
    this.commandBuffer = [];
    this.needsFlush = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // BUFFER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  createBuffer(): WebGLBuffer {
    const id = this.nextId++;
    this.pushCommand('createBuffer', { bufferId: id });
    return { __tsyneId: id } as WebGLBuffer;
  }

  bindBuffer(target: GLenum, buffer: WebGLBuffer | null): void {
    this.pushCommand('bindBuffer', {
      target,
      bufferId: buffer ? (buffer as any).__tsyneId : 0
    });
  }

  bufferData(target: GLenum, srcData: BufferSource | number, usage: GLenum): void {
    this.pushCommand('bufferData', {
      target,
      data: encodeBufferData(srcData),  // Convert to transferable format
      usage
    });
  }

  // Shader management
  createShader(type: GLenum): WebGLShader {
    const id = this.nextId++;
    tsyneBridge.send('gl_createShader', { canvasId: this.bridgeId, shaderId: id, type });
    return { __tsyneId: id } as WebGLShader;
  }

  shaderSource(shader: WebGLShader, source: string): void {
    tsyneBridge.send('gl_shaderSource', {
      canvasId: this.bridgeId,
      shaderId: (shader as any).__tsyneId,
      source
    });
  }

  compileShader(shader: WebGLShader): void {
    tsyneBridge.send('gl_compileShader', {
      canvasId: this.bridgeId,
      shaderId: (shader as any).__tsyneId
    });
  }

  // Program management
  createProgram(): WebGLProgram {
    const id = this.nextId++;
    tsyneBridge.send('gl_createProgram', { canvasId: this.bridgeId, programId: id });
    return { __tsyneId: id } as WebGLProgram;
  }

  attachShader(program: WebGLProgram, shader: WebGLShader): void {
    tsyneBridge.send('gl_attachShader', {
      canvasId: this.bridgeId,
      programId: (program as any).__tsyneId,
      shaderId: (shader as any).__tsyneId
    });
  }

  linkProgram(program: WebGLProgram): void {
    tsyneBridge.send('gl_linkProgram', {
      canvasId: this.bridgeId,
      programId: (program as any).__tsyneId
    });
  }

  useProgram(program: WebGLProgram | null): void {
    tsyneBridge.send('gl_useProgram', {
      canvasId: this.bridgeId,
      programId: program ? (program as any).__tsyneId : 0
    });
  }

  // Drawing
  drawArrays(mode: GLenum, first: GLint, count: GLsizei): void {
    tsyneBridge.send('gl_drawArrays', {
      canvasId: this.bridgeId,
      mode, first, count
    });
  }

  drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void {
    tsyneBridge.send('gl_drawElements', {
      canvasId: this.bridgeId,
      mode, count, type, offset
    });
  }

  // Textures
  createTexture(): WebGLTexture {
    const id = this.nextId++;
    tsyneBridge.send('gl_createTexture', { canvasId: this.bridgeId, textureId: id });
    return { __tsyneId: id } as WebGLTexture;
  }

  bindTexture(target: GLenum, texture: WebGLTexture | null): void {
    tsyneBridge.send('gl_bindTexture', {
      canvasId: this.bridgeId,
      target,
      textureId: texture ? (texture as any).__tsyneId : 0
    });
  }

  texImage2D(target: GLenum, level: GLint, internalformat: GLint,
             width: GLsizei, height: GLsizei, border: GLint,
             format: GLenum, type: GLenum, pixels: ArrayBufferView | null): void {
    tsyneBridge.send('gl_texImage2D', {
      canvasId: this.bridgeId,
      target, level, internalformat, width, height, border, format, type,
      pixels: pixels ? encodeBufferData(pixels) : null
    });
  }

  // Uniforms
  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
    const id = this.nextId++;
    tsyneBridge.send('gl_getUniformLocation', {
      canvasId: this.bridgeId,
      programId: (program as any).__tsyneId,
      name,
      locationId: id
    });
    return { __tsyneId: id, __name: name } as WebGLUniformLocation;
  }

  uniform1f(location: WebGLUniformLocation, x: GLfloat): void {
    tsyneBridge.send('gl_uniform1f', {
      canvasId: this.bridgeId,
      locationId: (location as any).__tsyneId,
      x
    });
  }

  uniform2f(location: WebGLUniformLocation, x: GLfloat, y: GLfloat): void {
    tsyneBridge.send('gl_uniform2f', {
      canvasId: this.bridgeId,
      locationId: (location as any).__tsyneId,
      x, y
    });
  }

  // ... ~150 more methods

  getContextAttributes(): WebGLContextAttributes {
    return { alpha: true, depth: true, stencil: false, antialias: false };
  }

  getExtension(name: string): any {
    // Return null or stub extensions as needed
    return null;
  }

  getParameter(pname: GLenum): any {
    // Many parameters can be returned synchronously from cached state
    // Others may need bridge round-trip
    return tsyneBridge.sendSync('gl_getParameter', {
      canvasId: this.bridgeId,
      pname
    });
  }
}
```

---

## Phase 4: Go Bridge Extensions

### 4.1 Extend `setup-fyne-fork.sh`

Add full WebGL2 command set to the Go bridge. Current support includes basic operations; we need:

**Already implemented:**
- `Uniform1i`, `Uniform2f`, `Uniform3f`, `Uniform4f`
- `CreateBuffer`, `BindBuffer`, `BufferData`
- `DrawArrays`, `DrawElements`
- `CreateShader`, `CompileShader`, `ShaderSource`
- `CreateProgram`, `LinkProgram`, `UseProgram`, `AttachShader`
- `EnableVertexAttribArray`, `DisableVertexAttribArray`, `VertexAttribPointer`
- Texture operations (2D, cubemap)

**Need to add:**
- `createVertexArray`, `bindVertexArray` (VAOs)
- `createFramebuffer`, `bindFramebuffer`, `framebufferTexture2D`
- `createRenderbuffer`, `bindRenderbuffer`, `renderbufferStorage`
- `uniformMatrix4fv`, `uniformMatrix3fv`
- `blendFuncSeparate`, `blendEquation`, `blendEquationSeparate`
- `depthFunc`, `depthMask`, `depthRange`
- `stencilFunc`, `stencilOp`, `stencilMask`
- `cullFace`, `frontFace`
- `polygonOffset`
- `scissor`, `viewport`
- `colorMask`
- `pixelStorei`
- `generateMipmap`
- `getShaderInfoLog`, `getProgramInfoLog`
- `getShaderParameter`, `getProgramParameter`
- `getActiveUniform`, `getActiveAttrib`
- `readPixels` (for picking/screenshots)
- `flush`, `finish`

### 4.2 Create `core/bridge/handlers_gl.go`

The Go side receives batched commands from TypeScript and executes them as native OpenGL calls.

```go
package bridge

// GLCanvasState tracks state for a Three.js GL canvas
type GLCanvasState struct {
    ID          string
    Width       int
    Height      int
    Programs    map[int]gl.Program
    Shaders     map[int]gl.Shader
    Buffers     map[int]gl.Buffer
    Textures    map[int]gl.Texture
    Uniforms    map[int]gl.Uniform
    VAOs        map[int]gl.VertexArray
}

// handleGLExecuteBatch processes a batch of GL commands
// This is the main entry point - TypeScript sends batches, not individual calls
func (b *Bridge) handleGLExecuteBatch(msg *Message) (interface{}, error) {
    canvasId := msg.Payload["canvasId"].(string)
    commands := msg.Payload["commands"].([]interface{})

    canvas := b.glCanvases[canvasId]

    for _, cmdRaw := range commands {
        cmd := cmdRaw.(map[string]interface{})
        cmdName := cmd["cmd"].(string)
        args := cmd["args"].(map[string]interface{})

        switch cmdName {
        case "createBuffer":
            bufferId := int(args["bufferId"].(float64))
            canvas.Buffers[bufferId] = gl.CreateBuffer()

        case "bindBuffer":
            target := uint32(args["target"].(float64))
            bufferId := int(args["bufferId"].(float64))
            if bufferId == 0 {
                gl.BindBuffer(target, gl.Buffer{})
            } else {
                gl.BindBuffer(target, canvas.Buffers[bufferId])
            }

        case "bufferData":
            target := uint32(args["target"].(float64))
            data := decodeBufferData(args["data"])
            usage := uint32(args["usage"].(float64))
            gl.BufferData(target, len(data), gl.Ptr(data), usage)

        case "drawArrays":
            mode := uint32(args["mode"].(float64))
            first := int32(args["first"].(float64))
            count := int32(args["count"].(float64))
            gl.DrawArrays(mode, first, count)

        // ... ~100 more command handlers
        }
    }

    return nil, nil
}
```

---

## Phase 5: GLSL Shader Compatibility

### 5.1 Shader Version Conversion

Three.js uses GLSL 300 es (WebGL2). Tsyne's Go/Fyne uses GLSL 110 (desktop) or GLES.

Create a shader transpiler or compatibility layer:

```typescript
// three/src/tsyne/ShaderConverter.ts
export function convertToGLSL110(glsl300Source: string): string {
  let source = glsl300Source;

  // Remove version directive
  source = source.replace(/#version 300 es\s*/g, '');

  // Convert precision qualifiers (not needed in desktop GLSL)
  source = source.replace(/precision\s+(highp|mediump|lowp)\s+\w+;\s*/g, '');

  // Convert in/out to varying/attribute
  source = source.replace(/\bin\s+/g, 'attribute ');  // vertex inputs
  source = source.replace(/\bout\s+/g, 'varying ');    // vertex outputs
  source = source.replace(/\bin\s+/g, 'varying ');     // fragment inputs

  // Convert texture() to texture2D()
  source = source.replace(/texture\s*\(/g, 'texture2D(');

  // Convert textureCube to textureCube (no change, but verify)

  // Handle fragment output (gl_FragColor vs out vec4)
  source = source.replace(/out\s+vec4\s+(\w+);/g, '');
  source = source.replace(/\b(\w+)\s*=/g, (match, name) => {
    // Replace fragment output variable with gl_FragColor
    return 'gl_FragColor =';
  });

  return '#version 110\n' + source;
}
```

### 5.2 Alternative: Use ANGLE for shader translation

Consider using ANGLE's shader translator if available, or implementing key GLSL 300 ES features as GLSL 110 equivalents.

---

## Phase 6: Fork Maintenance Strategy

### 6.1 Minimal Fork Divergence

**Files to modify in three/:**
1. `src/utils.js` - Canvas creation shim
2. `src/Three.js` - Add Tsyne exports
3. `src/tsyne/` (NEW) - All Tsyne-specific code

**Files to NOT modify:**
- All core three.js functionality (math, geometry, materials, etc.)
- WebGLRenderer.js (it should work via our WebGL2 shim)
- Any shader code (handle in transpiler layer)

### 6.2 Upstream Sync Strategy

```bash
# Add upstream remote
git remote add upstream https://github.com/mrdoob/three.js.git

# Fetch upstream changes
git fetch upstream

# Create merge branch
git checkout -b sync-upstream-rXXX

# Three-way merge
git merge upstream/master

# Resolve conflicts (mainly in utils.js and any patched files)
# Test thoroughly
# Merge to main
```

### 6.3 Version Pinning

Pin to stable three.js releases (e.g., r170). Update periodically:

```json
// three/package.json
{
  "name": "@tsyne/three",
  "version": "0.170.0-tsyne.1",
  "three-upstream-version": "r170"
}
```

---

## Phase 7: Implementation Order

### Sprint 1: Foundation ✅ COMPLETE
- [x] Create `three/src/tsyne/` directory structure
- [x] Implement browser shims (document, window, RAF) - **globals.ts created**
- [x] Create TsyneCanvas basic implementation - **canvas.ts created**
- [x] Patch utils.js for canvas creation - **deferred to Phase 6**
- [x] Create integration index.ts - **index.ts created**

### Sprint 2: WebGL2 Core ✅ MOSTLY COMPLETE
- [x] Implement TsyneGLProxy with essential methods - **gl-proxy.ts ~500+ lines**
  - [x] All ~150 WebGL2 constants defined
  - [x] Buffer operations (create, delete, bind, bufferData, bufferSubData)
  - [x] Shader operations (create, delete, source, compile)
  - [x] Program operations (create, delete, attach, detach, link, use)
  - [x] Uniform operations (all float/int/matrix variants)
  - [x] Drawing operations (drawArrays, drawElements, instanced variants)
  - [x] Texture operations (create, delete, bind, active, texImage2D, texSubImage2D, parameters, generateMipmap)
  - [x] Framebuffer/Renderbuffer operations
  - [x] VAO operations (create, delete, bind, enable/disable attribs, vertexAttribPointer)
  - [x] State operations (clear, viewport, scissor, enable, disable)
  - [x] Depth/Stencil operations (depthFunc, stencilFunc, depthMask, etc.)
  - [x] Blending operations (blendColor, blendFunc, blendEquation, etc.)
  - [x] Face/Polygon operations (cullFace, frontFace, lineWidth, polygonOffset)
  - [x] Pixel operations (pixelStorei, readPixels)
  - [x] Query operations (getParameter with defaults, getError)
- [x] Add Go bridge handlers for basic operations - **handlers_gl.go created**
  - [x] handleCreateGLCanvas - creates GL canvas on bridge
  - [x] handleExecuteBatch - processes batched GL commands
  - [x] handleGetParameter - returns GL parameter values
  - [x] handleGetError - returns GL error state
  - [x] Command dispatcher with ~50+ command types
  - [x] Base implementations for all command types (stubs for GPU work)
- [x] Add Go bridge handler routes to main.go - **4 routes added**
- [x] Command buffer infrastructure in TsyneGLProxy - **pushCommand/flush pattern**
- [x] Test with simple triangle rendering - **DONE** (raw_triangle.ts + webgl_basic_test.ts)

### Sprint 3: Extended WebGL2 ✅ COMPLETE
- [x] Add texture support (implemented in gl-proxy.ts)
- [x] Add framebuffer/renderbuffer support (implemented in gl-proxy.ts)
- [x] Add VAO support (implemented in gl-proxy.ts)
- [x] Implement uniform matrix operations (implemented in gl-proxy.ts)
- [x] Integrated with Fyne's Shader canvas - **handlers_gl.go refactored**
- [x] Widget hierarchy support - **GLCanvas is fyne.CanvasObject**

### Sprint 4: Shader Compatibility ✅ COMPLETE
- [x] Implement GLSL 300 ES → GLSL 110 converter - **shader_converter.go created**
- [x] TypeScript utilities for shader conversion - **shader-converter.ts created**
- [x] Auto-detection of required extensions
- [x] Integration with glLinkProgram()
- [x] Handles vertex/fragment shader differences

### Sprint 5: Integration Testing ✅ COMPLETE
- [x] Comprehensive test suite - **test-integration.ts created**
- [x] Test basic GL command flow
- [x] Test shader operations
- [x] Test texture operations
- [x] Test vertex array operations
- [x] MockBridgeTransport for testing without IPC
- [x] Validation of command structure and batching

### Sprint 5b: First Real Render ✅ COMPLETE

The Go-side handlers in `handlers_gl.go` turned out to be a **metadata accumulation layer** (not stubs) that pushes data to Fyne's Shader canvas. The Fyne fork's `shader_painter.go` does the real GL calls. The pipeline works end-to-end.

- [x] Wire up real GL calls in `handlers_gl.go` — already connected via Fyne Shader canvas
- [x] Verify GLSL 300 ES → GLSL 110 conversion works at runtime against a real GPU
- [x] Confirm command batching round-trip: TS serializes → Go deserializes → GL executes → pixels appear
- [x] Raw triangle test (no Three.js): `examples/raw_triangle.ts` — red triangle on black background ✅
- [x] Screenshot test to verify output — `examples/screenshots/raw_triangle-t0.png` ✅
- [x] Three.js basic test: `examples/webgl_basic_test.ts` — 3 colored rotating cubes ✅
- [x] Three.js screenshots: `examples/screenshots/webgl_basic_test-t0.png`, `webgl_basic_test-t1000.png` ✅

### Sprint 6: Fork Maintenance ✅ COMPLETE
- [x] Patch three.js utils.js for Tsyne integration — `setup-three.sh` applies `patches/utils.js.patch` (canvas factory hook)
- [x] Add Tsyne exports to three.js main — kept separate in `trine/integration/` (correct design: no fork pollution)
- [x] Upstream sync strategy — documented in plan doc (Phase 6); three.js uses `dev` branch, no release tags
- [x] Version pinning — `setup-three.sh` pins to `dev` branch, checks cloned version against tested `0.182.0`

### Sprint 7: Advanced Materials (MeshPhongMaterial + Lighting) ✅ COMPLETE

- [x] MeshPhongMaterial with Blinn-Phong shading renders correctly
- [x] AmbientLight, PointLight, DirectionalLight all working
- [x] VAO (Vertex Array Object) tracking implemented in Go bridge
  - Root cause: Three.js uses `bindVertexArray` to restore buffer bindings on subsequent frames; Go side was ignoring these commands, causing all geometries to render with the last buffer's index data
  - Fix: Track VAO state (attrib bindings, attrib locations, element buffer) and restore on `bindVertexArray`
- [x] Multi-geometry scenes render correctly (16 different geometry types in `webgl_geometries`)
- [x] Vertex colors work with MeshPhongMaterial (`webgl_buffergeometry_indexed`)
- [x] Complex Phong shaders (~47KB fragment, ~22KB vertex) compile and render
- [x] Structured uniforms (`pointLights[0].color`, `ambientLightColor`, etc.) work correctly
- [x] Updated `webgl_buffergeometry_indexed.ts` from MeshBasicMaterial wireframe to MeshPhongMaterial with lighting
- [x] Debug logging cleaned up

### Sprint 8: Production Integration ⏳ FUTURE
- [ ] Full three.js scene rendering (more complex examples)
- [ ] Performance profiling
- [ ] Error handling and recovery
- [ ] Documentation and examples

---

## Architectural Breakthrough: Fyne Integration

### Phase 4 Insight

**Problem**: We initially tried to create a separate OpenGL context in the bridge handlers, duplicating Fyne's GL infrastructure.

**Solution**: Leverage Fyne's existing Shader canvas primitive (injected by setup-fyne-fork.sh):
```
Three.js → Bridge Handlers → Fyne Shader Canvas → Fyne Painter → Native OpenGL
```

**Key Benefits**:
1. No GL context duplication
2. GL operations map cleanly to Shader methods
3. GLCanvas integrates into Fyne widget hierarchy
4. Coexists with normal UI widgets in containers

**Implementation**:
- GLCanvas wraps `canvas.Shader` from setup-fyne-fork.sh
- GL commands map to Shader operations:
  - `shaderSource()` → `SetSource()`
  - `bufferData()` → `SetVertices()/SetIndices()`
  - `uniform*()` → `SetUniform()`
  - `drawArrays/Elements()` → `Refresh()`
- Local state tracking for JS-side IDs
- Batch accumulation and deferred execution

---

## Current Implementation Status (As of Latest Work)

### Files Created/Modified

#### TypeScript Side (three/src/tsyne/)

**globals.ts** (~450 lines)
- `tsyneDocument`: Fake HTMLDocument with createElement, createElementNS, body, head stubs
- `tsyneWindow`: Fake Window object with innerWidth/Height, devicePixelRatio, navigator, performance, crypto stubs
- `requestAnimationFrame`/`cancelAnimationFrame`: Frame request queuing system
- `injectGlobals()`: Injects shims into globalThis for three.js to find them
- In-memory localStorage/sessionStorage implementation

**bridge.ts** (~150 lines)
- `TsyneBridge`: Main communication class for TypeScript ↔ Go bridge
- `send()`: Async message with response timeout handling
- `sendAsync()`: Fire-and-forget messages
- `createGLCanvas()`: Creates GL canvas on bridge
- `executeBatch()`: Sends batched GL commands
- `getParameter()` / `getError()`: Query GL state
- Pending response tracking with 5-second timeout

**canvas.ts** (~210 lines)
- `TsyneCanvas`: Fake HTMLCanvasElement
- `getContext('webgl2')`: Returns TsyneGLProxy instead of real WebGL
- Canvas dimensions, style, className, id
- Event listener stubs (addEventListener, removeEventListener, dispatchEvent)
- `getBoundingClientRect()`: Returns canvas dimensions as DOMRect
- `setSize()`: Updates canvas dimensions
- Lazy bridge canvas creation via `getBridgeCanvasId()`

**gl-proxy.ts** (~900 lines)
- `TsyneGLProxy`: Fake WebGL2RenderingContext
- **~150 WebGL2 constants**: All buffer, texture, primitive, blend, test constants
- **Buffer operations** (8 methods): createBuffer, deleteBuffer, bindBuffer, bufferData, bufferSubData, + state tracking
- **Shader operations** (5 methods): createShader, deleteShader, shaderSource, compileShader, getShaderParameter, getShaderInfoLog
- **Program operations** (7 methods): createProgram, deleteProgram, attachShader, detachShader, linkProgram, useProgram, getProgramParameter, getProgramInfoLog, getAttribLocation
- **Uniform operations** (15 methods): getUniformLocation, uniform1f/2f/3f/4f/1i/2i/3i/4i, uniform*v variants (1-4fv/1-4iv), uniformMatrix2fv/3fv/4fv
- **Texture operations** (9 methods): createTexture, deleteTexture, bindTexture, activeTexture, texImage2D, texSubImage2D, texParameteri/f, generateMipmap
- **Framebuffer operations** (4 methods): createFramebuffer, deleteFramebuffer, bindFramebuffer, framebufferTexture2D, checkFramebufferStatus
- **Renderbuffer operations** (5 methods): createRenderbuffer, deleteRenderbuffer, bindRenderbuffer, renderbufferStorage, framebufferRenderbuffer
- **VAO operations** (7 methods): createVertexArray, deleteVertexArray, bindVertexArray, enableVertexAttribArray, disableVertexAttribArray, vertexAttribPointer, vertexAttribDivisor
- **Drawing operations** (4 methods): drawArrays, drawElements, drawArraysInstanced, drawElementsInstanced
- **State operations** (9 methods): clear, clearColor, clearDepth, clearStencil, viewport, scissor, enable, disable, isEnabled
- **Depth/Stencil operations** (6 methods): depthFunc, depthMask, depthRange, stencilFunc, stencilOp, stencilMask
- **Blending operations** (5 methods): blendColor, blendEquation, blendEquationSeparate, blendFunc, blendFuncSeparate
- **Face/Polygon operations** (4 methods): cullFace, frontFace, polygonOffset, lineWidth
- **Pixel operations** (2 methods): pixelStorei, readPixels
- **Query operations** (2 methods): getParameter (with ~10 common queries), getError, getExtension, getSupportedExtensions, hint
- **Command buffer system**: pushCommand(), flush(), finalize()
- **Object ID tracking**: Maps for buffers, textures, programs, shaders, framebuffers, renderbuffers, VAOs, queries, etc.
- **State caching**: Tracks boundProgram, boundArrayBuffer, boundElementArrayBuffer, activeTextureUnit
- `setSize()`: Updates canvas dimensions
- `encodeBufferData()`: Base64 encodes binary data for bridge transmission

**index.ts** (~50 lines)
- `initTsyne()`: Main initialization function
- Re-exports all public types and classes
- Example usage documentation

**shader-converter.ts** (~210 lines) - PHASE 5
- `convertGLSL300toGLSL110()`: WebGL2 → desktop OpenGL
- `convertGLSL300toGLSLES()`: WebGL2 → mobile OpenGL ES
- `isVertexShader()`: Auto-detect shader type
- `detectRequiredExtensions()`: Identify GL extensions needed
- `validateShader()`: Basic syntax validation

**test-integration.ts** (~320 lines) - PHASE 6
- `testBasicGLCommandFlow()`: Canvas, buffers, shaders, programs, uniforms, drawing
- `testShaderConversion()`: GLSL 300 ES conversion validation
- `testTextureOperations()`: Texture creation, binding, data upload
- `testVertexArrayOperations()`: VAO, vertex buffers, attribute setup
- `MockBridgeTransport()`: Captures messages without IPC
- `runAllIntegrationTests()`: Full test suite runner

#### Go Side (core/bridge/)

**handlers_gl.go** (~650 lines) - PHASE 4 REFACTORED
- `GLCanvas` struct: Wraps Fyne's Shader canvas + tracking state
  - `ShaderObject`: The actual Fyne Shader primitive
  - `Container`: Fyne CanvasObject for widget hierarchy
  - `programs/buffers/textures/shaders`: Object tracking (JS IDs → state)
  - `vertexData/indexData`: Geometry accumulation
- `shaderProgram/shaderBuffer/shaderTexture/shaderSource`: Type definitions for GL objects
- `uniformInfo`: Uniform location tracking
- `handleCreateGLCanvas()`: Creates Shader + Container, initializes canvas
  - Sets up Fyne widget integration
  - Returns canvasId and widgetId for Fyne operations
- `handleExecuteBatch()`: Processes command batch
  - Dispatches all commands
  - Accumulates vertex/index data
  - Pushes to Shader on finalization
  - Calls `Refresh()` to trigger rendering
- `handleGetParameter()`: Returns GL parameter values
- `handleGetError()`: Returns GL error state
- `executeGLCommand()`: Command dispatcher (~60+ command types)
- Command implementations map to Fyne Shader operations:
  - Shader ops → `SetSource()`
  - Uniform ops → `SetUniform()`
  - Texture ops → `SetTextureUniform()`
  - Buffer/vertex ops → `SetVertices()/SetIndices()`
  - State ops → No-op (handled by Fyne)
- `getGLParameterValue()`: Returns GL capability defaults

**shader_converter.go** (~170 lines) - PHASE 5
- `ConvertShader()`: Route based on target (GLSL110 or GLES3)
- `convertGLSL300toGLSL110()`: Transform GLSL 300 ES → GLSL 110
  - Regex-based shader transformation
  - in/out → attribute/varying mapping
  - texture() → texture2D() conversion
  - Fragment output handling (out vec4 → gl_FragColor)
  - Version/precision directive removal
- `convertGLSL300toGLSLES()`: Transform GLSL 300 ES → GLSL ES
  - Minimal changes (GLES 3.0 ≈ GLSL 300 ES)
  - Ensures precision qualifiers present
- `isVertexShader()`: Detect shader type from markers
- `DetectRequiredExtensions()`: Identify GL extensions needed
  - Extension mapping for advanced features
  - Logging for potential fallbacks

**main.go** - MODIFIED
- Added 4 new message handlers to switch statement:
  - `"createGLCanvas"` → `handleCreateGLCanvas()`
  - `"executeBatch"` → `handleExecuteBatch()`
  - `"getParameter"` → `handleGetParameter()`
  - `"getError"` → `handleGetError()`

### Architecture Achieved

The implementation now provides:

1. **Complete WebGL2 API Surface**: All ~60+ essential WebGL2 methods implemented
2. **Proper Async/Batching Pattern**: GL commands batched for performance
3. **Bridge Integration**: Messages flow properly from TS → Go
4. **Command Dispatcher**: Go side can handle all command types
5. **Object Tracking**: Local ID mapping for all GL objects
6. **State Management**: Canvas state tracking on both sides
7. **Global Shims**: Browser globals properly shimmed for three.js

### What Still Needs Implementation

1. ~~**Actual OpenGL Calls in handlers_gl.go**~~: ✅ DONE — handlers accumulate metadata and push to Fyne Shader canvas
2. ~~**GLSL Shader Conversion**~~: ✅ DONE — `shader_converter.go` handles 300 ES → 110/130 with Three.js macro detection
3. ~~**three.js Integration Points**~~: ✅ DONE — `setup-three.sh` patches `utils.js`, `initThreeJS()` handles init
4. ~~**Testing**~~: ✅ DONE — raw triangle + Three.js basic test with screenshots

**Remaining work:**
- ~~Scene background color~~: ✅ FIXED — Fyne's `painter.Clear()` was resetting `glClearColor` to theme bg each frame; fix re-applies stored clear color before every `gl.Clear()` in `shader_painter.go`
- ~~Advanced materials (MeshPhongMaterial with lighting)~~: ✅ FIXED — VAO tracking was the root cause; implemented in Sprint 7
- MeshStandardMaterial (PBR) support
- Performance profiling and optimization

---

## Implementation Summary (Phases 1-6 Complete)

### What We've Built

**Core Bridge Infrastructure**:
- ✅ Browser shims (document, window, RAF, crypto, storage)
- ✅ WebGL2 proxy interface (60+ methods, 150+ constants)
- ✅ Command batching and serialization
- ✅ Async/sync message handling with timeouts

**Go Bridge Integration**:
- ✅ GL canvas lifecycle management
- ✅ Fyne Shader canvas integration
- ✅ Command dispatcher (60+ command types)
- ✅ GLSL shader conversion (300 ES → 110 / ES)
- ✅ State tracking and accumulation

**Testing & Validation**:
- ✅ Comprehensive integration test suite
- ✅ GL command flow validation
- ✅ Shader conversion validation
- ✅ Texture operation testing
- ✅ Vertex array operation testing

### Lines of Code

| Component | Lines | Status |
|-----------|-------|--------|
| globals.ts | 450 | ✅ |
| bridge.ts | 150 | ✅ |
| canvas.ts | 210 | ✅ |
| gl-proxy.ts | 900 | ✅ |
| index.ts | 50 | ✅ |
| shader-converter.ts | 210 | ✅ |
| handlers_gl.go | 650 | ✅ |
| shader_converter.go | 170 | ✅ |
| test-integration.ts | 320 | ✅ |
| **TOTAL** | **~3,100** | ✅ |

### Architectural Decisions

1. **Leverage Fyne's Infrastructure**: Don't duplicate GL context, use Shader canvas
2. **Widget Integration**: GLCanvas is a fyne.CanvasObject, coexists with UI widgets
3. **Command Batching**: Accumulate GL ops, send in batches for performance
4. **Shader Conversion**: Handle GLSL compatibility automatically on bridge
5. **Minimal Fork**: Keep three.js changes to entry point and shims

### What's Ready Now

- **Geometry**: Can create, bind, and upload vertex/index buffers
- **Shaders**: Can compile GLSL 300 ES, auto-converts to GLSL 110
- **Materials**: Uniforms can be set and will update shader state
- **Textures**: Can create, bind, and upload texture data
- **Drawing**: Can issue draw calls that trigger Fyne rendering
- **Testing**: Full integration tests validate the pipeline

### What Needs Next (Phase 8+)

1. **Advanced Materials**:
   - MeshStandardMaterial (PBR)
   - Environment maps, IBL

2. **Optimize**:
   - Profile command batching
   - Implement better geometry handling
   - Reduce per-frame GL command count

3. **Edge Cases**:
   - Shadow maps (framebuffer rendering)
   - Advanced texture features (mipmaps, anisotropic filtering)
   - Performance-critical operations

4. **Polish**:
   - Error recovery
   - Comprehensive error messages
   - Documentation and examples

---

## Testing Strategy

### Unit Tests
- Test each WebGL2 method in isolation
- Test shader conversion for common patterns
- Test bridge message serialization

### Integration Tests
```typescript
// three/test/tsyne-integration.test.ts
describe('Three.js on Tsyne', () => {
  it('should render a spinning cube', async () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);

    scene.add(cube);
    camera.position.z = 5;

    renderer.render(scene, camera);

    // Screenshot comparison
    const screenshot = await captureCanvas(renderer.domElement);
    expect(screenshot).toMatchSnapshot();
  });
});
```

### Visual Regression
- Render reference images using browser WebGL2
- Compare against Tsyne renders
- Allow small pixel differences for driver variations

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebGL2 feature gaps | Start with basic features; add more as needed |
| Shader incompatibility | Build transpiler; test common materials first |
| Performance overhead | Batch GL commands; minimize bridge round-trips |
| Upstream breaking changes | Pin to stable releases; merge carefully |
| Mobile GL ES differences | Test on Android early; have ES-specific paths |

---

## Success Criteria

1. ✅ **Basic rendering works**: Box, sphere, plane geometry renders correctly
2. ✅ **Materials work**: MeshBasicMaterial, MeshPhongMaterial (MeshStandardMaterial TBD)
3. ✅ **Textures work**: 2D textures, cubemaps
4. ✅ **Lighting works**: Ambient, directional, point lights
5. **Performance acceptable**: 60fps for moderate scenes (TBD profiling)
6. ✅ **Examples run**: webgl_basic_test, webgl_geometries, webgl_buffergeometry, webgl_buffergeometry_indexed all render correctly

---

## Open Questions

1. **Synchronous vs Async GL calls**: This is the biggest architectural challenge.
   - Browser WebGL: all calls are synchronous (blocking)
   - Tsyne bridge: all calls are asynchronous (non-blocking)

   **Potential solutions:**
   - **Batch and flush**: Queue all GL commands, send batch on `render()` or `flush()`
   - **Synchronous bridge calls**: Add sync message type for critical calls (slow but correct)
   - **Optimistic local state**: Track state locally, only sync when needed
   - **Command buffer**: Build a command buffer in TS, send whole buffer to Go to execute

   The command buffer approach is probably best for performance - three.js does many GL calls per frame, and round-tripping each one would be too slow.

2. **Extension support**: Which WebGL2 extensions are critical? (e.g., EXT_color_buffer_float, OES_texture_float_linear)

3. **Mobile GLES version**: Android uses GLES 3.0 via gomobile. Need to verify feature parity.

4. **Event handling**: Mouse, touch, keyboard events for OrbitControls etc. Route through Tsyne's event system.

5. **OffscreenCanvas**: Useful for web workers. Not needed for Tsyne but affects API compatibility.
