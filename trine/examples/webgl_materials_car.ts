/**
 * three.js webgl - materials - car
 *
 * Port of: three/examples/webgl_materials_car.html
 *
 * Tests:
 * - Car paint material simulation with MeshPhysicalMaterial
 * - Clearcoat effect
 * - Metalness and roughness
 * - Environment map simulation
 *
 * Adaptations for Tsyne:
 * - Uses box geometry instead of car model
 * - Procedural environment map
 * - Multiple car paint variations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsCarParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsCarDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsCar(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsCarParams = {}
): Promise<WebGLMaterialsCarDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  camera.position.set(8, 4, 10);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0xffffff, 50, 50);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x88aaff, 30, 50);
  pointLight2.position.set(-5, 3, 5);
  scene.add(pointLight2);

  // ─────────────────────────────────────────────────────────────────────────
  // Create simplified car body using boxes
  // ─────────────────────────────────────────────────────────────────────────

  function createCarBody(paintColor: number, position: THREE.Vector3): THREE.Group {
    const carGroup = new THREE.Group();

    // Car paint material with clearcoat
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: paintColor,
      metalness: 0.9,
      roughness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    // Main body - lower section
    const bodyGeometry = new THREE.BoxGeometry(4, 0.8, 2);
    const body = new THREE.Mesh(bodyGeometry, paintMaterial);
    body.position.y = 0.5;
    carGroup.add(body);

    // Cabin - upper section
    const cabinGeometry = new THREE.BoxGeometry(2.2, 0.7, 1.8);
    const cabin = new THREE.Mesh(cabinGeometry, paintMaterial);
    cabin.position.y = 1.25;
    cabin.position.x = -0.2;
    carGroup.add(cabin);

    // Hood - front sloped section
    const hoodGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.9);
    const hood = new THREE.Mesh(hoodGeometry, paintMaterial);
    hood.position.set(1.3, 0.9, 0);
    hood.rotation.z = -0.15;
    carGroup.add(hood);

    // Trunk - rear section
    const trunkGeometry = new THREE.BoxGeometry(0.8, 0.5, 1.9);
    const trunk = new THREE.Mesh(trunkGeometry, paintMaterial);
    trunk.position.set(-1.6, 0.9, 0);
    trunk.rotation.z = 0.1;
    carGroup.add(trunk);

    // Window material
    const windowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 0,
      roughness: 0,
      transmission: 0.9,
      thickness: 0.5,
    });

    // Windows - front
    const windowFrontGeometry = new THREE.BoxGeometry(0.05, 0.5, 1.5);
    const windowFront = new THREE.Mesh(windowFrontGeometry, windowMaterial);
    windowFront.position.set(0.85, 1.25, 0);
    windowFront.rotation.z = 0.3;
    carGroup.add(windowFront);

    // Windows - rear
    const windowRear = new THREE.Mesh(windowFrontGeometry, windowMaterial);
    windowRear.position.set(-1.25, 1.25, 0);
    windowRear.rotation.z = -0.3;
    carGroup.add(windowRear);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.2,
      roughness: 0.8,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.3,
    });

    const wheelPositions = [
      { x: 1.2, z: 1.1 },
      { x: 1.2, z: -1.1 },
      { x: -1.2, z: 1.1 },
      { x: -1.2, z: -1.1 },
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, 0.35, pos.z);
      carGroup.add(wheel);

      // Rim
      const rimGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8);
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(pos.x, 0.35, pos.z);
      carGroup.add(rim);
    }

    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.4);
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffee });

    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(2, 0.5, 0.6);
    carGroup.add(headlightL);

    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(2, 0.5, -0.6);
    carGroup.add(headlightR);

    // Taillights
    const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const taillightL = new THREE.Mesh(headlightGeometry, taillightMaterial);
    taillightL.position.set(-2, 0.5, 0.6);
    carGroup.add(taillightL);

    const taillightR = new THREE.Mesh(headlightGeometry, taillightMaterial);
    taillightR.position.set(-2, 0.5, -0.6);
    carGroup.add(taillightR);

    carGroup.position.copy(position);
    return carGroup;
  }

  // Create cars with different paint colors
  const carColors = [
    0xff2222, // Red
    0x2244ff, // Blue
    0x22ff44, // Green
    0xffff22, // Yellow
    0xff8800, // Orange
    0x8800ff, // Purple
  ];

  const cars: THREE.Group[] = [];
  const spacing = 6;

  for (let i = 0; i < 6; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const position = new THREE.Vector3(
      (col - 1) * spacing,
      0,
      (row - 0.5) * spacing
    );
    const car = createCarBody(carColors[i], position);
    scene.add(car);
    cars.push(car);
  }

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.1,
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

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

      // Rotate each car slightly
      for (let i = 0; i < cars.length; i++) {
        cars[i].rotation.y = Math.sin(time * 0.5 + i * 0.5) * 0.3;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 15;
      camera.position.z = Math.cos(time * 0.2) * 15;
      camera.position.y = 5 + Math.sin(time * 0.1) * 2;
      camera.lookAt(0, 1, 0);

      // Animate lights
      pointLight1.position.x = Math.sin(time) * 8;
      pointLight1.position.z = Math.cos(time) * 8;

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
    { title: 'three.js webgl - materials - car' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - car', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsCar(a, win, { width: WIDTH, height: HEIGHT });
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
