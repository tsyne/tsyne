/**
 * three.js webgl - instancing performance test
 *
 * Port of: three/examples/webgl_instancing_performance.html
 *
 * Tests:
 * - InstancedMesh for high-performance instancing
 * - Large number of instances
 * - Per-instance matrix transforms
 * - Per-instance colors
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry
 * - Demonstrates performance with many instances
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInstancingPerformanceParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLInstancingPerformanceDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInstancingPerformance(
  a: App,
  win: ITsyneWindow,
  params: WebGLInstancingPerformanceParams = {}
): Promise<WebGLInstancingPerformanceDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 5000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
  camera.position.z = 2000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x444444));

  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Create instanced mesh
  const geometry = new THREE.BoxGeometry(10, 10, 10);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Set up instance colors
  const color = new THREE.Color();
  const colorArray = new Float32Array(instanceCount * 3);

  for (let i = 0; i < instanceCount; i++) {
    color.setHSL(i / instanceCount, 1.0, 0.5);
    colorArray[i * 3] = color.r;
    colorArray[i * 3 + 1] = color.g;
    colorArray[i * 3 + 2] = color.b;
  }

  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);

  scene.add(mesh);

  // Store initial positions and velocities for animation
  const positions: THREE.Vector3[] = [];
  const velocities: THREE.Vector3[] = [];
  const rotations: THREE.Euler[] = [];
  const rotationSpeeds: THREE.Vector3[] = [];

  const dummy = new THREE.Object3D();

  for (let i = 0; i < instanceCount; i++) {
    positions.push(
      new THREE.Vector3(
        Math.random() * 2000 - 1000,
        Math.random() * 2000 - 1000,
        Math.random() * 2000 - 1000
      )
    );
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )
    );
    rotations.push(
      new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
    );
    rotationSpeeds.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      )
    );

    dummy.position.copy(positions[i]);
    dummy.rotation.copy(rotations[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

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

      // Update instance transforms
      for (let i = 0; i < instanceCount; i++) {
        // Update position
        positions[i].add(velocities[i]);

        // Bounce at boundaries
        if (Math.abs(positions[i].x) > 1000) velocities[i].x *= -1;
        if (Math.abs(positions[i].y) > 1000) velocities[i].y *= -1;
        if (Math.abs(positions[i].z) > 1000) velocities[i].z *= -1;

        // Update rotation
        rotations[i].x += rotationSpeeds[i].x;
        rotations[i].y += rotationSpeeds[i].y;
        rotations[i].z += rotationSpeeds[i].z;

        dummy.position.copy(positions[i]);
        dummy.rotation.copy(rotations[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;

      // Rotate camera around scene
      camera.position.x = Math.sin(time * 0.2) * 2000;
      camera.position.z = Math.cos(time * 0.2) * 2000;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - instancing performance' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing performance', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInstancingPerformance(a, win, { width: WIDTH, height: HEIGHT });
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
