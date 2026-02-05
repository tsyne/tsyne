/**
 * three.js webgl - camera
 *
 * Tests:
 * - PerspectiveCamera with FOV changes
 * - Camera frustum visualization
 * - Multiple cameras showing different views
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCameraParams {
  width?: number;
  height?: number;
}

export interface WebGLCameraDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCamera(
  a: App,
  win: Window,
  params: WebGLCameraParams = {}
): Promise<WebGLCameraDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
  camera.position.set(0, 0, 2500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create a scene with various objects
  const group = new THREE.Group();
  scene.add(group);

  // Create a grid of colored cubes
  const cubeGeometry = new THREE.BoxGeometry(100, 100, 100);

  for (let x = -5; x <= 5; x++) {
    for (let y = -5; y <= 5; y++) {
      for (let z = -5; z <= 5; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        
        const cubeMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(
            (x + 5) / 10,
            1,
            0.3 + (y + 5) / 20
          ),
          wireframe: true,
        });

        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(x * 250, y * 250, z * 250);
        group.add(cube);
      }
    }
  }

  // Create a second camera to visualize
  const camera2 = new THREE.PerspectiveCamera(60, 1, 100, 2000);
  camera2.position.set(0, 0, 1000);

  // Camera helper to visualize the second camera's frustum
  const cameraHelper = new THREE.CameraHelper(camera2);
  scene.add(cameraHelper);

  // Add axes helper
  const axesHelper = new THREE.AxesHelper(500);
  scene.add(axesHelper);

  // Add central sphere as reference point
  const sphereGeometry = new THREE.SphereGeometry(50, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

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

      // Animate the second camera
      camera2.position.x = Math.sin(time * 0.5) * 1500;
      camera2.position.y = Math.cos(time * 0.3) * 500;
      camera2.position.z = Math.cos(time * 0.5) * 1500;
      camera2.lookAt(0, 0, 0);

      // Animate FOV
      camera2.fov = 40 + Math.sin(time) * 20;
      camera2.updateProjectionMatrix();

      // Update camera helper
      cameraHelper.update();

      // Rotate the cube group
      group.rotation.y = time * 0.1;

      // Orbit main camera
      const mainRadius = 3000;
      camera.position.x = Math.sin(time * 0.2) * mainRadius;
      camera.position.z = Math.cos(time * 0.2) * mainRadius;
      camera.position.y = Math.sin(time * 0.1) * 1000 + 500;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - camera' },
    (a) => {
      a.window(
        { title: 'three.js webgl - camera', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCamera(a, win, { width: WIDTH, height: HEIGHT });
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
