/**
 * three.js webgl - lights spotlight
 *
 * Port of: three/examples/webgl_lights_spotlight.html
 *
 * Tests:
 * - SpotLight with shadows
 * - MeshPhongMaterial
 * - Animated light position
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightsSpotlightParams {
  width?: number;
  height?: number;
}

export interface WebGLLightsSpotlightDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLightsSpotlight(
  a: App,
  win: Window,
  params: WebGLLightsSpotlightParams = {}
): Promise<WebGLLightsSpotlightDemo> {
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

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(7, 4, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Ambient light
  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);

  // Spotlight
  const spotLight = new THREE.SpotLight(0xffffff, 100);
  spotLight.position.set(2.5, 5, 2.5);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 10;
  spotLight.shadow.focus = 1;
  scene.add(spotLight);

  // Spotlight helper visualization
  const spotLightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(spotLightHelper);

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0x808080,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Objects
  const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.set(0, 0.25, 0);
  scene.add(box);

  const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 16);
  const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.position.set(1, 0.3, 0.5);
  scene.add(sphere);

  const coneGeometry = new THREE.ConeGeometry(0.3, 0.6, 32);
  const coneMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.castShadow = true;
  cone.receiveShadow = true;
  cone.position.set(-1, 0.3, -0.5);
  scene.add(cone);

  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

      // Animate spotlight position
      spotLight.position.x = Math.cos(time) * 2.5;
      spotLight.position.z = Math.sin(time) * 2.5;
      spotLightHelper.update();

      // Rotate objects
      box.rotation.y += 0.01;
      sphere.rotation.y += 0.01;
      cone.rotation.y += 0.01;

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
    { title: 'three.js webgl - lights spotlight' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lights spotlight', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLightsSpotlight(a, win, { width: WIDTH, height: HEIGHT });
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
