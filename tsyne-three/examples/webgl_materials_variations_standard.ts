/**
 * three.js webgl - materials variations standard
 *
 * Port of: three/examples/webgl_materials_variations_standard.html
 *
 * Tests:
 * - MeshStandardMaterial variations
 * - Roughness, metalness properties
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsVariationsStandardParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsVariationsStandardDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsVariationsStandard(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsVariationsStandardParams = {}
): Promise<WebGLMaterialsVariationsStandardDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights for PBR
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0xffffff, 1, 500);
  pointLight1.position.set(200, 100, 100);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x4488ff, 1, 500);
  pointLight2.position.set(-200, 100, -100);
  scene.add(pointLight2);

  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const meshes: any[] = [];

  // Row 1: Metalness variations (0 to 1)
  for (let i = 0; i < 5; i++) {
    const metalness = i / 4;
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: metalness,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 150;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Roughness variations (0 to 1)
  for (let i = 0; i < 5; i++) {
    const roughness = i / 4;
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.5,
      roughness: roughness,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Colored metals
  const metalColors = [0xffcc00, 0xcccccc, 0xff6633, 0x33ccff, 0xff3366];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: metalColors[i],
      metalness: 0.9,
      roughness: 0.2 + (i * 0.1),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = -150;
    scene.add(mesh);
    meshes.push(mesh);
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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate lights
      pointLight1.position.x = Math.sin(time) * 200;
      pointLight1.position.z = Math.cos(time) * 200;

      pointLight2.position.x = Math.sin(time + Math.PI) * 200;
      pointLight2.position.z = Math.cos(time + Math.PI) * 200;

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
    { title: 'three.js webgl - materials variations standard' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials variations standard', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsVariationsStandard(a, win, { width: WIDTH, height: HEIGHT });
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
