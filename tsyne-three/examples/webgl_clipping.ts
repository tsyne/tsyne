/**
 * three.js webgl - clipping planes
 *
 * Tests:
 * - Clipping planes
 * - Multiple clip planes
 * - Local vs global clipping
 * - Animated clipping
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLClippingParams {
  width?: number;
  height?: number;
}

export interface WebGLClippingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLClipping(
  a: App,
  win: Window,
  params: WebGLClippingParams = {}
): Promise<WebGLClippingDemo> {
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
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x263238);

  // Create clipping planes
  const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  ];

  // Large torus knot with clipping
  const knotGeometry = new THREE.TorusKnotGeometry(60, 20, 128, 32);
  const knotMaterial = new THREE.MeshBasicMaterial({
    color: 0x80deea,
    wireframe: true,
    clippingPlanes: clipPlanes,
    clipIntersection: false,
  });
  const knot = new THREE.Mesh(knotGeometry, knotMaterial);
  scene.add(knot);

  // Add helper planes to visualize clipping
  const planeHelpers: THREE.Mesh[] = [];
  const planeColors = [0xff0000, 0x00ff00, 0x0000ff];

  for (let i = 0; i < 3; i++) {
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: planeColors[i],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
    });
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(planeMesh);
    planeHelpers.push(planeMesh);
  }

  // Additional objects with individual clipping
  const sphereClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const sphereGeometry = new THREE.SphereGeometry(40, 32, 24);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xffab91,
    wireframe: true,
    clippingPlanes: [sphereClipPlane],
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(-150, 0, 0);
  scene.add(sphere);

  const boxClipPlane = new THREE.Plane(new THREE.Vector3(1, 1, 0).normalize(), 0);
  const boxGeometry = new THREE.BoxGeometry(70, 70, 70);
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0xc5e1a5,
    wireframe: true,
    clippingPlanes: [boxClipPlane],
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(150, 0, 0);
  scene.add(box);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.localClippingEnabled = true;

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

      // Animate clipping planes
      clipPlanes[0].constant = Math.sin(time) * 50;
      clipPlanes[1].constant = Math.sin(time * 0.7) * 50;
      clipPlanes[2].constant = Math.sin(time * 0.5) * 50;

      // Update plane helper positions/rotations
      planeHelpers[0].position.x = -clipPlanes[0].constant;
      planeHelpers[0].rotation.y = Math.PI / 2;

      planeHelpers[1].position.y = clipPlanes[1].constant;
      planeHelpers[1].rotation.x = Math.PI / 2;

      planeHelpers[2].position.z = clipPlanes[2].constant;

      // Animate individual clip planes
      sphereClipPlane.constant = Math.sin(time * 1.2) * 30;
      boxClipPlane.constant = Math.sin(time * 0.8) * 40;

      // Rotate objects
      knot.rotation.x = time * 0.2;
      knot.rotation.y = time * 0.3;

      sphere.rotation.y = time * 0.5;
      box.rotation.x = time * 0.4;
      box.rotation.y = time * 0.3;

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
    { title: 'three.js webgl - clipping planes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - clipping planes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLClipping(a, win, { width: WIDTH, height: HEIGHT });
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
