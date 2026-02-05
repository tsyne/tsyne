/**
 * three.js webgl - buffergeometry - morph targets
 *
 * Port of: three/examples/webgl_buffergeometry_morphtargets.html
 *
 * Tests:
 * - Morph targets with BufferGeometry
 * - Multiple morph target shapes
 * - Smooth animation between shapes
 * - Custom geometry with morph attributes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryMorphTargetsParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryMorphTargetsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryMorphTargets(
  a: App,
  win: Window,
  params: WebGLBufferGeometryMorphTargetsParams = {}
): Promise<WebGLBufferGeometryMorphTargetsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222244);

  // Lights
  const light1 = new THREE.PointLight(0xff6666, 3, 500);
  light1.position.set(100, 100, 100);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x6666ff, 3, 500);
  light2.position.set(-100, -100, 100);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create geometry with morph targets
  // ─────────────────────────────────────────────────────────────────────────

  // Base sphere geometry
  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const positionAttribute = geometry.getAttribute('position');
  const vertexCount = positionAttribute.count;

  // Store original positions
  const originalPositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) {
    originalPositions[i] = positionAttribute.array[i];
  }

  // Morph target 1: Cube-like shape
  const cubePositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    // Normalize and then cube-ify
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // Move towards cube corners
    const maxAbs = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
    const scale = 50 / maxAbs;

    cubePositions[i * 3] = nx * scale;
    cubePositions[i * 3 + 1] = ny * scale;
    cubePositions[i * 3 + 2] = nz * scale;
  }

  // Morph target 2: Spiky shape
  const spikyPositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // Create spikes based on angle
    const angle = Math.atan2(ny, nx) * 8 + Math.atan2(nz, Math.sqrt(nx * nx + ny * ny)) * 6;
    const spike = 1 + Math.abs(Math.sin(angle)) * 0.8;

    spikyPositions[i * 3] = x * spike;
    spikyPositions[i * 3 + 1] = y * spike;
    spikyPositions[i * 3 + 2] = z * spike;
  }

  // Morph target 3: Twisted shape
  const twistedPositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    // Twist around Y axis based on Y position
    const twistAngle = y * 0.05;
    const cos = Math.cos(twistAngle);
    const sin = Math.sin(twistAngle);

    twistedPositions[i * 3] = x * cos - z * sin;
    twistedPositions[i * 3 + 1] = y;
    twistedPositions[i * 3 + 2] = x * sin + z * cos;
  }

  // Morph target 4: Flattened disc
  const discPositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = originalPositions[i * 3];
    const y = originalPositions[i * 3 + 1];
    const z = originalPositions[i * 3 + 2];

    discPositions[i * 3] = x * 1.5;
    discPositions[i * 3 + 1] = y * 0.1;
    discPositions[i * 3 + 2] = z * 1.5;
  }

  // Set morph attributes
  geometry.morphAttributes.position = [
    new THREE.BufferAttribute(cubePositions, 3),
    new THREE.BufferAttribute(spikyPositions, 3),
    new THREE.BufferAttribute(twistedPositions, 3),
    new THREE.BufferAttribute(discPositions, 3),
  ];

  // Material
  const material = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    shininess: 100,
    morphTargets: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.morphTargetInfluences = [0, 0, 0, 0];
  scene.add(mesh);

  // Add wireframe overlay
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.1,
    morphTargets: true,
  });
  const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
  wireframe.morphTargetInfluences = mesh.morphTargetInfluences;
  scene.add(wireframe);

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate morph target influences
      mesh.morphTargetInfluences![0] = Math.max(0, Math.sin(time * 0.5));
      mesh.morphTargetInfluences![1] = Math.max(0, Math.sin(time * 0.5 + Math.PI * 0.5));
      mesh.morphTargetInfluences![2] = Math.max(0, Math.sin(time * 0.5 + Math.PI));
      mesh.morphTargetInfluences![3] = Math.max(0, Math.sin(time * 0.5 + Math.PI * 1.5));

      // Rotate mesh
      mesh.rotation.y = time * 0.3;
      mesh.rotation.x = Math.sin(time * 0.2) * 0.3;
      wireframe.rotation.copy(mesh.rotation);

      // Animate lights
      light1.position.x = Math.sin(time) * 150;
      light1.position.y = Math.cos(time * 0.7) * 150;

      light2.position.x = Math.cos(time) * 150;
      light2.position.z = Math.sin(time * 0.8) * 150;

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
    { title: 'three.js webgl - buffergeometry - morph targets' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry - morph targets', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryMorphTargets(a, win, { width: WIDTH, height: HEIGHT });
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
