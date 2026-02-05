/**
 * Test: Does wireframe break the whole scene?
 *
 * Creates two variants:
 * 1. Grid + solid cube - should work
 * 2. Grid + wireframe cube - expected to break
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

export interface WebGLWireframeBugTestParams {
  width?: number;
  height?: number;
  useWireframe?: boolean;
}

export interface WebGLWireframeBugTestDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLWireframeBugTest(
  a: App,
  win: Window,
  params: WebGLWireframeBugTestParams = {}
): Promise<WebGLWireframeBugTestDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const useWireframe = params.useWireframe ?? false;

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

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.set(100, 100, 100);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Grid
  const gridHelper = new THREE.GridHelper(200, 20, 0xff0000, 0x444444);
  scene.add(gridHelper);

  // Cube - either solid or wireframe
  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: useWireframe  // THE KEY TOGGLE
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.y = 20;
  scene.add(cube);

  console.log(`[TEST] useWireframe = ${useWireframe}`);

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
      if (gl?.flush) {
        await gl.flush();
      }

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
  // Change this to test wireframe vs solid
  const USE_WIREFRAME = true;

  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: `Wireframe Bug Test (wireframe=${USE_WIREFRAME})` },
    (a) => {
      a.window(
        { title: `Wireframe Bug Test`, width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLWireframeBugTest(a, win, {
              width: WIDTH,
              height: HEIGHT,
              useWireframe: USE_WIREFRAME
            });
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
