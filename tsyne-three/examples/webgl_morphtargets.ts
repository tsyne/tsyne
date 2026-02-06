/**
 * three.js webgl - morph targets
 *
 * Tests:
 * - Morph targets with procedural geometry
 * - Dynamic morph influence animation
 * - Multiple morph targets per geometry
 * - MeshBasicMaterial with wireframe
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMorphTargetsParams {
  width?: number;
  height?: number;
}

export interface WebGLMorphTargetsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMorphTargets(
  a: App,
  win: ITsyneWindow,
  params: WebGLMorphTargetsParams = {}
): Promise<WebGLMorphTargetsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Create a sphere with morph targets
  const geometry = new THREE.SphereGeometry(50, 32, 16);

  // Store original positions
  const positionAttribute = geometry.getAttribute('position');
  const originalPositions = new Float32Array(positionAttribute.array);

  // Create morph target 1: Spike outward
  const spikePositions = new Float32Array(positionAttribute.count * 3);
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    // Spike vertices based on Y position
    const spikeFactor = 1 + Math.abs(Math.sin(y * 0.1)) * 0.5;
    spikePositions[i * 3] = x * spikeFactor;
    spikePositions[i * 3 + 1] = y * spikeFactor;
    spikePositions[i * 3 + 2] = z * spikeFactor;
  }

  // Create morph target 2: Twist
  const twistPositions = new Float32Array(positionAttribute.count * 3);
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    // Twist around Y axis based on Y position
    const angle = y * 0.03;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    twistPositions[i * 3] = x * cos - z * sin;
    twistPositions[i * 3 + 1] = y;
    twistPositions[i * 3 + 2] = x * sin + z * cos;
  }

  // Create morph target 3: Flatten to disc
  const flatPositions = new Float32Array(positionAttribute.count * 3);
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    flatPositions[i * 3] = x * 1.5;
    flatPositions[i * 3 + 1] = y * 0.2;
    flatPositions[i * 3 + 2] = z * 1.5;
  }

  // Set morph targets
  geometry.morphAttributes.position = [
    new THREE.BufferAttribute(spikePositions, 3),
    new THREE.BufferAttribute(twistPositions, 3),
    new THREE.BufferAttribute(flatPositions, 3),
  ];

  const material = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    wireframe: true,
    morphTargets: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.morphTargetInfluences = [0, 0, 0];
  scene.add(mesh);

  // Create a second mesh with different colors
  const geometry2 = geometry.clone();
  const material2 = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    wireframe: true,
    morphTargets: true,
  });

  const mesh2 = new THREE.Mesh(geometry2, material2);
  mesh2.morphTargetInfluences = [0, 0, 0];
  mesh2.position.set(150, 0, 0);
  scene.add(mesh2);

  // Create a third mesh
  const geometry3 = geometry.clone();
  const material3 = new THREE.MeshBasicMaterial({
    color: 0x00ff55,
    wireframe: true,
    morphTargets: true,
  });

  const mesh3 = new THREE.Mesh(geometry3, material3);
  mesh3.morphTargetInfluences = [0, 0, 0];
  mesh3.position.set(-150, 0, 0);
  scene.add(mesh3);

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

      // Animate morph targets
      mesh.morphTargetInfluences![0] = Math.sin(time * 0.5) * 0.5 + 0.5;
      mesh.morphTargetInfluences![1] = Math.sin(time * 0.7) * 0.5 + 0.5;
      mesh.morphTargetInfluences![2] = Math.sin(time * 0.3) * 0.5 + 0.5;

      // Different phase for second mesh
      mesh2.morphTargetInfluences![0] = Math.sin(time * 0.5 + Math.PI * 0.33) * 0.5 + 0.5;
      mesh2.morphTargetInfluences![1] = Math.sin(time * 0.7 + Math.PI * 0.33) * 0.5 + 0.5;
      mesh2.morphTargetInfluences![2] = Math.sin(time * 0.3 + Math.PI * 0.33) * 0.5 + 0.5;

      // Different phase for third mesh
      mesh3.morphTargetInfluences![0] = Math.sin(time * 0.5 + Math.PI * 0.66) * 0.5 + 0.5;
      mesh3.morphTargetInfluences![1] = Math.sin(time * 0.7 + Math.PI * 0.66) * 0.5 + 0.5;
      mesh3.morphTargetInfluences![2] = Math.sin(time * 0.3 + Math.PI * 0.66) * 0.5 + 0.5;

      // Rotate meshes
      mesh.rotation.y = time * 0.3;
      mesh2.rotation.y = time * 0.3;
      mesh3.rotation.y = time * 0.3;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 300;
      camera.position.z = Math.cos(time * 0.2) * 300;
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
    { title: 'three.js webgl - morph targets' },
    (a) => {
      a.window(
        { title: 'three.js webgl - morph targets', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMorphTargets(a, win, { width: WIDTH, height: HEIGHT });
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
