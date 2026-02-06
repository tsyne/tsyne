/**
 * three.js webgl - materials variations phong
 *
 * Port of: three/examples/webgl_materials_variations_phong.html
 *
 * Tests:
 * - MeshPhongMaterial variations
 * - Shininess, specular, emissive properties
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsVariationsPhongParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsVariationsPhongDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsVariationsPhong(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsVariationsPhongParams = {}
): Promise<WebGLMaterialsVariationsPhongDemo> {
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

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 500);
  pointLight.position.set(100, 100, 100);
  scene.add(pointLight);

  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const meshes: any[] = [];

  // Row 1: Different shininess values (low to high)
  const shininessValues = [5, 10, 30, 60, 100];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: 0x156289,
      shininess: shininessValues[i],
      specular: 0x222222,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 150;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Different specular colors
  const specularColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xffffff];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 50,
      specular: specularColors[i],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Emissive and flat shading
  for (let i = 0; i < 5; i++) {
    const hue = i / 5;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.4),
      shininess: 30,
      specular: 0x333333,
      emissive: new THREE.Color().setHSL(hue, 0.5, 0.1),
      flatShading: i % 2 === 0,
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

      // Animate point light
      pointLight.position.x = Math.sin(time) * 200;
      pointLight.position.z = Math.cos(time) * 200;

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
    { title: 'three.js webgl - materials variations phong' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials variations phong', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsVariationsPhong(a, win, { width: WIDTH, height: HEIGHT });
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
