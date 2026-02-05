/**
 * three.js webgl - materials wireframe
 *
 * Port of: three/examples/webgl_materials_wireframe.html
 *
 * Tests:
 * - MeshBasicMaterial with wireframe
 * - Different geometries displayed as wireframes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsWireframeParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsWireframeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsWireframe(
  a: App,
  win: Window,
  params: WebGLMaterialsWireframeParams = {}
): Promise<WebGLMaterialsWireframeDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create different geometries
  const geometries = [
    new THREE.BoxGeometry(100, 100, 100),
    new THREE.SphereGeometry(50, 16, 12),
    new THREE.CylinderGeometry(30, 30, 100, 16),
    new THREE.ConeGeometry(50, 100, 16),
    new THREE.TorusGeometry(40, 15, 8, 16),
    new THREE.TorusKnotGeometry(40, 10, 64, 8),
    new THREE.DodecahedronGeometry(50),
    new THREE.IcosahedronGeometry(50),
    new THREE.OctahedronGeometry(50),
  ];

  const colors = [
    0xff0000, 0x00ff00, 0x0000ff,
    0xffff00, 0xff00ff, 0x00ffff,
    0xff8800, 0x88ff00, 0x0088ff,
  ];

  const meshes: any[] = [];

  // Create wireframe meshes in a 3x3 grid
  for (let i = 0; i < geometries.length; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: colors[i],
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometries[i], material);
    mesh.position.x = ((i % 3) - 1) * 200;
    mesh.position.y = (Math.floor(i / 3) - 1) * 200;
    scene.add(mesh);
    meshes.push(mesh);
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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Rotate all meshes
      meshes.forEach((mesh, i) => {
        mesh.rotation.x = time * (0.5 + i * 0.1);
        mesh.rotation.y = time * (0.3 + i * 0.1);
      });

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
    { title: 'three.js webgl - materials wireframe' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials wireframe', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsWireframe(a, win, { width: WIDTH, height: HEIGHT });
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
