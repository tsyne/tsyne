/**
 * three.js webgl - buffergeometry instancing
 *
 * Tests:
 * - InstancedBufferGeometry with custom attributes
 * - Per-instance data using InstancedBufferAttribute
 * - Large number of instances
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryInstancingParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryInstancingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryInstancing(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryInstancingParams = {}
): Promise<WebGLBufferGeometryInstancingDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.set(0, 0, 2500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // Create instanced buffer geometry
  const instances = 5000;

  // Base geometry - simple triangle
  const geometry = new THREE.InstancedBufferGeometry();
  
  // Positions for a small triangle
  const positions = new Float32Array([
    -5, -5, 0,
     5, -5, 0,
     0,  5, 0,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Per-instance offsets
  const offsets = new Float32Array(instances * 3);
  for (let i = 0; i < instances; i++) {
    const i3 = i * 3;
    // Distribute in a cube
    offsets[i3] = (Math.random() - 0.5) * 2000;
    offsets[i3 + 1] = (Math.random() - 0.5) * 2000;
    offsets[i3 + 2] = (Math.random() - 0.5) * 2000;
  }
  geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));

  // Per-instance colors
  const colors = new Float32Array(instances * 3);
  for (let i = 0; i < instances; i++) {
    const i3 = i * 3;
    colors[i3] = Math.random();
    colors[i3 + 1] = Math.random();
    colors[i3 + 2] = Math.random();
  }
  geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));

  // Per-instance orientations (stored as euler angles)
  const orientations = new Float32Array(instances * 3);
  for (let i = 0; i < instances; i++) {
    const i3 = i * 3;
    orientations[i3] = Math.random() * Math.PI * 2;
    orientations[i3 + 1] = Math.random() * Math.PI * 2;
    orientations[i3 + 2] = Math.random() * Math.PI * 2;
  }
  geometry.setAttribute('orientation', new THREE.InstancedBufferAttribute(orientations, 3));

  // Per-instance scales
  const scales = new Float32Array(instances);
  for (let i = 0; i < instances; i++) {
    scales[i] = 0.5 + Math.random() * 2;
  }
  geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    wireframe: true,
  });

  // Use InstancedMesh with our custom geometry
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Also create a regular InstancedMesh for comparison
  const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
  const boxMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffffff });
  const instancedBoxes = new THREE.InstancedMesh(boxGeometry, boxMaterial, 500);

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  for (let i = 0; i < 500; i++) {
    const x = (Math.random() - 0.5) * 1500;
    const y = (Math.random() - 0.5) * 1500;
    const z = (Math.random() - 0.5) * 1500;
    matrix.setPosition(x, y, z);
    instancedBoxes.setMatrixAt(i, matrix);
    color.setHSL(i / 500, 1, 0.5);
    instancedBoxes.setColorAt(i, color);
  }

  instancedBoxes.instanceMatrix.needsUpdate = true;
  if (instancedBoxes.instanceColor) {
    instancedBoxes.instanceColor.needsUpdate = true;
  }

  scene.add(instancedBoxes);

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

      // Rotate entire mesh
      mesh.rotation.y = time * 0.2;
      mesh.rotation.x = time * 0.1;

      instancedBoxes.rotation.y = -time * 0.15;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 2000;
      camera.position.z = Math.cos(time * 0.2) * 2000;
      camera.position.y = Math.sin(time * 0.1) * 500;
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
    { title: 'three.js webgl - buffergeometry instancing' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry instancing', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryInstancing(a, win, { width: WIDTH, height: HEIGHT });
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
