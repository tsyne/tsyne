/**
 * Simple test - MeshBasicMaterial with solid colors (no vertex colors)
 * This should work based on webgl_geometry_cube success
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

export interface BasicTestDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildBasicTest(
  a: App,
  win: ITsyneWindow,
  params: { width?: number; height?: number } = {}
): Promise<BasicTestDemo> {
  const width = params.width ?? 400;
  const height = params.height ?? 300;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // Scene setup
  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 3;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Simple cubes with solid MeshBasicMaterial colors (no vertex colors)
  const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xff0000 }), // red
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // green  
    new THREE.MeshBasicMaterial({ color: 0x0000ff }), // blue
  ];

  const cube1 = new THREE.Mesh(geometry, materials[0]);
  cube1.position.x = -1.5;
  scene.add(cube1);

  const cube2 = new THREE.Mesh(geometry, materials[1]);
  scene.add(cube2);

  const cube3 = new THREE.Mesh(geometry, materials[2]);
  cube3.position.x = 1.5;
  scene.add(cube3);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  let running = true;
  let time = 0;

  const animate = async () => {
    while (running) {
      time += 16;
      
      // Rotate cubes
      cube1.rotation.y = time * 0.001;
      cube2.rotation.y = time * 0.001 + 2;
      cube3.rotation.y = time * 0.001 + 4;

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
    stop: () => { running = false; },
    getTime: () => time,
  };
}

// Standalone entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Basic Test', shutdownStrategy: standaloneShutdownStrategy() }, async (a) => {
    a.window({ title: 'Basic Test', width: 450, height: 350 }, async (win) => {
      await buildBasicTest(a, win);
      win.show();
    });
  });
}
