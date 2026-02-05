/**
 * three.js webgl - mesh batch
 *
 * Port of: three/examples/webgl_mesh_batch.html
 *
 * Tests:
 * - BatchedMesh for efficient instanced rendering
 * - Dynamic geometry batching
 * - Per-instance transforms
 * - Many objects with single draw call
 *
 * Adaptations for Tsyne:
 * - Uses InstancedMesh as BatchedMesh equivalent
 * - Procedural geometry and transforms
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMeshBatchParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLMeshBatchDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMeshBatch(
  a: App,
  win: Window,
  params: WebGLMeshBatchParams = {}
): Promise<WebGLMeshBatchDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 1000;

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 0, 150);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create batched meshes using InstancedMesh
  // ─────────────────────────────────────────────────────────────────────────

  // Different geometry types for variety
  const geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.ConeGeometry(0.5, 1, 8),
    new THREE.TetrahedronGeometry(0.6),
    new THREE.OctahedronGeometry(0.5),
  ];

  const materials = [
    new THREE.MeshPhongMaterial({ color: 0xff4444 }),
    new THREE.MeshPhongMaterial({ color: 0x44ff44 }),
    new THREE.MeshPhongMaterial({ color: 0x4444ff }),
    new THREE.MeshPhongMaterial({ color: 0xffff44 }),
    new THREE.MeshPhongMaterial({ color: 0xff44ff }),
  ];

  interface BatchedInstance {
    mesh: THREE.InstancedMesh;
    dummy: THREE.Object3D;
    instanceData: Array<{
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
      velocity: THREE.Vector3;
      rotationSpeed: THREE.Vector3;
    }>;
  }

  const batches: BatchedInstance[] = [];
  const instancesPerBatch = Math.ceil(instanceCount / geometries.length);

  for (let g = 0; g < geometries.length; g++) {
    const mesh = new THREE.InstancedMesh(
      geometries[g],
      materials[g],
      instancesPerBatch
    );

    const dummy = new THREE.Object3D();
    const instanceData: BatchedInstance['instanceData'] = [];

    // Initialize instance transforms
    for (let i = 0; i < instancesPerBatch; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );

      const rotation = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const scale = new THREE.Vector3(
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );

      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );

      instanceData.push({ position, rotation, scale, velocity, rotationSpeed });

      // Set initial transform
      dummy.position.copy(position);
      dummy.rotation.copy(rotation);
      dummy.scale.copy(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    batches.push({ mesh, dummy, instanceData });
  }

  // Add a reference cube at center
  const centerCube = new THREE.Mesh(
    new THREE.BoxGeometry(5, 5, 5),
    new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true })
  );
  scene.add(centerCube);

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

      // Update all batched instances
      for (const batch of batches) {
        for (let i = 0; i < batch.instanceData.length; i++) {
          const data = batch.instanceData[i];

          // Update position with velocity
          data.position.add(data.velocity);

          // Bounce off boundaries
          const bounds = 100;
          if (Math.abs(data.position.x) > bounds) {
            data.velocity.x *= -1;
            data.position.x = Math.sign(data.position.x) * bounds;
          }
          if (Math.abs(data.position.y) > bounds) {
            data.velocity.y *= -1;
            data.position.y = Math.sign(data.position.y) * bounds;
          }
          if (Math.abs(data.position.z) > bounds) {
            data.velocity.z *= -1;
            data.position.z = Math.sign(data.position.z) * bounds;
          }

          // Update rotation
          data.rotation.x += data.rotationSpeed.x;
          data.rotation.y += data.rotationSpeed.y;
          data.rotation.z += data.rotationSpeed.z;

          // Update matrix
          batch.dummy.position.copy(data.position);
          batch.dummy.rotation.copy(data.rotation);
          batch.dummy.scale.copy(data.scale);
          batch.dummy.updateMatrix();
          batch.mesh.setMatrixAt(i, batch.dummy.matrix);
        }

        batch.mesh.instanceMatrix.needsUpdate = true;
      }

      // Rotate center cube
      centerCube.rotation.x = time * 0.5;
      centerCube.rotation.y = time * 0.3;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 200;
      camera.position.z = Math.cos(time * 0.2) * 200;
      camera.position.y = Math.sin(time * 0.1) * 50;
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
    { title: 'three.js webgl - mesh batch' },
    (a) => {
      a.window(
        { title: 'three.js webgl - mesh batch', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMeshBatch(a, win, { width: WIDTH, height: HEIGHT });
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
