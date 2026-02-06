/**
 * Simple test: Grid + solid cube
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

export interface Params { width?: number; height?: number; }
export interface Demo { stop: () => void; getTime: () => number; }

export async function buildDemo(a: App, win: ITsyneWindow, params: Params = {}): Promise<Demo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.set(100, 100, 100);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Grid
  const grid = new THREE.GridHelper(200, 20, 0xff0000, 0x444444);
  scene.add(grid);

  // Simple green solid cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(30, 30, 30),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  cube.position.y = 20;
  scene.add(cube);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      cube.rotation.y = currentTime * 0.001;
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();
      await new Promise(r => setTimeout(r, 16));
    }
  };
  animate();

  return { stop: () => { running = false; }, getTime: () => currentTime };
}

async function main() {
  const appInstance = app(resolveTransport(), { title: 'Grid+Cube Test' }, (a) => {
    a.window({ title: 'Grid+Cube Test', width: 800, height: 600 }, (win) => {
      win.setContent(() => { a.label('Init...'); });
      win.show();
      setTimeout(async () => { await buildDemo(a, win, { width: 800, height: 600 }); }, 100);
    });
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) main().catch(console.error);
