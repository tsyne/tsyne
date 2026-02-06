/**
 * three.js webgl - lights hemisphere
 *
 * Tests:
 * - HemisphereLight for sky/ground lighting
 * - DirectionalLight for sun shadows
 * - Basic lighting setup
 * Note: Currently uses wireframe since lighting shaders may need bridge support
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightsHemisphereParams {
  width?: number;
  height?: number;
}

export interface WebGLLightsHemisphereDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLightsHemisphere(
  a: App,
  win: ITsyneWindow,
  params: WebGLLightsHemisphereParams = {}
): Promise<WebGLLightsHemisphereDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 5000);
  camera.position.set(0, 200, 800);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue

  // Add hemisphere light
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 500, 0);
  scene.add(hemiLight);

  // Add directional light (sun)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(200, 500, 100);
  scene.add(dirLight);

  // Create ground plane
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0x558855,
    wireframe: true,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -50;
  scene.add(ground);

  // Create various objects to show lighting effect
  const objects: THREE.Mesh[] = [];

  // Sphere
  const sphereGeometry = new THREE.SphereGeometry(50, 32, 24);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff6666, wireframe: true });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(-150, 50, 0);
  scene.add(sphere);
  objects.push(sphere);

  // Box
  const boxGeometry = new THREE.BoxGeometry(80, 80, 80);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x66ff66, wireframe: true });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(0, 40, 0);
  scene.add(box);
  objects.push(box);

  // Cone
  const coneGeometry = new THREE.ConeGeometry(40, 100, 32);
  const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x6666ff, wireframe: true });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.set(150, 50, 0);
  scene.add(cone);
  objects.push(cone);

  // Torus
  const torusGeometry = new THREE.TorusGeometry(40, 15, 16, 48);
  const torusMaterial = new THREE.MeshBasicMaterial({ color: 0xffff66, wireframe: true });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(0, 50, -150);
  scene.add(torus);
  objects.push(torus);

  // Cylinder
  const cylinderGeometry = new THREE.CylinderGeometry(30, 30, 80, 32);
  const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xff66ff, wireframe: true });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.set(-150, 40, -150);
  scene.add(cylinder);
  objects.push(cylinder);

  // Dodecahedron
  const dodecaGeometry = new THREE.DodecahedronGeometry(40);
  const dodecaMaterial = new THREE.MeshBasicMaterial({ color: 0x66ffff, wireframe: true });
  const dodeca = new THREE.Mesh(dodecaGeometry, dodecaMaterial);
  dodeca.position.set(150, 40, -150);
  scene.add(dodeca);
  objects.push(dodeca);

  // Create helper to show light direction
  const lightHelper = new THREE.DirectionalLightHelper(dirLight, 50);
  scene.add(lightHelper);

  // Grid helper
  const gridHelper = new THREE.GridHelper(1000, 20, 0x444444, 0x222222);
  gridHelper.position.y = -49;
  scene.add(gridHelper);

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate objects
      sphere.rotation.y = time * 0.5;
      box.rotation.x = time * 0.3;
      box.rotation.y = time * 0.4;
      cone.rotation.y = time * 0.6;
      torus.rotation.x = time * 0.4;
      torus.rotation.y = time * 0.3;
      cylinder.rotation.x = time * 0.2;
      dodeca.rotation.x = time * 0.5;
      dodeca.rotation.y = time * 0.4;

      // Move directional light in a circle
      dirLight.position.x = Math.sin(time * 0.3) * 400;
      dirLight.position.z = Math.cos(time * 0.3) * 400;
      lightHelper.update();

      // Animate hemisphere light colors subtly
      const skyHue = (time * 0.05) % 1;
      hemiLight.color.setHSL(0.6 + Math.sin(time * 0.1) * 0.1, 0.5, 0.75);
      hemiLight.groundColor.setHSL(0.2 + Math.sin(time * 0.1) * 0.1, 0.5, 0.3);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 600;
      camera.position.z = Math.cos(time * 0.15) * 600;
      camera.position.y = 200 + Math.sin(time * 0.1) * 100;
      camera.lookAt(0, 50, 0);

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  // Start animation
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
    { title: 'three.js webgl - lights hemisphere' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lights hemisphere', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLightsHemisphere(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main().catch(console.error);
}
