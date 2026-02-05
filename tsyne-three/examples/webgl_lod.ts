/**
 * three.js webgl - LOD (Level of Detail)
 *
 * Tests:
 * - LOD object with multiple detail levels
 * - Distance-based mesh switching
 * - Performance optimization concept
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLodParams {
  width?: number;
  height?: number;
}

export interface WebGLLodDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLod(
  a: App,
  win: Window,
  params: WebGLLodParams = {}
): Promise<WebGLLodDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
  camera.position.set(0, 0, 1000);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  const lods: THREE.LOD[] = [];

  // Create multiple LOD objects
  for (let i = 0; i < 50; i++) {
    const lod = new THREE.LOD();

    // High detail (close)
    const highGeometry = new THREE.IcosahedronGeometry(20, 3);
    const highMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 50, 1, 0.5),
      wireframe: true,
    });
    const highMesh = new THREE.Mesh(highGeometry, highMaterial);
    lod.addLevel(highMesh, 0);

    // Medium detail
    const medGeometry = new THREE.IcosahedronGeometry(20, 1);
    const medMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 50, 0.8, 0.5),
      wireframe: true,
    });
    const medMesh = new THREE.Mesh(medGeometry, medMaterial);
    lod.addLevel(medMesh, 200);

    // Low detail (far)
    const lowGeometry = new THREE.IcosahedronGeometry(20, 0);
    const lowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 50, 0.6, 0.5),
      wireframe: true,
    });
    const lowMesh = new THREE.Mesh(lowGeometry, lowMaterial);
    lod.addLevel(lowMesh, 500);

    // Very low detail (very far) - just a point
    const veryLowGeometry = new THREE.TetrahedronGeometry(15);
    const veryLowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 50, 0.4, 0.5),
      wireframe: true,
    });
    const veryLowMesh = new THREE.Mesh(veryLowGeometry, veryLowMaterial);
    lod.addLevel(veryLowMesh, 800);

    // Random position in a sphere
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const r = 200 + Math.random() * 600;

    lod.position.set(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.sin(theta) * Math.sin(phi),
      r * Math.cos(theta)
    );

    scene.add(lod);
    lods.push(lod);
  }

  // Add torus knot LODs
  for (let i = 0; i < 20; i++) {
    const lod = new THREE.LOD();

    // High detail
    const highGeometry = new THREE.TorusKnotGeometry(15, 5, 100, 16);
    const highMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.5 + i / 40, 1, 0.5),
      wireframe: true,
    });
    lod.addLevel(new THREE.Mesh(highGeometry, highMaterial), 0);

    // Medium detail
    const medGeometry = new THREE.TorusKnotGeometry(15, 5, 50, 8);
    const medMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.5 + i / 40, 0.8, 0.5),
      wireframe: true,
    });
    lod.addLevel(new THREE.Mesh(medGeometry, medMaterial), 300);

    // Low detail
    const lowGeometry = new THREE.TorusKnotGeometry(15, 5, 20, 4);
    const lowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.5 + i / 40, 0.6, 0.5),
      wireframe: true,
    });
    lod.addLevel(new THREE.Mesh(lowGeometry, lowMaterial), 600);

    // Position in a ring
    const angle = (i / 20) * Math.PI * 2;
    lod.position.set(
      Math.cos(angle) * 400,
      (Math.random() - 0.5) * 200,
      Math.sin(angle) * 400
    );

    scene.add(lod);
    lods.push(lod);
  }

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

      // Move camera in and out
      camera.position.z = 1000 + Math.sin(time * 0.3) * 800;
      camera.position.x = Math.sin(time * 0.2) * 300;
      camera.position.y = Math.cos(time * 0.15) * 200;
      camera.lookAt(0, 0, 0);

      // Update LODs
      for (const lod of lods) {
        lod.update(camera);
        lod.rotation.y = time * 0.2;
      }

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
    { title: 'three.js webgl - LOD' },
    (a) => {
      a.window(
        { title: 'three.js webgl - LOD', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLod(a, win, { width: WIDTH, height: HEIGHT });
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
