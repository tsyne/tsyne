/**
 * three.js webgl - math - OBB (Oriented Bounding Box)
 *
 * Tests:
 * - OBB visualization
 * - Box3Helper for AABB
 * - Bounding box computation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMathObbParams {
  width?: number;
  height?: number;
}

export interface WebGLMathObbDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMathObb(
  a: App,
  win: ITsyneWindow,
  params: WebGLMathObbParams = {}
): Promise<WebGLMathObbDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const objects: { mesh: THREE.Mesh; helper: THREE.Box3Helper }[] = [];

  // Create various rotated objects with their bounding boxes
  const geometries = [
    { geo: new THREE.BoxGeometry(60, 30, 20), color: 0xff6b6b, pos: [-100, 50, 0] },
    { geo: new THREE.CylinderGeometry(20, 20, 50, 16), color: 0x4ecdc4, pos: [0, 50, 0] },
    { geo: new THREE.ConeGeometry(25, 50, 8), color: 0xffe66d, pos: [100, 50, 0] },
    { geo: new THREE.TorusGeometry(25, 10, 16, 32), color: 0xa8e6cf, pos: [-100, -50, 0] },
    { geo: new THREE.TorusKnotGeometry(20, 6, 64, 8), color: 0xdcd6f7, pos: [0, -50, 0] },
    { geo: new THREE.IcosahedronGeometry(30, 0), color: 0xf38181, pos: [100, -50, 0] },
  ];

  for (const { geo, color, pos } of geometries) {
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);

    // Random initial rotation
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(mesh);

    // Create bounding box helper
    const box = new THREE.Box3().setFromObject(mesh);
    const helper = new THREE.Box3Helper(box, new THREE.Color(0xffffff));
    scene.add(helper);

    objects.push({ mesh, helper });
  }

  // Add some grouped objects to show compound bounding boxes
  const group = new THREE.Group();
  group.position.set(0, 0, -100);

  const sphereGeo = new THREE.SphereGeometry(15, 16, 12);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });

  for (let i = 0; i < 5; i++) {
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    const angle = (i / 5) * Math.PI * 2;
    sphere.position.set(Math.cos(angle) * 50, 0, Math.sin(angle) * 50);
    group.add(sphere);
  }

  scene.add(group);

  const groupBox = new THREE.Box3().setFromObject(group);
  const groupHelper = new THREE.Box3Helper(groupBox, new THREE.Color(0xff00ff));
  scene.add(groupHelper);

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

      // Rotate objects and update their bounding boxes
      for (let i = 0; i < objects.length; i++) {
        const { mesh, helper } = objects[i];

        mesh.rotation.x = time * 0.3 + i * 0.5;
        mesh.rotation.y = time * 0.4 + i * 0.3;
        mesh.rotation.z = time * 0.2 + i * 0.4;

        // Update bounding box
        const box = new THREE.Box3().setFromObject(mesh);
        helper.box.copy(box);
      }

      // Rotate group
      group.rotation.y = time * 0.2;

      // Update group bounding box
      const groupBox = new THREE.Box3().setFromObject(group);
      groupHelper.box.copy(groupBox);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - math - OBB' },
    (a) => {
      a.window(
        { title: 'three.js webgl - math - OBB', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMathObb(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
