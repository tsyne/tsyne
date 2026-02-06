/**
 * three.js webgl - modifier subdivision
 *
 * Port of: three/examples/webgl_modifier_subdivision.html
 *
 * Tests:
 * - Subdivision surface concept
 * - Different subdivision levels displayed side by side
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierSubdivisionParams {
  width?: number;
  height?: number;
}

export interface WebGLModifierSubdivisionDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierSubdivision(
  a: App,
  win: ITsyneWindow,
  params: WebGLModifierSubdivisionParams = {}
): Promise<WebGLModifierSubdivisionDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

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

  // Create boxes with increasing subdivisions (simulating subdivision surfaces)
  const materials = new THREE.MeshPhongMaterial({
    color: 0x156289,
    flatShading: false,
  });

  // Low subdivision (1x1x1 box segments)
  const lowSubdivGeom = new THREE.BoxGeometry(60, 60, 60, 1, 1, 1);
  const lowSubdivMesh = new THREE.Mesh(lowSubdivGeom, materials);
  lowSubdivMesh.position.x = -150;
  scene.add(lowSubdivMesh);

  // Medium subdivision (2x2x2)
  const medSubdivGeom = new THREE.BoxGeometry(60, 60, 60, 2, 2, 2);
  const medSubdivMesh = new THREE.Mesh(medSubdivGeom, materials.clone());
  medSubdivMesh.position.x = -50;
  scene.add(medSubdivMesh);

  // High subdivision (4x4x4)
  const highSubdivGeom = new THREE.BoxGeometry(60, 60, 60, 4, 4, 4);
  const highSubdivMesh = new THREE.Mesh(highSubdivGeom, materials.clone());
  highSubdivMesh.position.x = 50;
  scene.add(highSubdivMesh);

  // Very high subdivision (8x8x8)
  const veryHighSubdivGeom = new THREE.BoxGeometry(60, 60, 60, 8, 8, 8);
  const veryHighSubdivMesh = new THREE.Mesh(veryHighSubdivGeom, materials.clone());
  veryHighSubdivMesh.position.x = 150;
  scene.add(veryHighSubdivMesh);

  // Add wireframe overlays
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });

  const wireLow = new THREE.Mesh(lowSubdivGeom.clone(), wireframeMaterial);
  wireLow.position.copy(lowSubdivMesh.position);
  scene.add(wireLow);

  const wireMed = new THREE.Mesh(medSubdivGeom.clone(), wireframeMaterial.clone());
  wireMed.position.copy(medSubdivMesh.position);
  scene.add(wireMed);

  const wireHigh = new THREE.Mesh(highSubdivGeom.clone(), wireframeMaterial.clone());
  wireHigh.position.copy(highSubdivMesh.position);
  scene.add(wireHigh);

  const wireVeryHigh = new THREE.Mesh(veryHighSubdivGeom.clone(), wireframeMaterial.clone());
  wireVeryHigh.position.copy(veryHighSubdivMesh.position);
  scene.add(wireVeryHigh);

  const meshes = [
    lowSubdivMesh, medSubdivMesh, highSubdivMesh, veryHighSubdivMesh,
    wireLow, wireMed, wireHigh, wireVeryHigh
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
    { title: 'three.js webgl - modifier subdivision' },
    (a) => {
      a.window(
        { title: 'three.js webgl - modifier subdivision', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierSubdivision(a, win, { width: WIDTH, height: HEIGHT });
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
