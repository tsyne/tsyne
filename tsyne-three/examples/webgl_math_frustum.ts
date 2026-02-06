/**
 * three.js webgl - frustum math visualization
 *
 * Port of: three/examples/webgl_math_frustum.html
 *
 * Tests:
 * - Frustum calculations
 * - Camera frustum visualization
 * - Object culling demonstration
 *
 * Adaptations for Tsyne:
 * - Visualizes camera frustum planes
 * - Shows culling state of objects
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMathFrustumParams {
  width?: number;
  height?: number;
}

export interface WebGLMathFrustumDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMathFrustum(
  a: App,
  win: ITsyneWindow,
  params: WebGLMathFrustumParams = {}
): Promise<WebGLMathFrustumDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  // Observer camera (renders the main view)
  const observerCamera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
  observerCamera.position.set(500, 500, 500);
  observerCamera.lookAt(0, 0, 0);

  // Target camera (the one whose frustum we visualize)
  const targetCamera = new THREE.PerspectiveCamera(60, width / height, 50, 500);
  targetCamera.position.set(0, 100, 300);
  targetCamera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111133);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x444444));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Create camera helper
  const cameraHelper = new THREE.CameraHelper(targetCamera);
  scene.add(cameraHelper);

  // Create frustum for culling tests
  const frustum = new THREE.Frustum();
  const cameraViewProjectionMatrix = new THREE.Matrix4();

  // Create test objects
  const sphereGeometry = new THREE.SphereGeometry(20, 16, 8);
  const inFrustumMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  const outFrustumMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

  const testObjects: THREE.Mesh[] = [];

  // Create a grid of spheres
  for (let x = -300; x <= 300; x += 60) {
    for (let y = -100; y <= 200; y += 60) {
      for (let z = -300; z <= 100; z += 60) {
        const sphere = new THREE.Mesh(sphereGeometry, inFrustumMaterial.clone());
        sphere.position.set(x, y, z);
        scene.add(sphere);
        testObjects.push(sphere);
      }
    }
  }

  // Add floor grid
  const gridHelper = new THREE.GridHelper(800, 20, 0x444444, 0x222222);
  gridHelper.position.y = -100;
  scene.add(gridHelper);

  // Add axes helper
  const axesHelper = new THREE.AxesHelper(200);
  scene.add(axesHelper);

  // Add target camera visualization
  const cameraBox = new THREE.Mesh(
    new THREE.BoxGeometry(30, 20, 50),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  cameraBox.position.copy(targetCamera.position);
  scene.add(cameraBox);

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

      // Animate target camera
      targetCamera.position.x = Math.sin(time * 0.3) * 200;
      targetCamera.position.z = 200 + Math.cos(time * 0.3) * 100;
      targetCamera.rotation.y = Math.sin(time * 0.5) * 0.5;
      targetCamera.updateMatrixWorld();

      // Update camera box position
      cameraBox.position.copy(targetCamera.position);
      cameraBox.rotation.copy(targetCamera.rotation);

      // Update camera helper
      cameraHelper.update();

      // Update frustum
      cameraViewProjectionMatrix.multiplyMatrices(
        targetCamera.projectionMatrix,
        targetCamera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

      // Test each object against frustum
      testObjects.forEach((obj) => {
        const inFrustum = frustum.containsPoint(obj.position);
        const mat = obj.material as THREE.MeshPhongMaterial;

        if (inFrustum) {
          mat.color.setHex(0x00ff00);
          mat.emissive.setHex(0x002200);
        } else {
          mat.color.setHex(0xff0000);
          mat.emissive.setHex(0x220000);
        }
      });

      // Animate observer camera
      observerCamera.position.x = 400 + Math.sin(time * 0.2) * 200;
      observerCamera.position.z = 400 + Math.cos(time * 0.2) * 200;
      observerCamera.lookAt(0, 50, 0);

      renderer.render(scene, observerCamera);

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
    { title: 'three.js webgl - frustum math' },
    (a) => {
      a.window(
        { title: 'three.js webgl - frustum math', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMathFrustum(a, win, { width: WIDTH, height: HEIGHT });
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
