/**
 * three.js webgl - materials variations basic
 *
 * Port of: three/examples/webgl_materials_variations_basic.html
 *
 * Tests:
 * - MeshBasicMaterial variations
 * - Color, opacity, wireframe combinations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsVariationsBasicParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsVariationsBasicDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsVariationsBasic(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsVariationsBasicParams = {}
): Promise<WebGLMaterialsVariationsBasicDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const meshes: any[] = [];

  // Row 1: Different colors
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshBasicMaterial({ color: colors[i] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 150;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Different opacities
  const opacities = [0.2, 0.4, 0.6, 0.8, 1.0];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: opacities[i],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Wireframe variations
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 5, 1, 0.5),
      wireframe: i % 2 === 1,
      transparent: i > 2,
      opacity: i > 2 ? 0.5 : 1.0,
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

      meshes.forEach((mesh, i) => {
        mesh.rotation.y = time * 0.5;
        mesh.rotation.x = time * 0.25;
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
    { title: 'three.js webgl - materials variations basic' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials variations basic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsVariationsBasic(a, win, { width: WIDTH, height: HEIGHT });
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
