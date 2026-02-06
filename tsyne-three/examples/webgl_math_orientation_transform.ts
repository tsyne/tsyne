/**
 * three.js webgl - math - orientation transform
 *
 * Port of: three/examples/webgl_math_orientation_transform.html
 *
 * Tests:
 * - ConeGeometry
 * - SphereGeometry
 * - MeshNormalMaterial
 * - MeshBasicMaterial with wireframe and transparency
 * - Quaternion rotation (rotateTowards)
 * - Spherical coordinates
 *
 * Adaptations for Tsyne:
 * - Removes GUI (uses fixed behavior)
 * - Uses time-based target generation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMathOrientationTransformParams {
  width?: number;
  height?: number;
}

export interface WebGLMathOrientationTransformDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMathOrientationTransform(
  a: App,
  win: ITsyneWindow,
  params: WebGLMathOrientationTransformParams = {}
): Promise<WebGLMathOrientationTransformDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
  camera.position.z = 5;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Cone mesh with normal material
  const coneGeometry = new THREE.ConeGeometry(0.1, 0.5, 8);
  coneGeometry.rotateX(Math.PI * 0.5);
  const coneMaterial = new THREE.MeshNormalMaterial();

  const mesh = new THREE.Mesh(coneGeometry, coneMaterial);
  scene.add(mesh);

  // Target sphere
  const targetGeometry = new THREE.SphereGeometry(0.05);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const target = new THREE.Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  // Wireframe sphere
  const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Rotation helpers
  // ─────────────────────────────────────────────────────────────────────────

  const spherical = new THREE.Spherical();
  const rotationMatrix = new THREE.Matrix4();
  const targetQuaternion = new THREE.Quaternion();
  const speed = Math.PI / 2; // radians per second

  function generateTarget() {
    // Generate a random point on a sphere
    spherical.theta = Math.random() * Math.PI * 2;
    spherical.phi = Math.acos((2 * Math.random()) - 1);
    spherical.radius = 2;

    target.position.setFromSpherical(spherical);

    // Compute target rotation
    rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
    targetQuaternion.setFromRotationMatrix(rotationMatrix);
  }

  // Generate initial target
  generateTarget();

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let lastTime = Date.now();
  let lastTargetTime = Date.now();

  const animate = async () => {
    while (running) {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      currentTime = now - startTime;

      // Generate new target every 2 seconds
      if (now - lastTargetTime > 2000) {
        generateTarget();
        lastTargetTime = now;
      }

      // Gradually rotate mesh towards target
      if (!mesh.quaternion.equals(targetQuaternion)) {
        const step = speed * delta;
        mesh.quaternion.rotateTowards(targetQuaternion, step);
      }

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
    { title: 'three.js webgl - math - orientation transform' },
    (a) => {
      a.window(
        { title: 'three.js webgl - math - orientation transform', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMathOrientationTransform(a, win, { width: WIDTH, height: HEIGHT });
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
