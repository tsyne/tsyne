/**
 * three.js webgl - stencil clipping
 *
 * Port of: three/examples/webgl_clipping_stencil.html
 *
 * Tests:
 * - Stencil buffer operations
 * - Clipping planes with visible caps
 * - Multiple clipping planes
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry
 * - Simplified stencil demonstration
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLClippingStencilParams {
  width?: number;
  height?: number;
}

export interface WebGLClippingStencilDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLClippingStencil(
  a: App,
  win: Window,
  params: WebGLClippingStencilParams = {}
): Promise<WebGLClippingStencilDemo> {
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

  const camera = new THREE.PerspectiveCamera(36, width / height, 1, 100);
  camera.position.set(2, 2, 2);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x263238);

  // Add lighting
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Create clipping planes
  const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  ];

  // Create the main object (torus knot)
  const torusKnotGeometry = new THREE.TorusKnotGeometry(0.4, 0.15, 128, 32);

  // Material with clipping
  const material = new THREE.MeshPhongMaterial({
    color: 0x80ee10,
    shininess: 100,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
    clipIntersection: false,
  });

  const mesh = new THREE.Mesh(torusKnotGeometry, material);
  scene.add(mesh);

  // Add cap meshes for each clipping plane (simplified stencil effect)
  const planeColors = [0xff0000, 0x00ff00, 0x0000ff];
  const planeGeometry = new THREE.PlaneGeometry(2, 2);

  clipPlanes.forEach((plane, i) => {
    const capMaterial = new THREE.MeshBasicMaterial({
      color: planeColors[i],
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const capMesh = new THREE.Mesh(planeGeometry, capMaterial);

    // Position plane at clip position
    const normal = plane.normal;
    capMesh.lookAt(normal);
    capMesh.position.copy(normal).multiplyScalar(-plane.constant);

    scene.add(capMesh);
  });

  // Add wireframe helpers for clipping planes
  const helperGeometry = new THREE.PlaneGeometry(1.5, 1.5);
  const helperMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
  });

  const helpers: THREE.Mesh[] = [];
  clipPlanes.forEach((plane) => {
    const helper = new THREE.Mesh(helperGeometry, helperMaterial);
    helper.lookAt(plane.normal);
    helpers.push(helper);
    scene.add(helper);
  });

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

      // Rotate the object
      mesh.rotation.x = time * 0.5;
      mesh.rotation.y = time * 0.3;

      // Animate clipping planes
      clipPlanes[0].constant = 0.3 * Math.sin(time);
      clipPlanes[1].constant = 0.3 * Math.sin(time * 1.1);
      clipPlanes[2].constant = 0.3 * Math.sin(time * 1.2);

      // Update helper positions
      helpers.forEach((helper, i) => {
        const plane = clipPlanes[i];
        helper.position.copy(plane.normal).multiplyScalar(-plane.constant);
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
    { title: 'three.js webgl - stencil clipping' },
    (a) => {
      a.window(
        { title: 'three.js webgl - stencil clipping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLClippingStencil(a, win, { width: WIDTH, height: HEIGHT });
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
