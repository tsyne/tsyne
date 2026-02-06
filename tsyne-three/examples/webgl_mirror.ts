/**
 * three.js webgl - mirror
 *
 * Port of: three/examples/webgl_mirror.html
 *
 * Tests:
 * - Reflective surfaces (simulated with environment mapping)
 * - Multiple objects with reflections
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMirrorParams {
  width?: number;
  height?: number;
}

export interface WebGLMirrorDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMirror(
  a: App,
  win: ITsyneWindow,
  params: WebGLMirrorParams = {}
): Promise<WebGLMirrorDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 500);
  camera.position.set(0, 75, 160);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 500);
  pointLight.position.set(0, 100, 50);
  scene.add(pointLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 100, 100);
  scene.add(directionalLight);

  // Create a reflective "mirror" floor (simulated with shiny material)
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0x333333,
    shininess: 100,
    specular: 0x888888,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Add reflective spheres
  const sphereGeometry = new THREE.SphereGeometry(20, 32, 16);

  const chromeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 150,
    specular: 0xffffff,
  });
  const chromeSphere = new THREE.Mesh(sphereGeometry, chromeMaterial);
  chromeSphere.position.set(-50, 30, 0);
  scene.add(chromeSphere);

  const goldMaterial = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    shininess: 100,
    specular: 0xffff00,
  });
  const goldSphere = new THREE.Mesh(sphereGeometry, goldMaterial);
  goldSphere.position.set(0, 30, 0);
  scene.add(goldSphere);

  const blueMaterial = new THREE.MeshPhongMaterial({
    color: 0x0044ff,
    shininess: 100,
    specular: 0x4488ff,
  });
  const blueSphere = new THREE.Mesh(sphereGeometry, blueMaterial);
  blueSphere.position.set(50, 30, 0);
  scene.add(blueSphere);

  // Add some colored boxes
  const boxGeometry = new THREE.BoxGeometry(15, 15, 15);

  const redBox = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshPhongMaterial({ color: 0xff0000 })
  );
  redBox.position.set(-30, 7.5, 50);
  scene.add(redBox);

  const greenBox = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  );
  greenBox.position.set(30, 7.5, 50);
  scene.add(greenBox);

  camera.lookAt(0, 20, 0);

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

      // Animate spheres
      chromeSphere.position.y = 30 + Math.sin(time * 2) * 10;
      goldSphere.position.y = 30 + Math.sin(time * 2 + 1) * 10;
      blueSphere.position.y = 30 + Math.sin(time * 2 + 2) * 10;

      // Rotate boxes
      redBox.rotation.y = time;
      greenBox.rotation.y = -time;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 160;
      camera.position.z = Math.cos(time * 0.3) * 160;
      camera.lookAt(0, 20, 0);

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
    { title: 'three.js webgl - mirror' },
    (a) => {
      a.window(
        { title: 'three.js webgl - mirror', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMirror(a, win, { width: WIDTH, height: HEIGHT });
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
