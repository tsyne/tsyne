/**
 * three.js webgl - decals
 *
 * Tests:
 * - DecalGeometry for projecting geometry onto surfaces
 * - Multiple decals on a mesh
 * - Random decal placement
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLDecalsParams {
  width?: number;
  height?: number;
}

export interface WebGLDecalsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLDecals(
  a: App,
  win: ITsyneWindow,
  params: WebGLDecalsParams = {}
): Promise<WebGLDecalsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Base mesh - a sphere
  const sphereGeometry = new THREE.SphereGeometry(80, 64, 48);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x444466,
    wireframe: true,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // Create decals on the sphere
  const decals: THREE.Mesh[] = [];
  const decalColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xdcd6f7];

  for (let i = 0; i < 30; i++) {
    // Random position on sphere surface
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);

    const x = 80 * Math.sin(theta) * Math.cos(phi);
    const y = 80 * Math.sin(theta) * Math.sin(phi);
    const z = 80 * Math.cos(theta);

    const position = new THREE.Vector3(x, y, z);

    // Orientation - point outward from center
    const orientation = new THREE.Euler();
    orientation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Random size
    const size = new THREE.Vector3(
      15 + Math.random() * 15,
      15 + Math.random() * 15,
      10
    );

    try {
      const decalGeometry = new DecalGeometry(sphere, position, orientation, size);
      const decalMaterial = new THREE.MeshBasicMaterial({
        color: decalColors[i % decalColors.length],
        transparent: true,
        opacity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      });

      const decal = new THREE.Mesh(decalGeometry, decalMaterial);
      scene.add(decal);
      decals.push(decal);
    } catch (e) {
      // DecalGeometry can fail for some orientations, skip those
    }
  }

  // Add a second base mesh - a box
  const boxGeometry = new THREE.BoxGeometry(100, 100, 100, 10, 10, 10);
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0x666644,
    wireframe: true,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(200, 0, 0);
  scene.add(box);

  // Decals on box faces
  const boxFaces = [
    { pos: new THREE.Vector3(250, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) },
    { pos: new THREE.Vector3(150, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) },
    { pos: new THREE.Vector3(200, 50, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) },
    { pos: new THREE.Vector3(200, -50, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) },
    { pos: new THREE.Vector3(200, 0, 50), rot: new THREE.Euler(0, 0, 0) },
    { pos: new THREE.Vector3(200, 0, -50), rot: new THREE.Euler(0, Math.PI, 0) },
  ];

  for (let i = 0; i < boxFaces.length; i++) {
    const face = boxFaces[i];
    const size = new THREE.Vector3(40, 40, 10);

    try {
      const decalGeometry = new DecalGeometry(box, face.pos, face.rot, size);
      const decalMaterial = new THREE.MeshBasicMaterial({
        color: decalColors[i % decalColors.length],
        transparent: true,
        opacity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      });

      const decal = new THREE.Mesh(decalGeometry, decalMaterial);
      scene.add(decal);
      decals.push(decal);
    } catch (e) {
      // Skip failed decals
    }
  }

  // Add a torus as third base mesh
  const torusGeometry = new THREE.TorusGeometry(50, 20, 32, 48);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: 0x446666,
    wireframe: true,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(-200, 0, 0);
  scene.add(torus);

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

      // Rotate base meshes
      sphere.rotation.y = time * 0.2;
      box.rotation.x = time * 0.15;
      box.rotation.y = time * 0.2;
      torus.rotation.x = time * 0.3;
      torus.rotation.y = time * 0.2;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - decals' },
    (a) => {
      a.window(
        { title: 'three.js webgl - decals', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLDecals(a, win, { width: WIDTH, height: HEIGHT });
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
