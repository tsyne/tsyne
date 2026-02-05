/**
 * three.js webgl - geometries showcase
 *
 * Custom example testing multiple geometry types with MeshBasicMaterial.
 *
 * Tests:
 * - BoxGeometry
 * - SphereGeometry
 * - ConeGeometry
 * - CylinderGeometry
 * - TorusGeometry
 * - TorusKnotGeometry
 * - DodecahedronGeometry
 * - OctahedronGeometry
 * - All with MeshBasicMaterial (colors work)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometriesShowcaseParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometriesShowcaseDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometriesShowcase(
  a: App,
  win: Window,
  params: WebGLGeometriesShowcaseParams = {}
): Promise<WebGLGeometriesShowcaseDemo> {
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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 700;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const group = new THREE.Group();
  scene.add(group);

  // Array of geometries and colors
  const geometries = [
    { geo: new THREE.BoxGeometry(60, 60, 60), color: 0xff6b6b, pos: [-200, 100, 0] },
    { geo: new THREE.SphereGeometry(35, 32, 16), color: 0x4ecdc4, pos: [0, 100, 0] },
    { geo: new THREE.ConeGeometry(30, 60, 32), color: 0xffe66d, pos: [200, 100, 0] },
    { geo: new THREE.CylinderGeometry(25, 25, 60, 32), color: 0x95e1d3, pos: [-200, -100, 0] },
    { geo: new THREE.TorusGeometry(30, 10, 16, 100), color: 0xf38181, pos: [0, -100, 0] },
    { geo: new THREE.TorusKnotGeometry(25, 8, 100, 16), color: 0xaa96da, pos: [200, -100, 0] },
    { geo: new THREE.DodecahedronGeometry(35), color: 0xfcbad3, pos: [-100, 0, 100] },
    { geo: new THREE.OctahedronGeometry(40), color: 0xa8d8ea, pos: [100, 0, 100] },
  ];

  const meshes: THREE.Mesh[] = [];

  for (const { geo, color, pos } of geometries) {
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    group.add(mesh);
    meshes.push(mesh);

    // Add wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireframe = new THREE.Mesh(geo, wireframeMaterial);
    mesh.add(wireframe);
  }

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate each mesh individually
      meshes.forEach((mesh, i) => {
        mesh.rotation.x = time * (0.2 + i * 0.05);
        mesh.rotation.y = time * (0.3 + i * 0.03);
      });

      // Slowly rotate the entire group
      group.rotation.y = time * 0.1;

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
    { title: 'three.js webgl - geometries showcase' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometries showcase', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometriesShowcase(a, win, { width: WIDTH, height: HEIGHT });
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
