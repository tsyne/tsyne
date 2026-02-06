/**
 * three.js webgl - buffergeometry - merge
 *
 * Tests:
 * - BufferGeometryUtils.mergeGeometries
 * - Combining multiple geometries into one
 * - Performance optimization through batching
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryMergeParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryMergeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryMerge(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryMergeParams = {}
): Promise<WebGLBufferGeometryMergeDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 200, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Create many individual geometries and merge them
  const geometries: THREE.BufferGeometry[] = [];

  // Create a field of cubes
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const geometry = new THREE.BoxGeometry(15, 15, 15);
      geometry.translate(x * 30, 0, z * 30);
      geometries.push(geometry);
    }
  }

  // Merge all cube geometries into one
  const mergedCubes = BufferGeometryUtils.mergeGeometries(geometries);
  const cubesMaterial = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true });
  const cubesMesh = new THREE.Mesh(mergedCubes, cubesMaterial);
  cubesMesh.position.y = -50;
  scene.add(cubesMesh);

  // Create merged spheres in a ring
  const sphereGeometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const geometry = new THREE.SphereGeometry(10, 16, 12);
    geometry.translate(Math.cos(angle) * 100, 50, Math.sin(angle) * 100);
    sphereGeometries.push(geometry);
  }

  const mergedSpheres = BufferGeometryUtils.mergeGeometries(sphereGeometries);
  const spheresMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true });
  const spheresMesh = new THREE.Mesh(mergedSpheres, spheresMaterial);
  scene.add(spheresMesh);

  // Create merged tetrahedrons in a spiral
  const tetraGeometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 4;
    const height = i * 5 - 75;
    const radius = 50 + i * 2;
    const geometry = new THREE.TetrahedronGeometry(8);
    geometry.translate(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    tetraGeometries.push(geometry);
  }

  const mergedTetras = BufferGeometryUtils.mergeGeometries(tetraGeometries);
  const tetrasMaterial = new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true });
  const tetrasMesh = new THREE.Mesh(mergedTetras, tetrasMaterial);
  scene.add(tetrasMesh);

  // Create merged octahedrons forming a cross pattern
  const octaGeometries: THREE.BufferGeometry[] = [];
  const crossPositions = [
    [0, 0], [1, 0], [2, 0], [-1, 0], [-2, 0],
    [0, 1], [0, 2], [0, -1], [0, -2],
  ];
  for (const [dx, dz] of crossPositions) {
    const geometry = new THREE.OctahedronGeometry(12);
    geometry.translate(dx * 40, 120, dz * 40);
    octaGeometries.push(geometry);
  }

  const mergedOctas = BufferGeometryUtils.mergeGeometries(octaGeometries);
  const octasMaterial = new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true });
  const octasMesh = new THREE.Mesh(mergedOctas, octasMaterial);
  scene.add(octasMesh);

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

      // Rotate merged meshes
      cubesMesh.rotation.y = time * 0.2;
      spheresMesh.rotation.y = -time * 0.3;
      tetrasMesh.rotation.y = time * 0.4;
      octasMesh.rotation.y = -time * 0.25;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 500;
      camera.position.z = Math.cos(time * 0.2) * 500;
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
    { title: 'three.js webgl - buffergeometry - merge' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry - merge', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryMerge(a, win, { width: WIDTH, height: HEIGHT });
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
