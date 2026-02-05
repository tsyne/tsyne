/**
 * three.js webgl - furnace test
 *
 * Port of: three/examples/webgl_furnace_test.html
 *
 * Tests:
 * - Energy conservation in materials
 * - Multiple metalness/roughness combinations
 * - MeshStandardMaterial
 * - Grid of spheres for visual comparison
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

export interface WebGLFurnaceTestParams {
  width?: number;
  height?: number;
}

export interface WebGLFurnaceTestDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLFurnaceTest(
  a: App,
  win: Window,
  params: WebGLFurnaceTestParams = {}
): Promise<WebGLFurnaceTestDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, { width, height, windowId });

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 20);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight2.position.set(-5, -5, -5);
  scene.add(directionalLight2);

  // Create grid of spheres with varying metalness and roughness
  const gridSize = 7;
  const spacing = 2.5;
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const metalness = i / (gridSize - 1);
      const roughness = j / (gridSize - 1);

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: metalness,
        roughness: roughness,
      });

      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.position.x = (i - (gridSize - 1) / 2) * spacing;
      sphere.position.y = (j - (gridSize - 1) / 2) * spacing;
      scene.add(sphere);
    }
  }

  // Add reference labels using small boxes
  // Top row label (roughness = 0)
  for (let i = 0; i < gridSize; i++) {
    const labelGeom = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const metalVal = i / (gridSize - 1);
    const labelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(metalVal * 0.3, 1, 0.5) });
    const label = new THREE.Mesh(labelGeom, labelMat);
    label.position.x = (i - (gridSize - 1) / 2) * spacing;
    label.position.y = ((gridSize - 1) / 2 + 1) * spacing;
    scene.add(label);
  }

  // Left column label (metalness = 0)
  for (let j = 0; j < gridSize; j++) {
    const labelGeom = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const roughVal = j / (gridSize - 1);
    const labelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.6, 1 - roughVal, 0.5) });
    const label = new THREE.Mesh(labelGeom, labelMat);
    label.position.x = (-(gridSize - 1) / 2 - 1) * spacing;
    label.position.y = (j - (gridSize - 1) / 2) * spacing;
    scene.add(label);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Gentle rotation of camera around the grid
      camera.position.x = Math.sin(time * 0.2) * 5;
      camera.position.z = 20 + Math.cos(time * 0.2) * 5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  animate();

  return {
    stop: () => { running = false; },
    getTime: () => currentTime,
  };
}

async function main() {
  const WIDTH = 800, HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - furnace test' },
    (a) => {
      a.window({ title: 'three.js webgl - furnace test', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLFurnaceTest(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
