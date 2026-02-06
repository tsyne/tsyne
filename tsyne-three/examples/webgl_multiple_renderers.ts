/**
 * three.js webgl - multiple scenes
 *
 * Tests:
 * - Multiple scenes rendered to same context
 * - Scene switching
 * - Different camera configurations per scene
 * - Background color changes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleScenesParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleScenesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleScenes(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleScenesParams = {}
): Promise<WebGLMultipleScenesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create multiple scenes
  // ─────────────────────────────────────────────────────────────────────────

  // Scene 1: Rotating cubes
  const scene1 = new THREE.Scene();
  scene1.background = new THREE.Color(0x1a1a2e);

  const camera1 = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera1.position.set(0, 0, 300);

  const cubes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(30, 30, 30);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 5, 1, 0.5),
      wireframe: true,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = (i - 2) * 60;
    scene1.add(cube);
    cubes.push(cube);
  }

  // Scene 2: Spheres
  const scene2 = new THREE.Scene();
  scene2.background = new THREE.Color(0x2e1a1a);

  const camera2 = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera2.position.set(0, 100, 200);
  camera2.lookAt(0, 0, 0);

  const spheres: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const geometry = new THREE.SphereGeometry(20 + i * 5, 16, 12);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.6 + i / 20, 1, 0.5),
      wireframe: true,
    });
    const sphere = new THREE.Mesh(geometry, material);
    const angle = (i / 7) * Math.PI * 2;
    sphere.position.x = Math.cos(angle) * 80;
    sphere.position.z = Math.sin(angle) * 80;
    scene2.add(sphere);
    spheres.push(sphere);
  }

  // Scene 3: Torus knots
  const scene3 = new THREE.Scene();
  scene3.background = new THREE.Color(0x1a2e1a);

  const camera3 = new THREE.OrthographicCamera(-200, 200, 150, -150, 1, 1000);
  camera3.position.set(0, 0, 300);

  const knots: THREE.Mesh[] = [];
  const knotConfigs = [
    { p: 2, q: 3, color: 0xff6b6b },
    { p: 3, q: 2, color: 0x4ecdc4 },
    { p: 2, q: 5, color: 0xffe66d },
  ];

  for (let i = 0; i < knotConfigs.length; i++) {
    const config = knotConfigs[i];
    const geometry = new THREE.TorusKnotGeometry(30, 8, 64, 8, config.p, config.q);
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      wireframe: true,
    });
    const knot = new THREE.Mesh(geometry, material);
    knot.position.x = (i - 1) * 120;
    scene3.add(knot);
    knots.push(knot);
  }

  // Scene 4: Points
  const scene4 = new THREE.Scene();
  scene4.background = new THREE.Color(0x2e2e1a);

  const camera4 = new THREE.PerspectiveCamera(75, width / height, 1, 2000);
  camera4.position.set(0, 0, 250);

  const particleCount = 5000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

    color.setHSL(Math.random(), 1, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pointsMaterial = new THREE.PointsMaterial({ size: 2, vertexColors: true });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  scene4.add(points);

  const scenes = [
    { scene: scene1, camera: camera1 },
    { scene: scene2, camera: camera2 },
    { scene: scene3, camera: camera3 },
    { scene: scene4, camera: camera4 },
  ];

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera: camera1,
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

      // Update all scenes
      // Scene 1: Rotating cubes
      for (let i = 0; i < cubes.length; i++) {
        cubes[i].rotation.x = time * 0.5 + i;
        cubes[i].rotation.y = time * 0.7 + i;
      }

      // Scene 2: Orbiting spheres
      for (let i = 0; i < spheres.length; i++) {
        const angle = (i / 7) * Math.PI * 2 + time * 0.3;
        spheres[i].position.x = Math.cos(angle) * 80;
        spheres[i].position.z = Math.sin(angle) * 80;
        spheres[i].position.y = Math.sin(time + i) * 20;
      }

      // Scene 3: Spinning knots
      for (let i = 0; i < knots.length; i++) {
        knots[i].rotation.x = time * 0.3;
        knots[i].rotation.y = time * 0.4 + i;
      }

      // Scene 4: Rotating point cloud
      points.rotation.x = time * 0.1;
      points.rotation.y = time * 0.15;

      // Switch scenes every 2 seconds
      const sceneIndex = Math.floor(time / 2) % scenes.length;
      const currentScene = scenes[sceneIndex];

      renderer.render(currentScene.scene, currentScene.camera);

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
    { title: 'three.js webgl - multiple scenes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple scenes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleScenes(a, win, { width: WIDTH, height: HEIGHT });
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
