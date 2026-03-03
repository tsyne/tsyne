/**
 * GL Command Deduplication Tests
 *
 * Tests that redundant GL commands are skipped before being added to the
 * command buffer, reducing IPC overhead to the Go bridge.
 */

import { TsyneBridge } from './bridge';
import { TsyneCanvas } from './canvas';
import { TsyneGLProxy } from './gl-proxy';

/** Create a test GL context with a no-op bridge */
function createTestGL(): TsyneGLProxy {
  const bridge = new TsyneBridge(async () => ({}));
  const canvas = new TsyneCanvas(bridge);
  return canvas.getContext('webgl2') as TsyneGLProxy;
}

/** Count commands of a given type in the buffer */
function countCommands(gl: TsyneGLProxy, cmd: string): number {
  return gl.commandBuffer.filter(([c]) => c === cmd).length;
}

/** Get total command count */
function totalCommands(gl: TsyneGLProxy): number {
  return gl.commandBuffer.length;
}

/** Clear the command buffer for a fresh count */
function clearBuffer(gl: TsyneGLProxy): void {
  gl.commandBuffer.length = 0;
}

// ═══════════════════════════════════════════════════════════════
// useProgram dedup
// ═══════════════════════════════════════════════════════════════

describe('useProgram dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('sends command on first call', () => {
    const prog = gl.createProgram()!;
    clearBuffer(gl);
    gl.useProgram(prog);
    expect(countCommands(gl, 'useProgram')).toBe(1);
  });

  it('skips when same program already bound', () => {
    const prog = gl.createProgram()!;
    gl.useProgram(prog);
    clearBuffer(gl);
    gl.useProgram(prog);
    expect(countCommands(gl, 'useProgram')).toBe(0);
  });

  it('sends when program changes', () => {
    const prog1 = gl.createProgram()!;
    const prog2 = gl.createProgram()!;
    gl.useProgram(prog1);
    clearBuffer(gl);
    gl.useProgram(prog2);
    expect(countCommands(gl, 'useProgram')).toBe(1);
  });

  it('sends when switching to null', () => {
    const prog = gl.createProgram()!;
    gl.useProgram(prog);
    clearBuffer(gl);
    gl.useProgram(null);
    expect(countCommands(gl, 'useProgram')).toBe(1);
  });

  it('sends after null→program', () => {
    gl.useProgram(null);
    clearBuffer(gl);
    const prog = gl.createProgram()!;
    clearBuffer(gl);
    gl.useProgram(prog);
    expect(countCommands(gl, 'useProgram')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// bindBuffer dedup
// ═══════════════════════════════════════════════════════════════

describe('bindBuffer dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('sends on first ARRAY_BUFFER bind', () => {
    const buf = gl.createBuffer()!;
    clearBuffer(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    expect(countCommands(gl, 'bindBuffer')).toBe(1);
  });

  it('skips when same buffer+target already bound', () => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    clearBuffer(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    expect(countCommands(gl, 'bindBuffer')).toBe(0);
  });

  it('sends when buffer changes on same target', () => {
    const buf1 = gl.createBuffer()!;
    const buf2 = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf1);
    clearBuffer(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf2);
    expect(countCommands(gl, 'bindBuffer')).toBe(1);
  });

  it('sends when target changes with same buffer', () => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    clearBuffer(gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
    expect(countCommands(gl, 'bindBuffer')).toBe(1);
  });

  it('tracks ELEMENT_ARRAY_BUFFER independently', () => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
    clearBuffer(gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
    expect(countCommands(gl, 'bindBuffer')).toBe(0);
  });

  it('always sends for UNIFORM_BUFFER target', () => {
    const buf = gl.createBuffer()!;
    // UNIFORM_BUFFER = 0x8A11
    gl.bindBuffer(0x8A11, buf);
    clearBuffer(gl);
    gl.bindBuffer(0x8A11, buf);
    // Not deduped — should send
    expect(countCommands(gl, 'bindBuffer')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// activeTexture dedup
// ═══════════════════════════════════════════════════════════════

describe('activeTexture dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('skips when same unit (initial is TEXTURE0)', () => {
    clearBuffer(gl);
    gl.activeTexture(gl.TEXTURE0);
    expect(countCommands(gl, 'activeTexture')).toBe(0);
  });

  it('sends when unit changes', () => {
    clearBuffer(gl);
    gl.activeTexture(gl.TEXTURE1);
    expect(countCommands(gl, 'activeTexture')).toBe(1);
  });

  it('skips repeat after change', () => {
    gl.activeTexture(gl.TEXTURE3);
    clearBuffer(gl);
    gl.activeTexture(gl.TEXTURE3);
    expect(countCommands(gl, 'activeTexture')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// bindTexture dedup
// ═══════════════════════════════════════════════════════════════

describe('bindTexture dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('sends on first bind', () => {
    const tex = gl.createTexture()!;
    clearBuffer(gl);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    expect(countCommands(gl, 'bindTexture')).toBe(1);
  });

  it('skips when same texture+target on same unit', () => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    clearBuffer(gl);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    expect(countCommands(gl, 'bindTexture')).toBe(0);
  });

  it('sends when texture changes', () => {
    const tex1 = gl.createTexture()!;
    const tex2 = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    clearBuffer(gl);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    expect(countCommands(gl, 'bindTexture')).toBe(1);
  });

  it('different units are independent', () => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    clearBuffer(gl);
    // Switch to unit 1 and bind same texture — should send
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    expect(countCommands(gl, 'bindTexture')).toBe(1);
  });

  it('unbinding (null) sends if different from current', () => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    clearBuffer(gl);
    gl.bindTexture(gl.TEXTURE_2D, null);
    expect(countCommands(gl, 'bindTexture')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// viewport dedup
// ═══════════════════════════════════════════════════════════════

describe('viewport dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('sends on first call', () => {
    clearBuffer(gl);
    gl.viewport(0, 0, 800, 600);
    expect(countCommands(gl, 'viewport')).toBe(1);
  });

  it('skips when same dimensions', () => {
    gl.viewport(0, 0, 800, 600);
    clearBuffer(gl);
    gl.viewport(0, 0, 800, 600);
    expect(countCommands(gl, 'viewport')).toBe(0);
  });

  it('sends when any component changes', () => {
    gl.viewport(0, 0, 800, 600);
    clearBuffer(gl);
    gl.viewport(0, 0, 1024, 600);
    expect(countCommands(gl, 'viewport')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// bindVertexArray dedup
// ═══════════════════════════════════════════════════════════════

describe('bindVertexArray dedup', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('sends on first bind', () => {
    const vao = gl.createVertexArray()!;
    clearBuffer(gl);
    gl.bindVertexArray(vao);
    expect(countCommands(gl, 'bindVertexArray')).toBe(1);
  });

  it('skips when same VAO', () => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    clearBuffer(gl);
    gl.bindVertexArray(vao);
    expect(countCommands(gl, 'bindVertexArray')).toBe(0);
  });

  it('invalidates ELEMENT_ARRAY_BUFFER tracking on VAO switch', () => {
    // VAO switch restores the VAO's EAB binding, which our local tracking
    // doesn't know about. After a VAO switch, bindBuffer(EAB,...) must
    // always send even if the bufferId matches our stale tracked value.
    const vao1 = gl.createVertexArray()!;
    const vao2 = gl.createVertexArray()!;
    const indexBuf = gl.createBuffer()!;

    // Setup: bind vao1 + index buffer
    gl.bindVertexArray(vao1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    clearBuffer(gl);

    // Switch to vao2 (GL restores vao2's EAB, which is different)
    gl.bindVertexArray(vao2);
    // Now bind the same index buffer — must NOT be skipped
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    expect(countCommands(gl, 'bindBuffer')).toBe(1);
  });

  it('sends on change', () => {
    const vao1 = gl.createVertexArray()!;
    const vao2 = gl.createVertexArray()!;
    gl.bindVertexArray(vao1);
    clearBuffer(gl);
    gl.bindVertexArray(vao2);
    expect(countCommands(gl, 'bindVertexArray')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// uniform1f / uniform1i dedup
// ═══════════════════════════════════════════════════════════════

describe('uniform1f / uniform1i dedup', () => {
  let gl: TsyneGLProxy;
  let prog: WebGLProgram;

  beforeEach(() => {
    gl = createTestGL();
    prog = gl.createProgram()!;
    gl.useProgram(prog);
  });

  it('sends uniform1f on first call', () => {
    const loc = gl.getUniformLocation(prog, 'u_time')!;
    clearBuffer(gl);
    gl.uniform1f(loc, 1.5);
    expect(countCommands(gl, 'uniform1f')).toBe(1);
  });

  it('skips uniform1f when same value', () => {
    const loc = gl.getUniformLocation(prog, 'u_time')!;
    gl.uniform1f(loc, 1.5);
    clearBuffer(gl);
    gl.uniform1f(loc, 1.5);
    expect(countCommands(gl, 'uniform1f')).toBe(0);
  });

  it('sends uniform1i when value changes', () => {
    const loc = gl.getUniformLocation(prog, 'u_sampler')!;
    gl.uniform1i(loc, 0);
    clearBuffer(gl);
    gl.uniform1i(loc, 1);
    expect(countCommands(gl, 'uniform1i')).toBe(1);
  });

  it('uniform cache cleared on useProgram change', () => {
    const loc = gl.getUniformLocation(prog, 'u_time')!;
    gl.uniform1f(loc, 1.5);
    // Switch to a different program and back
    const prog2 = gl.createProgram()!;
    gl.useProgram(prog2);
    gl.useProgram(prog);
    clearBuffer(gl);
    // Same loc + value but cache was cleared — should send
    gl.uniform1f(loc, 1.5);
    expect(countCommands(gl, 'uniform1f')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// uniform3f / uniform4f dedup
// ═══════════════════════════════════════════════════════════════

describe('uniform3f / uniform4f dedup', () => {
  let gl: TsyneGLProxy;
  let prog: WebGLProgram;

  beforeEach(() => {
    gl = createTestGL();
    prog = gl.createProgram()!;
    gl.useProgram(prog);
  });

  it('sends uniform3f on first call', () => {
    const loc = gl.getUniformLocation(prog, 'u_color')!;
    clearBuffer(gl);
    gl.uniform3f(loc, 1.0, 0.5, 0.0);
    expect(countCommands(gl, 'uniform3f')).toBe(1);
  });

  it('skips uniform4f when all components match', () => {
    const loc = gl.getUniformLocation(prog, 'u_color')!;
    gl.uniform4f(loc, 1.0, 0.5, 0.0, 1.0);
    clearBuffer(gl);
    gl.uniform4f(loc, 1.0, 0.5, 0.0, 1.0);
    expect(countCommands(gl, 'uniform4f')).toBe(0);
  });

  it('sends uniform3f when any component changes', () => {
    const loc = gl.getUniformLocation(prog, 'u_color')!;
    gl.uniform3f(loc, 1.0, 0.5, 0.0);
    clearBuffer(gl);
    gl.uniform3f(loc, 1.0, 0.6, 0.0);
    expect(countCommands(gl, 'uniform3f')).toBe(1);
  });

  it('cache cleared on useProgram', () => {
    const loc = gl.getUniformLocation(prog, 'u_color')!;
    gl.uniform4f(loc, 1.0, 0.5, 0.0, 1.0);
    const prog2 = gl.createProgram()!;
    gl.useProgram(prog2);
    gl.useProgram(prog);
    clearBuffer(gl);
    gl.uniform4f(loc, 1.0, 0.5, 0.0, 1.0);
    expect(countCommands(gl, 'uniform4f')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// uniformMatrix4fv dedup
// ═══════════════════════════════════════════════════════════════

describe('uniformMatrix4fv dedup', () => {
  let gl: TsyneGLProxy;
  let prog: WebGLProgram;

  beforeEach(() => {
    gl = createTestGL();
    prog = gl.createProgram()!;
    gl.useProgram(prog);
  });

  it('sends on first call', () => {
    const loc = gl.getUniformLocation(prog, 'u_mvp')!;
    const mat = new Float32Array(16);
    mat[0] = 1; mat[5] = 1; mat[10] = 1; mat[15] = 1; // identity
    clearBuffer(gl);
    gl.uniformMatrix4fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix4fv')).toBe(1);
  });

  it('skips when same matrix data', () => {
    const loc = gl.getUniformLocation(prog, 'u_mvp')!;
    const mat = new Float32Array(16);
    mat[0] = 1; mat[5] = 1; mat[10] = 1; mat[15] = 1;
    gl.uniformMatrix4fv(loc, false, mat);
    clearBuffer(gl);
    // Same data again
    gl.uniformMatrix4fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix4fv')).toBe(0);
  });

  it('sends when any element changes', () => {
    const loc = gl.getUniformLocation(prog, 'u_mvp')!;
    const mat = new Float32Array(16);
    mat[0] = 1; mat[5] = 1; mat[10] = 1; mat[15] = 1;
    gl.uniformMatrix4fv(loc, false, mat);
    clearBuffer(gl);
    mat[12] = 5.0; // change translation X
    gl.uniformMatrix4fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix4fv')).toBe(1);
  });

  it('cache cleared on useProgram', () => {
    const loc = gl.getUniformLocation(prog, 'u_mvp')!;
    const mat = new Float32Array(16);
    mat[0] = 1; mat[5] = 1; mat[10] = 1; mat[15] = 1;
    gl.uniformMatrix4fv(loc, false, mat);
    const prog2 = gl.createProgram()!;
    gl.useProgram(prog2);
    gl.useProgram(prog);
    clearBuffer(gl);
    gl.uniformMatrix4fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix4fv')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// uniformMatrix3fv dedup
// ═══════════════════════════════════════════════════════════════

describe('uniformMatrix3fv dedup', () => {
  let gl: TsyneGLProxy;
  let prog: WebGLProgram;

  beforeEach(() => {
    gl = createTestGL();
    prog = gl.createProgram()!;
    gl.useProgram(prog);
  });

  it('sends on first call', () => {
    const loc = gl.getUniformLocation(prog, 'u_normal')!;
    const mat = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    clearBuffer(gl);
    gl.uniformMatrix3fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix3fv')).toBe(1);
  });

  it('skips when same matrix data', () => {
    const loc = gl.getUniformLocation(prog, 'u_normal')!;
    const mat = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    gl.uniformMatrix3fv(loc, false, mat);
    clearBuffer(gl);
    gl.uniformMatrix3fv(loc, false, mat);
    expect(countCommands(gl, 'uniformMatrix3fv')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Existing dedup still works (regression)
// ═══════════════════════════════════════════════════════════════

describe('existing dedup regression', () => {
  let gl: TsyneGLProxy;

  beforeEach(() => { gl = createTestGL(); });

  it('enable/disable dedup', () => {
    gl.enable(gl.DEPTH_TEST);
    clearBuffer(gl);
    gl.enable(gl.DEPTH_TEST);
    expect(countCommands(gl, 'enable')).toBe(0);
    gl.disable(gl.DEPTH_TEST);
    expect(countCommands(gl, 'disable')).toBe(1);
    clearBuffer(gl);
    gl.disable(gl.DEPTH_TEST);
    expect(countCommands(gl, 'disable')).toBe(0);
  });

  it('depthFunc dedup', () => {
    gl.depthFunc(gl.LEQUAL);
    clearBuffer(gl);
    gl.depthFunc(gl.LEQUAL);
    expect(countCommands(gl, 'depthFunc')).toBe(0);
    gl.depthFunc(gl.LESS);
    expect(countCommands(gl, 'depthFunc')).toBe(1);
  });

  it('blendFunc dedup', () => {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    clearBuffer(gl);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    expect(countCommands(gl, 'blendFunc')).toBe(0);
  });

  it('cullFace dedup', () => {
    gl.cullFace(gl.FRONT);
    clearBuffer(gl);
    gl.cullFace(gl.FRONT);
    expect(countCommands(gl, 'cullFace')).toBe(0);
    gl.cullFace(gl.BACK);
    expect(countCommands(gl, 'cullFace')).toBe(1);
  });

  it('colorMask dedup', () => {
    gl.colorMask(true, true, true, false);
    clearBuffer(gl);
    gl.colorMask(true, true, true, false);
    expect(countCommands(gl, 'colorMask')).toBe(0);
    gl.colorMask(true, true, true, true);
    expect(countCommands(gl, 'colorMask')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// Integration: realistic frame simulation
// ═══════════════════════════════════════════════════════════════

describe('realistic frame dedup', () => {
  it('skips redundant state across multiple draw calls', () => {
    const gl = createTestGL();
    const prog = gl.createProgram()!;
    const vao1 = gl.createVertexArray()!;
    const vao2 = gl.createVertexArray()!;
    const buf = gl.createBuffer()!;
    const tex = gl.createTexture()!;

    // Simulate a typical frame: setup once, draw multiple objects
    gl.useProgram(prog);
    gl.viewport(0, 0, 800, 600);
    gl.enable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    clearBuffer(gl);

    // "Draw" object 1 — many of these are redundant
    gl.useProgram(prog);        // SKIP — same program
    gl.viewport(0, 0, 800, 600); // SKIP — same viewport
    gl.enable(gl.DEPTH_TEST);   // SKIP — already enabled
    gl.activeTexture(gl.TEXTURE0); // SKIP — same unit
    gl.bindTexture(gl.TEXTURE_2D, tex); // SKIP — same texture
    gl.bindVertexArray(vao1);   // SEND — first VAO bind
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // "Draw" object 2 — only VAO changes
    gl.useProgram(prog);        // SKIP
    gl.viewport(0, 0, 800, 600); // SKIP
    gl.activeTexture(gl.TEXTURE0); // SKIP
    gl.bindTexture(gl.TEXTURE_2D, tex); // SKIP
    gl.bindVertexArray(vao2);   // SEND — different VAO
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Should only have: bindVertexArray(vao1), drawArrays, bindVertexArray(vao2), drawArrays
    expect(countCommands(gl, 'useProgram')).toBe(0);
    expect(countCommands(gl, 'viewport')).toBe(0);
    expect(countCommands(gl, 'enable')).toBe(0);
    expect(countCommands(gl, 'activeTexture')).toBe(0);
    expect(countCommands(gl, 'bindTexture')).toBe(0);
    expect(countCommands(gl, 'bindVertexArray')).toBe(2);
    expect(countCommands(gl, 'drawArrays')).toBe(2);
    expect(totalCommands(gl)).toBe(4);
  });
});
