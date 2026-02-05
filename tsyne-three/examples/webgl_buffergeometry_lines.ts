/**
 * three.js webgl - buffergeometry - lines
 *
 * Port of: three/examples/webgl_buffergeometry_lines.html
 *
 * Tests:
 * - THREE.Line with LineBasicMaterial
 * - Vertex colors on lines
 * - BufferGeometry with lines
 *
 * Adaptations for Tsyne:
 * - Removes Stats
 * - Removes morph targets (simplify initial port)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryLinesParams {
  width?: number;
  height?: number;
  segments?: number;
}

export interface WebGLBufferGeometryLinesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryLines(
  a: App,
  win: Window,
  params: WebGLBufferGeometryLinesParams = {}
): Promise<WebGLBufferGeometryLinesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const segments = params.segments ?? 10000;

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

  const camera = new THREE.PerspectiveCamera(27, width / height, 1, 4000);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const r = 800;

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ vertexColors: true });

  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < segments; i++) {
    const x = Math.random() * r - r / 2;
    const y = Math.random() * r - r / 2;
    const z = Math.random() * r - r / 2;

    // positions
    positions.push(x, y, z);

    // colors - based on position
    colors.push((x / r) + 0.5);
    colors.push((y / r) + 0.5);
    colors.push((z / r) + 0.5);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const line = new THREE.Line(geometry, material);
  scene.add(line);

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

      line.rotation.x = time * 0.25;
      line.rotation.y = time * 0.5;

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
    { title: 'three.js webgl - buffergeometry lines' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry lines', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryLines(a, win, { width: WIDTH, height: HEIGHT });
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
