/**
 * three.js webgl - morphtargets sphere
 *
 * Port of: three/examples/webgl_morphtargets_sphere.html
 *
 * Tests:
 * - Morph targets for sphere deformation
 * - Morphing between different shapes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMorphtargetsSphereParams {
  width?: number;
  height?: number;
}

export interface WebGLMorphtargetsSphereDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMorphtargetsSphere(
  a: App,
  win: ITsyneWindow,
  params: WebGLMorphtargetsSphereParams = {}
): Promise<WebGLMorphtargetsSphereDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 500);
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xff6600, 2, 300);
  pointLight1.position.set(100, 50, 50);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x0066ff, 2, 300);
  pointLight2.position.set(-100, -50, 50);
  scene.add(pointLight2);

  // Create sphere geometry with morph targets
  const geometry = new THREE.SphereGeometry(50, 32, 24);
  const positions = geometry.attributes.position;

  // Morph target 1: Cube-like shape
  const cubePositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const scale = 50 / Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) * (len / 50);
    cubePositions[i * 3] = x * scale * 0.7;
    cubePositions[i * 3 + 1] = y * scale * 0.7;
    cubePositions[i * 3 + 2] = z * scale * 0.7;
  }

  // Morph target 2: Spiky shape
  const spikyPositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const spike = 1 + Math.abs(Math.sin(x * 0.2) * Math.sin(y * 0.2) * Math.sin(z * 0.2)) * 0.5;
    spikyPositions[i * 3] = x * spike;
    spikyPositions[i * 3 + 1] = y * spike;
    spikyPositions[i * 3 + 2] = z * spike;
  }

  // Morph target 3: Twisted shape
  const twistedPositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const angle = y * 0.05;
    twistedPositions[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
    twistedPositions[i * 3 + 1] = y;
    twistedPositions[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
  }

  // Morph target 4: Flattened shape
  const flatPositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    flatPositions[i * 3] = x * 1.5;
    flatPositions[i * 3 + 1] = y * 0.3;
    flatPositions[i * 3 + 2] = z * 1.5;
  }

  // Set up morph targets
  geometry.morphAttributes.position = [
    new THREE.BufferAttribute(cubePositions, 3),
    new THREE.BufferAttribute(spikyPositions, 3),
    new THREE.BufferAttribute(twistedPositions, 3),
    new THREE.BufferAttribute(flatPositions, 3),
  ];

  const material = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    shininess: 50,
    specular: 0x444444,
    flatShading: false,
    morphTargets: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.morphTargetInfluences = [0, 0, 0, 0];
  scene.add(mesh);

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

      // Animate morph targets - cycle through each
      if (mesh.morphTargetInfluences) {
        const cycle = time * 0.3;
        const phase = cycle % 4;

        // Reset all
        mesh.morphTargetInfluences[0] = 0;
        mesh.morphTargetInfluences[1] = 0;
        mesh.morphTargetInfluences[2] = 0;
        mesh.morphTargetInfluences[3] = 0;

        // Smoothly transition between morphs
        const currentMorph = Math.floor(phase);
        const nextMorph = (currentMorph + 1) % 4;
        const blend = phase - currentMorph;

        mesh.morphTargetInfluences[currentMorph] = 1 - blend;
        mesh.morphTargetInfluences[nextMorph] = blend;
      }

      // Rotate mesh
      mesh.rotation.y = time * 0.5;
      mesh.rotation.x = Math.sin(time * 0.3) * 0.3;

      // Animate lights
      pointLight1.position.x = Math.sin(time) * 100;
      pointLight1.position.z = Math.cos(time) * 100;

      pointLight2.position.x = Math.sin(time + Math.PI) * 100;
      pointLight2.position.z = Math.cos(time + Math.PI) * 100;

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
    { title: 'three.js webgl - morphtargets sphere' },
    (a) => {
      a.window(
        { title: 'three.js webgl - morphtargets sphere', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMorphtargetsSphere(a, win, { width: WIDTH, height: HEIGHT });
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
