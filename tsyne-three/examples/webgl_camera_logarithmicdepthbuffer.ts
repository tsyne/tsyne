/**
 * three.js webgl - logarithmic depth buffer
 *
 * Port of: three/examples/webgl_camera_logarithmicdepthbuffer.html
 *
 * Tests:
 * - Logarithmic depth buffer for better precision at large distances
 * - Multiple objects at varying distances
 * - Comparison of near/far objects
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry
 * - Simplified distance range demonstration
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCameraLogarithmicDepthBufferParams {
  width?: number;
  height?: number;
}

export interface WebGLCameraLogarithmicDepthBufferDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCameraLogarithmicDepthBuffer(
  a: App,
  win: ITsyneWindow,
  params: WebGLCameraLogarithmicDepthBufferParams = {}
): Promise<WebGLCameraLogarithmicDepthBufferDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup with logarithmic depth buffer
  // ─────────────────────────────────────────────────────────────────────────

  // Use very large near/far range to demonstrate logarithmic depth
  const camera = new THREE.PerspectiveCamera(50, width / height, 1e-6, 1e27);
  camera.position.z = 100;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add lighting
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(1, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Create objects at various distances (exponentially spaced)
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 16);
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];

  for (let i = 0; i < 15; i++) {
    const distance = Math.pow(10, i - 5); // From 0.00001 to 1e9
    const scale = distance * 0.1;

    const material = new THREE.MeshPhongMaterial({
      color: colors[i % colors.length],
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.z = -distance;
    sphere.scale.setScalar(scale);
    scene.add(sphere);
  }

  // Add coordinate labels using simple wireframe boxes
  const boxGeometry = new THREE.BoxGeometry(2, 0.2, 0.2);
  for (let i = -3; i <= 3; i++) {
    const distance = Math.pow(10, i);
    const marker = new THREE.Mesh(
      boxGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    );
    marker.position.z = -distance;
    marker.scale.setScalar(distance * 0.05);
    scene.add(marker);
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  });
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

      // Move camera through scales
      const t = Math.sin(time * 0.2) * 0.5 + 0.5; // 0 to 1
      const cameraDistance = Math.pow(10, t * 8 - 4); // 0.0001 to 10000
      camera.position.z = cameraDistance;

      // Rotate scene slightly
      scene.rotation.y = time * 0.1;

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
    { title: 'three.js webgl - logarithmic depth buffer' },
    (a) => {
      a.window(
        { title: 'three.js webgl - logarithmic depth buffer', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCameraLogarithmicDepthBuffer(a, win, { width: WIDTH, height: HEIGHT });
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
