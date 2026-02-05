/**
 * three.js webgl - buffergeometry - particles
 *
 * Port of: three/examples/webgl_buffergeometry_points.html
 *
 * Tests:
 * - THREE.Points with PointsMaterial
 * - Vertex colors on points
 * - BufferGeometry with points
 *
 * Adaptations for Tsyne:
 * - Removes Stats
 * - Removes fog (simplify initial port)
 * - Reduces particle count for performance
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryPointsParams {
  width?: number;
  height?: number;
  particles?: number;
}

export interface WebGLBufferGeometryPointsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryPoints(
  a: App,
  win: Window,
  params: WebGLBufferGeometryPointsParams = {}
): Promise<WebGLBufferGeometryPointsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const particleCount = params.particles ?? 50000; // Reduced from 500000 for performance

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

  const camera = new THREE.PerspectiveCamera(27, width / height, 5, 3500);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  // Note: Fog removed for simplicity in initial port

  const n = 1000;
  const n2 = n / 2;

  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const colors: number[] = [];

  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    // positions
    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    positions.push(x, y, z);

    // colors - based on position
    const vx = (x / n) + 0.5;
    const vy = (y / n) + 0.5;
    const vz = (z / n) + 0.5;

    color.setRGB(vx, vy, vz);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({ size: 15, vertexColors: true });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const renderer = new THREE.WebGLRenderer();
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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      points.rotation.x = time * 0.25;
      points.rotation.y = time * 0.5;

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
    { title: 'three.js webgl - buffergeometry particles' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry particles', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryPoints(a, win, { width: WIDTH, height: HEIGHT });
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
