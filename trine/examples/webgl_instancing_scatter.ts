/**
 * three.js webgl - instancing - scatter
 *
 * Tests:
 * - InstancedMesh with many instances
 * - Per-instance colors
 * - Per-instance transforms
 * - Scattered random distribution
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInstancingScatterParams {
  width?: number;
  height?: number;
}

export interface WebGLInstancingScatterDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInstancingScatter(
  a: App,
  win: ITsyneWindow,
  params: WebGLInstancingScatterParams = {}
): Promise<WebGLInstancingScatterDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.set(0, 0, 1000);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000020);

  // Create instanced cubes
  const cubeCount = 1000;
  const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
  const cubeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });

  const cubeInstanced = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, cubeCount);

  const cubeMatrix = new THREE.Matrix4();
  const cubeColor = new THREE.Color();

  for (let i = 0; i < cubeCount; i++) {
    // Random position in a sphere
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5) * 400;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    // Random rotation
    const rx = Math.random() * Math.PI * 2;
    const ry = Math.random() * Math.PI * 2;
    const rz = Math.random() * Math.PI * 2;

    // Random scale
    const scale = 0.5 + Math.random() * 1.5;

    cubeMatrix.makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    cubeMatrix.setPosition(x, y, z);
    cubeMatrix.scale(new THREE.Vector3(scale, scale, scale));

    cubeInstanced.setMatrixAt(i, cubeMatrix);

    // Color based on position
    cubeColor.setHSL((x + 400) / 800, 0.8, 0.5);
    cubeInstanced.setColorAt(i, cubeColor);
  }

  cubeInstanced.instanceMatrix.needsUpdate = true;
  if (cubeInstanced.instanceColor) {
    cubeInstanced.instanceColor.needsUpdate = true;
  }

  scene.add(cubeInstanced);

  // Create instanced tetrahedrons
  const tetraCount = 500;
  const tetraGeometry = new THREE.TetrahedronGeometry(8);
  const tetraMaterial = new THREE.MeshBasicMaterial({ wireframe: true });

  const tetraInstanced = new THREE.InstancedMesh(tetraGeometry, tetraMaterial, tetraCount);

  for (let i = 0; i < tetraCount; i++) {
    // Ring distribution
    const angle = (i / tetraCount) * Math.PI * 2;
    const ringRadius = 450 + Math.sin(i * 0.5) * 50;

    const x = Math.cos(angle) * ringRadius;
    const y = (Math.random() - 0.5) * 100;
    const z = Math.sin(angle) * ringRadius;

    cubeMatrix.makeRotationFromEuler(
      new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    );
    cubeMatrix.setPosition(x, y, z);

    tetraInstanced.setMatrixAt(i, cubeMatrix);

    // Color based on angle
    cubeColor.setHSL(angle / (Math.PI * 2), 1, 0.6);
    tetraInstanced.setColorAt(i, cubeColor);
  }

  tetraInstanced.instanceMatrix.needsUpdate = true;
  if (tetraInstanced.instanceColor) {
    tetraInstanced.instanceColor.needsUpdate = true;
  }

  scene.add(tetraInstanced);

  // Create instanced octahedrons
  const octaCount = 200;
  const octaGeometry = new THREE.OctahedronGeometry(15);
  const octaMaterial = new THREE.MeshBasicMaterial({ wireframe: true });

  const octaInstanced = new THREE.InstancedMesh(octaGeometry, octaMaterial, octaCount);

  for (let i = 0; i < octaCount; i++) {
    // Grid distribution
    const row = Math.floor(i / 20);
    const col = i % 20;

    const x = (col - 10) * 50;
    const y = 300;
    const z = (row - 5) * 50;

    cubeMatrix.identity();
    cubeMatrix.setPosition(x, y, z);

    octaInstanced.setMatrixAt(i, cubeMatrix);

    // Checkerboard colors
    cubeColor.setHex((row + col) % 2 === 0 ? 0xff00ff : 0x00ffff);
    octaInstanced.setColorAt(i, cubeColor);
  }

  octaInstanced.instanceMatrix.needsUpdate = true;
  if (octaInstanced.instanceColor) {
    octaInstanced.instanceColor.needsUpdate = true;
  }

  scene.add(octaInstanced);

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

      // Rotate instance groups
      cubeInstanced.rotation.y = time * 0.1;
      tetraInstanced.rotation.y = -time * 0.15;
      octaInstanced.rotation.x = time * 0.1;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 1000;
      camera.position.z = Math.cos(time * 0.2) * 1000;
      camera.position.y = Math.sin(time * 0.1) * 300;
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
    { title: 'three.js webgl - instancing - scatter' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing - scatter', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInstancingScatter(a, win, { width: WIDTH, height: HEIGHT });
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
