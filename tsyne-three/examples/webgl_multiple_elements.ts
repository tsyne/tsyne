/**
 * three.js webgl - multiple elements
 *
 * Port of: three/examples/webgl_multiple_elements.html
 *
 * Tests:
 * - Multiple independent 3D elements
 * - Different scenes and objects per element
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleElementsParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleElementsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleElements(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleElementsParams = {}
): Promise<WebGLMultipleElementsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create multiple elements with different geometries
  // ─────────────────────────────────────────────────────────────────────────

  const geometries = [
    new THREE.BoxGeometry(30, 30, 30),
    new THREE.SphereGeometry(20, 16, 12),
    new THREE.CylinderGeometry(15, 15, 40, 16),
    new THREE.ConeGeometry(20, 40, 16),
    new THREE.TorusGeometry(18, 6, 8, 16),
    new THREE.TorusKnotGeometry(15, 4, 64, 8),
    new THREE.OctahedronGeometry(25),
    new THREE.DodecahedronGeometry(20),
    new THREE.IcosahedronGeometry(22),
  ];

  const colors = [
    0xff6600, 0x66ff00, 0x0066ff,
    0xffff00, 0xff00ff, 0x00ffff,
    0xff3333, 0x33ff33, 0x3333ff,
  ];

  // Create elements (scenes with individual meshes)
  const elements: any[] = [];

  for (let i = 0; i < 9; i++) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const material = new THREE.MeshPhongMaterial({
      color: colors[i],
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometries[i], material);
    scene.add(mesh);

    const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
    camera.position.z = 80;

    elements.push({ scene, camera, mesh });
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setScissorTest(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const gridSize = 3;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate each element
      elements.forEach((element, i) => {
        element.mesh.rotation.y = time * (0.5 + i * 0.1);
        element.mesh.rotation.x = time * (0.3 + i * 0.05);
      });

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render each element in grid
      const cellWidth = width / gridSize;
      const cellHeight = height / gridSize;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const i = row * gridSize + col;
          const element = elements[i];

          const left = Math.floor(col * cellWidth);
          const bottom = Math.floor((gridSize - 1 - row) * cellHeight);
          const w = Math.floor(cellWidth);
          const h = Math.floor(cellHeight);

          element.camera.aspect = w / h;
          element.camera.updateProjectionMatrix();

          renderer.setScissor(left, bottom, w, h);
          renderer.setViewport(left, bottom, w, h);
          renderer.render(element.scene, element.camera);
        }
      }

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
    { title: 'three.js webgl - multiple elements' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple elements', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleElements(a, win, { width: WIDTH, height: HEIGHT });
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
