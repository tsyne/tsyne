/**
 * three.js webgl - animation oscillators
 *
 * Tests:
 * - Multiple oscillating objects
 * - Sine/cosine wave animations
 * - Phase-shifted movements
 * - Procedural animation without AnimationMixer
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLAnimationOscillatorsParams {
  width?: number;
  height?: number;
  objectCount?: number;
}

export interface WebGLAnimationOscillatorsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLAnimationOscillators(
  a: App,
  win: ITsyneWindow,
  params: WebGLAnimationOscillatorsParams = {}
): Promise<WebGLAnimationOscillatorsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const objectCount = params.objectCount ?? 100;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.z = 600;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // ─────────────────────────────────────────────────────────────────────────
  // Create oscillating objects
  // ─────────────────────────────────────────────────────────────────────────

  interface Oscillator {
    mesh: THREE.Mesh;
    baseY: number;
    amplitude: number;
    frequency: number;
    phase: number;
    rotationSpeed: THREE.Vector3;
  }

  const oscillators: Oscillator[] = [];

  // Create grid of oscillating objects
  const gridSize = Math.ceil(Math.sqrt(objectCount));
  const spacing = 50;
  const offset = ((gridSize - 1) * spacing) / 2;

  const geometries = [
    new THREE.BoxGeometry(15, 15, 15),
    new THREE.SphereGeometry(10, 16, 12),
    new THREE.ConeGeometry(10, 20, 8),
    new THREE.OctahedronGeometry(12),
    new THREE.TetrahedronGeometry(12),
  ];

  let idx = 0;
  for (let x = 0; x < gridSize && idx < objectCount; x++) {
    for (let z = 0; z < gridSize && idx < objectCount; z++) {
      const geometry = geometries[idx % geometries.length];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(idx / objectCount, 0.7, 0.5),
        wireframe: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const posX = x * spacing - offset;
      const posZ = z * spacing - offset;

      mesh.position.set(posX, 0, posZ);

      const oscillator: Oscillator = {
        mesh,
        baseY: 0,
        amplitude: 30 + Math.random() * 40,
        frequency: 0.5 + Math.random() * 1.5,
        phase: (x + z) * 0.5,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
      };

      oscillators.push(oscillator);
      scene.add(mesh);
      idx++;
    }
  }

  // Add central larger object
  const centralGeometry = new THREE.TorusKnotGeometry(30, 10, 100, 16);
  const centralMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const centralMesh = new THREE.Mesh(centralGeometry, centralMaterial);
  scene.add(centralMesh);

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

      // Animate each oscillator
      for (const osc of oscillators) {
        // Vertical oscillation
        osc.mesh.position.y = osc.baseY + Math.sin(time * osc.frequency + osc.phase) * osc.amplitude;

        // Rotation
        osc.mesh.rotation.x += osc.rotationSpeed.x * 0.01;
        osc.mesh.rotation.y += osc.rotationSpeed.y * 0.01;
        osc.mesh.rotation.z += osc.rotationSpeed.z * 0.01;

        // Scale pulsing
        const scale = 1 + 0.2 * Math.sin(time * 2 + osc.phase);
        osc.mesh.scale.setScalar(scale);
      }

      // Central object animation
      centralMesh.rotation.x = time * 0.3;
      centralMesh.rotation.y = time * 0.5;
      centralMesh.position.y = Math.sin(time) * 50;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 500;
      camera.position.z = Math.cos(time * 0.2) * 500;
      camera.position.y = 150 + Math.sin(time * 0.1) * 100;
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
    { title: 'three.js webgl - animation oscillators' },
    (a) => {
      a.window(
        { title: 'three.js webgl - animation oscillators', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLAnimationOscillators(a, win, { width: WIDTH, height: HEIGHT });
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
