/**
 * three.js webgl - materials - alpha hash
 *
 * Port of: three/examples/webgl_materials_alphahash.html
 *
 * Tests:
 * - MeshStandardMaterial with alphaHash property
 * - InstancedMesh with per-instance colors
 * - Alpha hash transparency technique (order-independent transparency)
 * - Opacity variations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsAlphaHashParams {
  width?: number;
  height?: number;
  amount?: number; // Grid size (amount^3 instances)
}

export interface WebGLMaterialsAlphaHashDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsAlphaHash(
  a: App,
  win: Window,
  params: WebGLMaterialsAlphaHashParams = {}
): Promise<WebGLMaterialsAlphaHashDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const amount = params.amount ?? 3; // Default to 3x3x3 = 27 instances
  const count = Math.pow(amount, 3);

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(amount, amount, amount);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();

  // Lights for PBR material
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 50);
  pointLight1.position.set(amount, amount, amount);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x4488ff, 0.5, 50);
  pointLight2.position.set(-amount, -amount, -amount);
  scene.add(pointLight2);

  // Create geometry and material
  const geometry = new THREE.IcosahedronGeometry(0.5, 3);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    alphaHash: true,
    opacity: 0.5,
  });

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  let i = 0;
  const offset = (amount - 1) / 2;

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  // Position instances in a 3D grid with random colors
  for (let x = 0; x < amount; x++) {
    for (let y = 0; y < amount; y++) {
      for (let z = 0; z < amount; z++) {
        matrix.setPosition(offset - x, offset - y, offset - z);

        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color.setHex(Math.random() * 0xffffff));

        i++;
      }
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  scene.add(mesh);

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

      // Rotate mesh for better alpha hash visualization
      mesh.rotation.x = time * 0.1;
      mesh.rotation.y = time * 0.15;

      // Animate camera
      const radius = amount * 1.5;
      camera.position.x = Math.sin(time * 0.2) * radius;
      camera.position.z = Math.cos(time * 0.2) * radius;
      camera.position.y = Math.sin(time * 0.1) * radius * 0.5 + amount;
      camera.lookAt(0, 0, 0);

      // Animate lights
      pointLight1.position.x = Math.sin(time) * amount;
      pointLight1.position.z = Math.cos(time) * amount;

      pointLight2.position.x = Math.sin(time + Math.PI) * amount;
      pointLight2.position.z = Math.cos(time + Math.PI) * amount;

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
    { title: 'three.js webgl - materials - alpha hash' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - alpha hash', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsAlphaHash(a, win, { width: WIDTH, height: HEIGHT });
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
