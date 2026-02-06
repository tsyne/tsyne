/**
 * three.js webgl - reverse depth buffer
 *
 * Port of: three/examples/webgl_reversed_depth_buffer.html
 *
 * Tests:
 * - Reversed depth buffer rendering (reversedDepthBuffer option)
 * - BufferGeometry with custom position and color attributes
 * - MeshBasicMaterial with vertexColors
 * - Multiple mesh instances at extreme distances (depth precision stress test)
 * - Quaternion-based rotation animation
 *
 * Adaptations for Tsyne:
 * - Original shows 3 side-by-side renderers (normal, logarithmic, reversed)
 *   with EffectComposer; Tsyne uses a single renderer with reversedDepthBuffer
 * - Removes Stats, DOM container layout, EffectComposer post-processing
 * - Uses Tsyne rendering pipeline with gl.flush()
 *
 * The scene places 5 pairs of nearly-coplanar red/green planes at
 * exponentially increasing distances from the camera, stress-testing
 * depth buffer precision. With a standard depth buffer, z-fighting
 * artifacts appear on distant planes. The reversed depth buffer
 * distributes precision more evenly.
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLReversedDepthBufferParams {
  width?: number;
  height?: number;
}

export interface WebGLReversedDepthBufferDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Reversed Depth Buffer demo
 *
 * Creates a scene with pairs of nearly-coplanar colored planes placed at
 * exponentially increasing distances. Animates rotation via quaternion to
 * show depth buffer precision characteristics.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() and getTime()
 */
export async function buildWebGLReversedDepthBuffer(
  a: App,
  win: ITsyneWindow,
  params: WebGLReversedDepthBufferParams = {}
): Promise<WebGLReversedDepthBufferDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(
    72,
    width / height,
    5,
    9999
  );
  camera.position.z = 12;

  // ─────────────────────────────────────────────────────────────────────────
  // Scene
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry: pairs of nearly-coplanar planes (red and green)
  // ─────────────────────────────────────────────────────────────────────────

  const meshes: any[] = [];

  const xCount = 1;
  const yCount = 5;

  const d = 0.0001; // half distance between two planes
  const o = 0.5; // half x offset to shift planes so they are only partially overlapping

  const positions = new Float32Array([
    -1 - o, -1, d,
    1 - o, -1, d,
    -1 - o, 1, d,
    1 - o, -1, d,
    1 - o, 1, d,
    -1 - o, 1, d,

    -1 + o, -1, -d,
    1 + o, -1, -d,
    -1 + o, 1, -d,
    1 + o, -1, -d,
    1 + o, 1, -d,
    -1 + o, 1, -d,
  ]);

  const colors = new Float32Array([
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  const numInstances = xCount * yCount;

  for (let i = 0; i < numInstances; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    meshes.push(mesh);
    scene.add(mesh);
  }

  // Position meshes at exponentially increasing distances
  let idx = 0;
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      const z = -800 * idx;
      const s = 1 + 50 * idx;

      const mesh = meshes[idx];
      mesh.position.set(
        x - xCount / 2 + 0.5,
        (4.0 - 0.2 * z) * (y - yCount / 2 + 1.0),
        z
      );
      mesh.scale.setScalar(s);

      idx++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer with reversed depth buffer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ reversedDepthBuffer: true });
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
      currentTime = Date.now() - startTime;
      const now = currentTime / 1000;

      // Rotate all meshes via quaternion (matches original)
      for (let i = 0; i < meshes.length; i++) {
        const angle = THREE.MathUtils.degToRad(30);
        const axis = new THREE.Vector3(Math.sin(now), Math.cos(now), 0);
        meshes[i].quaternion.setFromAxisAngle(axis, angle);
      }

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
    { title: 'three.js webgl - reverse depth buffer' },
    (a) => {
      a.window(
        { title: 'three.js webgl - reverse depth buffer', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLReversedDepthBuffer(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
