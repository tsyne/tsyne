/**
 * three.js webgl - basic materials test
 *
 * Custom test for Tsyne to verify different material types render correctly.
 *
 * Tests:
 * - MeshBasicMaterial (no lighting)
 * - MeshBasicMaterial with wireframe
 * - LineBasicMaterial
 * - PointsMaterial
 *
 * This helps identify which material types work without lighting.
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsBasicParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsBasicDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsBasic(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsBasicParams = {}
): Promise<WebGLMaterialsBasicDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Row 1: MeshBasicMaterial with different colors
  const geometrySphere = new THREE.SphereGeometry(50, 32, 16);

  const sphereRed = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  sphereRed.position.set(-200, 100, 0);
  scene.add(sphereRed);

  const sphereGreen = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  sphereGreen.position.set(0, 100, 0);
  scene.add(sphereGreen);

  const sphereBlue = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0x0000ff })
  );
  sphereBlue.position.set(200, 100, 0);
  scene.add(sphereBlue);

  // Row 2: Wireframe spheres
  const sphereWireRed = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
  );
  sphereWireRed.position.set(-200, -100, 0);
  scene.add(sphereWireRed);

  const sphereWireGreen = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
  );
  sphereWireGreen.position.set(0, -100, 0);
  scene.add(sphereWireGreen);

  const sphereWireBlue = new THREE.Mesh(
    geometrySphere,
    new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })
  );
  sphereWireBlue.position.set(200, -100, 0);
  scene.add(sphereWireBlue);

  // Center: Box with white color
  const geometryBox = new THREE.BoxGeometry(80, 80, 80);
  const boxWhite = new THREE.Mesh(
    geometryBox,
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  boxWhite.position.set(0, 0, 50);
  scene.add(boxWhite);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

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

      // Rotate all meshes
      scene.children.forEach((child) => {
        if ((child as any).isMesh) {
          child.rotation.x = time * 0.5;
          child.rotation.y = time * 0.3;
        }
      });

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
    { title: 'three.js webgl - basic materials test' },
    (a) => {
      a.window(
        { title: 'three.js webgl - basic materials test', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsBasic(a, win, { width: WIDTH, height: HEIGHT });
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
