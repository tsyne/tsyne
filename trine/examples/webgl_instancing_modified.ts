/**
 * three.js webgl - instancing modified
 *
 * Port of: three/examples/webgl_instancing_modified.html
 *
 * Tests:
 * - InstancedMesh with modified instances
 * - Per-instance color modification
 * - Per-instance matrix modification
 * - Dynamic instance updates
 *
 * Adaptations for Tsyne:
 * - Procedural geometry
 * - Animated instance modifications
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInstancingModifiedParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLInstancingModifiedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInstancingModified(
  a: App,
  win: ITsyneWindow,
  params: WebGLInstancingModifiedParams = {}
): Promise<WebGLInstancingModifiedDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 1000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // Lights
  const light1 = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
  light2.position.set(1, 1, 1);
  scene.add(light2);

  // ─────────────────────────────────────────────────────────────────────────
  // Create instanced mesh
  // ─────────────────────────────────────────────────────────════════════════

  const geometry = new THREE.IcosahedronGeometry(5, 1);
  const material = new THREE.MeshPhongMaterial({
    shininess: 60,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  // Store initial positions and velocities
  const positions: THREE.Vector3[] = [];
  const velocities: THREE.Vector3[] = [];
  const rotations: THREE.Euler[] = [];
  const rotationSpeeds: THREE.Vector3[] = [];
  const scales: number[] = [];
  const colors: THREE.Color[] = [];

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Initialize instances
  for (let i = 0; i < instanceCount; i++) {
    // Random position in sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 200 + Math.random() * 300;

    positions.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    ));

    // Random velocity
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    ));

    // Random rotation
    rotations.push(new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ));

    // Random rotation speed
    rotationSpeeds.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    ));

    // Random scale
    scales.push(0.5 + Math.random() * 1.5);

    // Random color
    colors.push(new THREE.Color().setHSL(Math.random(), 0.8, 0.5));

    // Set initial matrix
    dummy.position.copy(positions[i]);
    dummy.rotation.copy(rotations[i]);
    dummy.scale.setScalar(scales[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, colors[i]);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Update each instance
      for (let i = 0; i < instanceCount; i++) {
        // Update position
        positions[i].add(velocities[i]);

        // Boundary bounce
        const bounds = 500;
        for (let j = 0; j < 3; j++) {
          const axis = ['x', 'y', 'z'][j] as 'x' | 'y' | 'z';
          if (Math.abs(positions[i][axis]) > bounds) {
            velocities[i][axis] *= -1;
            positions[i][axis] = Math.sign(positions[i][axis]) * bounds;
          }
        }

        // Update rotation
        rotations[i].x += rotationSpeeds[i].x;
        rotations[i].y += rotationSpeeds[i].y;
        rotations[i].z += rotationSpeeds[i].z;

        // Pulsing scale
        const pulseScale = scales[i] * (1 + 0.2 * Math.sin(time * 2 + i * 0.1));

        // Update matrix
        dummy.position.copy(positions[i]);
        dummy.rotation.copy(rotations[i]);
        dummy.scale.setScalar(pulseScale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // Update color based on velocity
        const speed = velocities[i].length();
        color.copy(colors[i]);
        color.offsetHSL(Math.sin(time + i * 0.05) * 0.1, 0, speed * 0.1 - 0.05);
        mesh.setColorAt(i, color);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 800;
      camera.position.z = Math.cos(time * 0.2) * 800;
      camera.position.y = Math.sin(time * 0.1) * 300;
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
    { title: 'three.js webgl - instancing modified' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing modified', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInstancingModified(a, win, { width: WIDTH, height: HEIGHT });
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
