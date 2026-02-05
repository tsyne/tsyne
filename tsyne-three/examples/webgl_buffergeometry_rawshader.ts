/**
 * three.js webgl - raw shader
 *
 * Port of: three/examples/webgl_buffergeometry_rawshader.html
 *
 * Tests:
 * - RawShaderMaterial with custom GLSL shaders
 * - Custom vertex and fragment shaders (no three.js automatic injection)
 * - Uint8BufferAttribute with normalized colors
 * - Dynamic uniform updates (time)
 * - BufferGeometry with random triangles
 *
 * Adaptations for Tsyne:
 * - Removes Stats
 * - Inlines shader source (no DOM script tags)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Shaders
// ═══════════════════════════════════════════════════════════════════════════

// GLSL 300 ES syntax for converter compatibility
const vertexShader = `#version 300 es
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in vec4 color;

out vec3 vPosition;
out vec4 vColor;

void main() {
  vPosition = position;
  vColor = color;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision mediump float;
precision mediump int;

uniform float time;

in vec3 vPosition;
in vec4 vColor;

out vec4 fragColor;

void main() {
  vec4 outColor = vec4(vColor);
  outColor.r += sin(vPosition.x * 10.0 + time) * 0.5;

  fragColor = outColor;
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryRawShaderParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryRawShaderDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryRawShader(
  a: App,
  win: Window,
  params: WebGLBufferGeometryRawShaderParams = {}
): Promise<WebGLBufferGeometryRawShaderDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 10);
  camera.position.z = 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry - random triangles
  // ─────────────────────────────────────────────────────────────────────────

  // Number of triangles with 3 vertices per triangle
  const vertexCount = 200 * 3;

  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    // Adding x, y, z
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);

    // Adding r, g, b, a
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
  }

  const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
  const colorAttribute = new THREE.Uint8BufferAttribute(colors, 4);

  // This will map the buffer values to 0.0f - +1.0f in the shader
  colorAttribute.normalized = true;

  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);

  // ─────────────────────────────────────────────────────────────────────────
  // Material - RawShaderMaterial with custom shaders
  // ─────────────────────────────────────────────────────────────────────────

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer setup
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = Date.now() - startTime;
      currentTime = time;

      // Rotate the mesh
      mesh.rotation.y = time * 0.0005;

      // Update time uniform
      material.uniforms.time.value = time * 0.005;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
    getTime: () => currentTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - raw shader' },
    (a) => {
      a.window(
        { title: 'three.js webgl - raw shader', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryRawShader(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main().catch(console.error);
}
