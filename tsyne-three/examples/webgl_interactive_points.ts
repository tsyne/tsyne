/**
 * three.js webgl - interactive points
 *
 * Port of: three/examples/webgl_interactive_points.html
 *
 * Tests:
 * - BufferGeometry with points
 * - PointsMaterial with vertex colors
 * - Raycasting with point cloud
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractivePointsParams {
  width?: number;
  height?: number;
  pointCount?: number;
}

export interface WebGLInteractivePointsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractivePoints(
  a: App,
  win: ITsyneWindow,
  params: WebGLInteractivePointsParams = {}
): Promise<WebGLInteractivePointsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const pointCount = params.pointCount ?? 10000;

  const { THREE } = await initThreeJS(a, win, { width, height, interactive: true });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.z = 250;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create point cloud
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const sizes = new Float32Array(pointCount);

  const color = new THREE.Color();

  for (let i = 0; i < pointCount; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 100;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 100;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 100;

    color.setHSL(i / pointCount, 1.0, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 10;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = raycaster.params.Points || {};
  raycaster.params.Points.threshold = 5;

  const pointer = new THREE.Vector2(-10, -10);
  let INTERSECTED: number | null = null;

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    pointer.x = (event.clientX / width) * 2 - 1;
    pointer.y = -(event.clientY / height) * 2 + 1;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.x = -10;
    pointer.y = -10;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      particles.rotation.x += 0.0005;
      particles.rotation.y += 0.001;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(particles);

      if (intersects.length > 0) {
        const newIndex = intersects[0].index;
        if (INTERSECTED !== newIndex && newIndex !== undefined) {
          // Restore previous point size
          if (INTERSECTED !== null) {
            const sizesAttr = geometry.getAttribute('size');
            (sizesAttr as any).array[INTERSECTED] = 10;
            sizesAttr.needsUpdate = true;
          }
          // Highlight new point
          INTERSECTED = newIndex;
          const sizesAttr = geometry.getAttribute('size');
          (sizesAttr as any).array[INTERSECTED] = 25;
          sizesAttr.needsUpdate = true;
        }
      } else if (INTERSECTED !== null) {
        const sizesAttr = geometry.getAttribute('size');
        (sizesAttr as any).array[INTERSECTED] = 10;
        sizesAttr.needsUpdate = true;
        INTERSECTED = null;
      }

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - interactive points' },
    (a) => {
      a.window(
        { title: 'three.js webgl - interactive points', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractivePoints(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
