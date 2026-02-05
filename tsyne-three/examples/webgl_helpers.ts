/**
 * three.js webgl - helpers
 *
 * Port of: three/examples/webgl_helpers.html
 *
 * Tests:
 * - GridHelper
 * - PolarGridHelper
 * - AxesHelper
 * - BoxHelper
 * - ArrowHelper
 *
 * Adaptations for Tsyne:
 * - Removes GLTF model loading
 * - Uses procedural geometry with helpers
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLHelpersParams {
  width?: number;
  height?: number;
}

export interface WebGLHelpersDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLHelpers(
  a: App,
  win: Window,
  params: WebGLHelpersParams = {}
): Promise<WebGLHelpersDemo> {
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

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Grid Helper
  const gridHelper = new THREE.GridHelper(400, 40, 0x0000ff, 0x404040);
  gridHelper.position.y = -150;
  scene.add(gridHelper);

  // Polar Grid Helper
  const polarGridHelper = new THREE.PolarGridHelper(150, 16, 8, 64, 0x00ff00, 0x404040);
  polarGridHelper.position.y = -150;
  polarGridHelper.position.x = 250;
  scene.add(polarGridHelper);

  // Axes Helper at origin
  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);

  // Create some objects to put BoxHelpers around
  const boxGeometry = new THREE.BoxGeometry(60, 60, 60);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const box1 = new THREE.Mesh(boxGeometry, boxMaterial);
  box1.position.set(-100, 0, 0);
  scene.add(box1);
  scene.add(new THREE.BoxHelper(box1, 0xffff00));

  const sphereGeometry = new THREE.SphereGeometry(40, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere1.position.set(100, 0, 0);
  scene.add(sphere1);
  scene.add(new THREE.BoxHelper(sphere1, 0xff00ff));

  // Arrow helpers pointing in different directions
  const origin = new THREE.Vector3(0, 50, 0);
  const arrowX = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    origin,
    80,
    0xff0000,
    20,
    10
  );
  scene.add(arrowX);

  const arrowY = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    origin,
    80,
    0x00ff00,
    20,
    10
  );
  scene.add(arrowY);

  const arrowZ = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    origin,
    80,
    0x0000ff,
    20,
    10
  );
  scene.add(arrowZ);

  // Group with box helper around it
  const group = new THREE.Group();
  const smallBox = new THREE.Mesh(
    new THREE.BoxGeometry(30, 30, 30),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  smallBox.position.set(0, 100, 100);
  group.add(smallBox);
  scene.add(group);
  scene.add(new THREE.BoxHelper(group, 0x00ffff));

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

      // Orbit camera
      camera.position.x = 400 * Math.cos(time * 0.3);
      camera.position.z = 400 * Math.sin(time * 0.3);
      camera.position.y = 150 + Math.sin(time * 0.2) * 100;
      camera.lookAt(scene.position);

      // Rotate objects
      box1.rotation.x = time * 0.5;
      box1.rotation.y = time * 0.3;
      sphere1.rotation.y = time * 0.4;

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
    { title: 'three.js webgl - helpers' },
    (a) => {
      a.window(
        { title: 'three.js webgl - helpers', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLHelpers(a, win, { width: WIDTH, height: HEIGHT });
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
