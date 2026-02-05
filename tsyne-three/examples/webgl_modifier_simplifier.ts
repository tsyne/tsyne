/**
 * three.js webgl - modifier simplifier
 *
 * Port of: three/examples/webgl_modifier_simplifier.html
 *
 * Tests:
 * - Geometry simplification concept
 * - Different LOD levels displayed side by side
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierSimplifierParams {
  width?: number;
  height?: number;
}

export interface WebGLModifierSimplifierDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierSimplifier(
  a: App,
  win: Window,
  params: WebGLModifierSimplifierParams = {}
): Promise<WebGLModifierSimplifierDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create spheres with different detail levels (simulating simplification)
  const materials = new THREE.MeshPhongMaterial({
    color: 0x156289,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  // High detail (128 segments)
  const highDetailGeom = new THREE.SphereGeometry(50, 64, 32);
  const highDetailMesh = new THREE.Mesh(highDetailGeom, materials);
  highDetailMesh.position.x = -150;
  scene.add(highDetailMesh);

  // Medium detail (32 segments)
  const medDetailGeom = new THREE.SphereGeometry(50, 16, 8);
  const medDetailMesh = new THREE.Mesh(medDetailGeom, materials.clone());
  medDetailMesh.position.x = -50;
  scene.add(medDetailMesh);

  // Low detail (16 segments)
  const lowDetailGeom = new THREE.SphereGeometry(50, 8, 4);
  const lowDetailMesh = new THREE.Mesh(lowDetailGeom, materials.clone());
  lowDetailMesh.position.x = 50;
  scene.add(lowDetailMesh);

  // Very low detail (8 segments)
  const veryLowDetailGeom = new THREE.SphereGeometry(50, 4, 2);
  const veryLowDetailMesh = new THREE.Mesh(veryLowDetailGeom, materials.clone());
  veryLowDetailMesh.position.x = 150;
  scene.add(veryLowDetailMesh);

  // Add wireframe overlays
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  const wireHigh = new THREE.Mesh(highDetailGeom.clone(), wireframeMaterial);
  wireHigh.position.copy(highDetailMesh.position);
  scene.add(wireHigh);

  const wireMed = new THREE.Mesh(medDetailGeom.clone(), wireframeMaterial.clone());
  wireMed.position.copy(medDetailMesh.position);
  scene.add(wireMed);

  const wireLow = new THREE.Mesh(lowDetailGeom.clone(), wireframeMaterial.clone());
  wireLow.position.copy(lowDetailMesh.position);
  scene.add(wireLow);

  const wireVeryLow = new THREE.Mesh(veryLowDetailGeom.clone(), wireframeMaterial.clone());
  wireVeryLow.position.copy(veryLowDetailMesh.position);
  scene.add(wireVeryLow);

  const meshes = [
    highDetailMesh, medDetailMesh, lowDetailMesh, veryLowDetailMesh,
    wireHigh, wireMed, wireLow, wireVeryLow
  ];

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

      meshes.forEach((mesh) => {
        mesh.rotation.y = time * 0.3;
        mesh.rotation.x = time * 0.15;
      });

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
    { title: 'three.js webgl - modifier simplifier' },
    (a) => {
      a.window(
        { title: 'three.js webgl - modifier simplifier', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierSimplifier(a, win, { width: WIDTH, height: HEIGHT });
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
