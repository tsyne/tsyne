/**
 * Minimal test: Just GridHelper
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

export interface WebGLGridTestParams {
  width?: number;
  height?: number;
}

export interface WebGLGridTestDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLGridTest(
  a: App,
  win: Window,
  params: WebGLGridTestParams = {}
): Promise<WebGLGridTestDemo> {
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

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.set(100, 100, 100);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // JUST a GridHelper - nothing else
  const gridHelper = new THREE.GridHelper(200, 20, 0xff0000, 0x444444);
  scene.add(gridHelper);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
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
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'GridHelper Test' },
    (a) => {
      a.window(
        { title: 'GridHelper Test', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGridTest(a, win, { width: WIDTH, height: HEIGHT });
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
