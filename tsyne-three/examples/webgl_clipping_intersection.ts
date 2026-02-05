/**
 * three.js webgl - clipping intersection
 *
 * Tests:
 * - Multiple intersecting clipping planes
 * - clipIntersection mode
 * - Complex clipping combinations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLClippingIntersectionParams {
  width?: number;
  height?: number;
}

export interface WebGLClippingIntersectionDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLClippingIntersection(
  a: App,
  win: Window,
  params: WebGLClippingIntersectionParams = {}
): Promise<WebGLClippingIntersectionDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 0, 600);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Create clipping planes for intersection
  const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 50),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 50),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 50),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 50),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 50),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 50),
  ];

  // Create a torus knot with clipIntersection = true (shows only where ALL planes clip)
  const knotGeometry = new THREE.TorusKnotGeometry(100, 30, 128, 32);
  const knotMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b6b,
    wireframe: true,
    clippingPlanes: clipPlanes,
    clipIntersection: true, // Only show where ALL planes would clip
  });
  const knot = new THREE.Mesh(knotGeometry, knotMaterial);
  scene.add(knot);

  // Create another object with regular clipping (clipIntersection = false)
  const regularClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  ];

  const sphereGeometry = new THREE.SphereGeometry(60, 32, 24);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x4ecdc4,
    wireframe: true,
    clippingPlanes: regularClipPlanes,
    clipIntersection: false,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(-200, 0, 0);
  scene.add(sphere);

  // Create a box with diagonal clipping
  const diagonalPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 1, 0).normalize(), 20),
    new THREE.Plane(new THREE.Vector3(-1, 1, 0).normalize(), 20),
  ];

  const boxGeometry = new THREE.BoxGeometry(80, 80, 80);
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe66d,
    wireframe: true,
    clippingPlanes: diagonalPlanes,
    clipIntersection: true,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(200, 0, 0);
  scene.add(box);

  // Add plane helpers to visualize some clipping planes
  const planeHelper1 = new THREE.PlaneHelper(clipPlanes[0], 200, 0xff0000);
  const planeHelper2 = new THREE.PlaneHelper(clipPlanes[2], 200, 0x00ff00);
  const planeHelper3 = new THREE.PlaneHelper(clipPlanes[4], 200, 0x0000ff);
  scene.add(planeHelper1, planeHelper2, planeHelper3);

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

      // Animate the clip planes for the torus knot
      const offset = Math.sin(time) * 30 + 50;
      clipPlanes[0].constant = offset;
      clipPlanes[1].constant = offset;
      clipPlanes[2].constant = offset;
      clipPlanes[3].constant = offset;
      clipPlanes[4].constant = offset;
      clipPlanes[5].constant = offset;

      // Animate regular clip planes
      regularClipPlanes[0].constant = Math.sin(time * 1.5) * 40;
      regularClipPlanes[1].constant = Math.cos(time * 1.5) * 40;

      // Animate diagonal planes
      diagonalPlanes[0].constant = Math.sin(time * 0.8) * 30 + 20;
      diagonalPlanes[1].constant = Math.cos(time * 0.8) * 30 + 20;

      // Rotate objects
      knot.rotation.x = time * 0.3;
      knot.rotation.y = time * 0.4;

      sphere.rotation.y = time * 0.5;

      box.rotation.x = time * 0.4;
      box.rotation.y = time * 0.3;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 500;
      camera.position.z = Math.cos(time * 0.2) * 500;
      camera.position.y = Math.sin(time * 0.15) * 200;
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
    { title: 'three.js webgl - clipping intersection' },
    (a) => {
      a.window(
        { title: 'three.js webgl - clipping intersection', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLClippingIntersection(a, win, { width: WIDTH, height: HEIGHT });
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
