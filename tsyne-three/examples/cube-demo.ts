/**
 * Three.js Rotating Cube Demo
 *
 * A simple colored cube that rotates, demonstrating three.js
 * rendering through Tsyne's native OpenGL backend.
 */

import { setupTsyneThreeJS } from '../integration/init';

export interface CubeDemo {
  stop: () => void;
}

/**
 * Create and run the cube demo in a Tsyne window
 */
export async function createCubeDemo(
  app: any,
  win: any,
  options: { width?: number; height?: number } = {}
): Promise<CubeDemo> {
  const width = options.width ?? 1024;
  const height = options.height ?? 768;

  const bridge = app.getBridge();
  const windowId = win.id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  console.log('[CubeDemo] Three.js initialized');

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  // Cube with colored faces
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xff0000 }), // red
    new THREE.MeshBasicMaterial({ color: 0xffff00 }), // yellow
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // green
    new THREE.MeshBasicMaterial({ color: 0x00ffff }), // cyan
    new THREE.MeshBasicMaterial({ color: 0x0000ff }), // blue
    new THREE.MeshBasicMaterial({ color: 0xff00ff }), // magenta
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  scene.add(mesh);

  console.log('[CubeDemo] Scene ready - starting animation');

  // Animation loop
  let running = true;

  const animate = async () => {
    while (running) {
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.01;
      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise(r => setTimeout(r, 16));
    }
  };

  animate();

  return {
    stop: () => {
      running = false;
      console.log('[CubeDemo] Stopped');
    },
  };
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, standaloneShutdownStrategy } = require('tsyne');
  const appInstance = app(
    resolveTransport(),
    { title: 'Three.js Cube Demo' },
    (a: any) => {
      a.window(
        { title: 'Three.js Cube Demo', width: 1024, height: 768 },
        (win: any) => {
          win.setContent(() => {
            a.label('Initializing Three.js...');
          });
          win.show();

          setTimeout(async () => {
            await createCubeDemo(a, win, { width: 1024, height: 768 });
          }, 100);
        }
      );
    }
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
