import {
  fragment_shader_glsl, skybox_fragment_glsl, skybox_vertex_glsl,
  instanced_vertex_glsl, vertex_shader_glsl
} from '@/engine/shaders/shaders';

export class LilGl {
  gl!: WebGL2RenderingContext;
  program!: WebGLProgram;
  skyboxProgram!: WebGLProgram;
  instancedProgram!: WebGLProgram;

  init() {
    // @ts-ignore
    this.gl = c3d.getContext('webgl2')!;
    const vertex = this.createShader(this.gl.VERTEX_SHADER, vertex_shader_glsl);
    const fragment = this.createShader(this.gl.FRAGMENT_SHADER, fragment_shader_glsl);
    this.program = this.createProgram(vertex, fragment);
    const skyboxVertex = this.createShader(this.gl.VERTEX_SHADER, skybox_vertex_glsl);
    const skyboxFragment = this.createShader(this.gl.FRAGMENT_SHADER, skybox_fragment_glsl);
    this.skyboxProgram = this.createProgram(skyboxVertex, skyboxFragment);
    const instancedVertex = this.createShader(this.gl.VERTEX_SHADER, instanced_vertex_glsl);
    this.instancedProgram = this.createProgram(instancedVertex, fragment);
  }

  createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    return shader;
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    return program;
  }
}

export const lilgl = new LilGl();

// gl is a live reference — always reads from lilgl.gl
// This ensures all modules see the initialized context after initLilGl() is called
// @ts-ignore — gl starts undefined but will be set before any game code runs
export let gl: WebGL2RenderingContext = undefined as any;

export function initLilGl() {
  lilgl.init();
  gl = lilgl.gl;
}

// Make gl a live getter on exports so CommonJS consumers always get the current value.
// tsx may have already defined the property as non-configurable, so guard with try/catch.
try {
  Object.defineProperty(module.exports, 'gl', {
    get() { return lilgl.gl; },
    enumerable: true,
    configurable: true,
  });
} catch {
  // If defineProperty fails (tsx's CJS transform made it non-configurable),
  // gl is still updated in initLilGl() via the module-level `gl = lilgl.gl` assignment.
}
