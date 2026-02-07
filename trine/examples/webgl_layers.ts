/**
 * three.js webgl - layers
 *
 * Tests:
 * - Object3D.layers system
 * - Camera layer filtering
 * - Selective rendering
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLayersParams {
  width?: number;
  height?: number;
}

export interface WebGLLayersDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLayers(
  a: App,
  win: ITsyneWindow,
  params: WebGLLayersParams = {}
): Promise<WebGLLayersDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);
  camera.layers.enableAll(); // Start with all layers visible

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Layer 0: Red cubes (default layer)
  const layer0Objects: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const geometry = new THREE.BoxGeometry(30, 30, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 4.5) * 40;
    mesh.position.y = 100;
    mesh.layers.set(0);
    scene.add(mesh);
    layer0Objects.push(mesh);
  }

  // Layer 1: Green spheres
  const layer1Objects: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const geometry = new THREE.SphereGeometry(20, 16, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 4.5) * 40;
    mesh.position.y = 0;
    mesh.layers.set(1);
    scene.add(mesh);
    layer1Objects.push(mesh);
  }

  // Layer 2: Blue tetrahedrons
  const layer2Objects: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const geometry = new THREE.TetrahedronGeometry(25);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 4.5) * 40;
    mesh.position.y = -100;
    mesh.layers.set(2);
    scene.add(mesh);
    layer2Objects.push(mesh);
  }

  // Objects visible on multiple layers
  const multiLayerObjects: THREE.Mesh[] = [];

  // Yellow torus visible on layers 0 and 1
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(30, 10, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
  );
  torus.position.set(-150, 50, 50);
  torus.layers.enable(0);
  torus.layers.enable(1);
  scene.add(torus);
  multiLayerObjects.push(torus);

  // Cyan cone visible on layers 1 and 2
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(25, 50, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
  );
  cone.position.set(150, -50, 50);
  cone.layers.enable(1);
  cone.layers.enable(2);
  scene.add(cone);
  multiLayerObjects.push(cone);

  // Magenta knot visible on all layers
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(25, 8, 64, 8),
    new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
  );
  knot.position.set(0, 0, 100);
  knot.layers.enableAll();
  scene.add(knot);
  multiLayerObjects.push(knot);

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Cycle through layer visibility every 2 seconds
      const layerCycle = Math.floor(time / 2) % 4;

      camera.layers.disableAll();
      switch (layerCycle) {
        case 0:
          camera.layers.enableAll();
          break;
        case 1:
          camera.layers.enable(0);
          camera.layers.enable(1);
          break;
        case 2:
          camera.layers.enable(1);
          camera.layers.enable(2);
          break;
        case 3:
          camera.layers.enable(0);
          camera.layers.enable(2);
          break;
      }

      // Rotate layer 0 objects
      for (const obj of layer0Objects) {
        obj.rotation.x = time * 0.5;
        obj.rotation.y = time * 0.3;
      }

      // Rotate layer 1 objects
      for (const obj of layer1Objects) {
        obj.rotation.y = time * 0.4;
      }

      // Rotate layer 2 objects
      for (const obj of layer2Objects) {
        obj.rotation.x = time * 0.3;
        obj.rotation.z = time * 0.2;
      }

      // Rotate multi-layer objects
      for (const obj of multiLayerObjects) {
        obj.rotation.x = time * 0.4;
        obj.rotation.y = time * 0.5;
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
    { title: 'three.js webgl - layers' },
    (a) => {
      a.window(
        { title: 'three.js webgl - layers', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLayers(a, win, { width: WIDTH, height: HEIGHT });
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
