/**
 * three.js webgl - instancing dynamic
 *
 * Tests:
 * - Dynamic instance matrix updates
 * - Per-frame instance transforms
 * - InstancedMesh with animated instances
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInstancingDynamicParams {
  width?: number;
  height?: number;
}

export interface WebGLInstancingDynamicDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInstancingDynamic(
  a: App,
  win: ITsyneWindow,
  params: WebGLInstancingDynamicParams = {}
): Promise<WebGLInstancingDynamicDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
  camera.position.set(0, 0, 1000);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Instance configuration
  const instanceCount = 500;
  const geometry = new THREE.IcosahedronGeometry(15, 1);
  const material = new THREE.MeshBasicMaterial({ wireframe: true });

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  scene.add(mesh);

  // Store instance data for animation
  interface InstanceData {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    rotationSpeed: THREE.Vector3;
    scale: number;
    scaleSpeed: number;
    orbitRadius: number;
    orbitSpeed: number;
    orbitOffset: number;
  }

  const instances: InstanceData[] = [];
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const quaternion = new THREE.Quaternion();

  for (let i = 0; i < instanceCount; i++) {
    const orbitRadius = 100 + Math.random() * 400;
    const angle = Math.random() * Math.PI * 2;
    
    instances.push({
      position: new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        (Math.random() - 0.5) * 300,
        Math.sin(angle) * orbitRadius
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      scale: 0.5 + Math.random(),
      scaleSpeed: (Math.random() - 0.5) * 0.02,
      orbitRadius,
      orbitSpeed: (Math.random() - 0.5) * 0.02,
      orbitOffset: angle,
    });

    // Initial color
    color.setHSL(i / instanceCount, 1, 0.5);
    mesh.setColorAt(i, color);
  }

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  // Create a central attractor
  const attractorGeometry = new THREE.SphereGeometry(30, 16, 12);
  const attractorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  const attractor = new THREE.Mesh(attractorGeometry, attractorMaterial);
  scene.add(attractor);

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

      // Update each instance
      for (let i = 0; i < instanceCount; i++) {
        const inst = instances[i];

        // Orbital motion
        const angle = inst.orbitOffset + time * inst.orbitSpeed;
        const targetX = Math.cos(angle) * inst.orbitRadius;
        const targetZ = Math.sin(angle) * inst.orbitRadius;

        // Smooth towards orbital position with some noise
        inst.position.x += (targetX - inst.position.x) * 0.02 + inst.velocity.x;
        inst.position.z += (targetZ - inst.position.z) * 0.02 + inst.velocity.z;
        inst.position.y += Math.sin(time + i) * 0.5;

        // Update rotation
        inst.rotation.x += inst.rotationSpeed.x;
        inst.rotation.y += inst.rotationSpeed.y;
        inst.rotation.z += inst.rotationSpeed.z;

        // Pulsing scale
        const scale = inst.scale + Math.sin(time * 2 + i * 0.1) * 0.2;

        // Build transformation matrix
        quaternion.setFromEuler(inst.rotation);
        matrix.compose(inst.position, quaternion, new THREE.Vector3(scale, scale, scale));
        mesh.setMatrixAt(i, matrix);

        // Update colors based on distance from center
        const distance = inst.position.length();
        color.setHSL((distance / 500 + time * 0.1) % 1, 1, 0.5);
        mesh.setColorAt(i, color);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }

      // Pulse attractor
      const attractorScale = 1 + Math.sin(time * 3) * 0.2;
      attractor.scale.set(attractorScale, attractorScale, attractorScale);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 800;
      camera.position.z = Math.cos(time * 0.2) * 800;
      camera.position.y = Math.sin(time * 0.15) * 300;
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
    { title: 'three.js webgl - instancing dynamic' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing dynamic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInstancingDynamic(a, win, { width: WIDTH, height: HEIGHT });
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
