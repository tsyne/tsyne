/**
 * three.js webgl - camera - orthographic
 *
 * Tests:
 * - OrthographicCamera
 * - MeshBasicMaterial wireframe
 * - Multiple objects in orthographic view
 *
 * Based on concepts from three/examples/webgl_camera.html
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCameraOrthographicParams {
  width?: number;
  height?: number;
}

export interface WebGLCameraOrthographicDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCameraOrthographic(
  a: App,
  win: Window,
  params: WebGLCameraOrthographicParams = {}
): Promise<WebGLCameraOrthographicDemo> {
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

  const aspect = width / height;
  const frustumSize = 500;

  // Orthographic camera
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    2000
  );
  camera.position.set(200, 200, 200);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Add AxesHelper
  const axesHelper = new THREE.AxesHelper(200);
  scene.add(axesHelper);

  // Add grid
  const gridHelper = new THREE.GridHelper(400, 20, 0x444444, 0x333333);
  scene.add(gridHelper);

  // Create various wireframe objects
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

  // Cubes in a line
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(40, 40, 40);
    const material = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-150 + i * 75, 30, 0);
    scene.add(mesh);
  }

  // Spheres in a line
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.SphereGeometry(20, 12, 8);
    const material = new THREE.MeshBasicMaterial({
      color: colors[(i + 3) % colors.length],
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-150 + i * 75, 30, 100);
    scene.add(mesh);
  }

  // Cones in a line
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.ConeGeometry(20, 40, 8);
    const material = new THREE.MeshBasicMaterial({
      color: colors[(i + 1) % colors.length],
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-150 + i * 75, 30, -100);
    scene.add(mesh);
  }

  // Central torus knot
  const torusKnotGeometry = new THREE.TorusKnotGeometry(40, 10, 64, 8);
  const torusKnotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
  torusKnot.position.set(0, 80, 0);
  scene.add(torusKnot);

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

      // Rotate camera around the scene
      camera.position.x = Math.cos(time * 0.3) * 400;
      camera.position.z = Math.sin(time * 0.3) * 400;
      camera.lookAt(0, 50, 0);

      // Rotate the torus knot
      torusKnot.rotation.x = time * 0.5;
      torusKnot.rotation.y = time * 0.3;

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
    { title: 'three.js webgl - camera - orthographic' },
    (a) => {
      a.window(
        { title: 'three.js webgl - camera - orthographic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCameraOrthographic(a, win, { width: WIDTH, height: HEIGHT });
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
