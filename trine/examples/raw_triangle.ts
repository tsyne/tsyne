/**
 * Minimal raw triangle render test - bypasses Three.js entirely
 * Tests the GL pipeline directly: canvas creation, shader compilation,
 * buffer upload, attribute binding, and draw call.
 */

import type { App, ITsyneWindow } from 'tsyne';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import { initThreeJS } from '../integration/init';

// GLSL 300 ES shaders — the converter will translate to GLSL 110/130
const VERTEX_SHADER = `#version 300 es
in vec3 position;
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 FragColor;
void main() {
  FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

// Triangle vertices in clip space
const VERTICES = new Float32Array([
  -0.5, -0.5, 0.0,
   0.5, -0.5, 0.0,
   0.0,  0.5, 0.0,
]);

export async function buildRawTriangle(
  a: App,
  win: ITsyneWindow,
  params: { width?: number; height?: number } = {}
): Promise<{ stop: () => void }> {
  const width = params.width ?? 400;
  const height = params.height ?? 300;

  // Use initThreeJS only for bridge setup (canvas creation)
  // We won't use the THREE module at all
  const { THREE } = await initThreeJS(a, win, { width, height });

  // Get the GL context from a dummy renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  const gl = renderer.getContext() as WebGL2RenderingContext;

  // === Raw GL pipeline ===

  // Clear to black
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Create shaders
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FRAGMENT_SHADER);
  gl.compileShader(fs);

  // Create program
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Create and upload vertex buffer
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

  // Bind attribute
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Flush to execute the batch
  await (gl as any).flush();

  let running = true;

  // Render loop (re-renders every frame to keep window alive)
  const animate = async () => {
    while (running) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      await (gl as any).flush();
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  animate();

  return {
    stop: () => { running = false; },
  };
}

// Standalone entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Raw Triangle', shutdownStrategy: standaloneShutdownStrategy() }, async (a) => {
    a.window({ title: 'Raw Triangle', width: 450, height: 350 }, async (win) => {
      await buildRawTriangle(a, win);
      win.show();
    });
  });
}
