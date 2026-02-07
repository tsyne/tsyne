/**
 * three.js webgl - camera - array (split screen)
 *
 * Tests:
 * - Multiple viewports
 * - Different camera perspectives
 * - Scissor test for split rendering
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCameraArrayParams {
  width?: number;
  height?: number;
}

export interface WebGLCameraArrayDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCameraArray(
  a: App,
  win: ITsyneWindow,
  params: WebGLCameraArrayParams = {}
): Promise<WebGLCameraArrayDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Create cameras for different views
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const aspect = halfWidth / halfHeight;

  // Top-left: Perspective from front
  const cameraFront = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
  cameraFront.position.set(0, 0, 300);
  cameraFront.lookAt(0, 0, 0);

  // Top-right: Perspective from top
  const cameraTop = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
  cameraTop.position.set(0, 300, 0);
  cameraTop.lookAt(0, 0, 0);

  // Bottom-left: Perspective from side
  const cameraSide = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
  cameraSide.position.set(300, 0, 0);
  cameraSide.lookAt(0, 0, 0);

  // Bottom-right: Orthographic
  const cameraOrtho = new THREE.OrthographicCamera(-150, 150, 150 / aspect, -150 / aspect, 1, 1000);
  cameraOrtho.position.set(200, 200, 200);
  cameraOrtho.lookAt(0, 0, 0);

  const cameras = [
    { camera: cameraFront, x: 0, y: halfHeight, w: halfWidth, h: halfHeight, bg: 0x1a1a2e },
    { camera: cameraTop, x: halfWidth, y: halfHeight, w: halfWidth, h: halfHeight, bg: 0x2e1a1a },
    { camera: cameraSide, x: 0, y: 0, w: halfWidth, h: halfHeight, bg: 0x1a2e1a },
    { camera: cameraOrtho, x: halfWidth, y: 0, w: halfWidth, h: halfHeight, bg: 0x2e2e1a },
  ];

  // Create scene objects
  const objects: THREE.Mesh[] = [];

  // Central torus knot
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(30, 10, 64, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true })
  );
  scene.add(knot);
  objects.push(knot);

  // Surrounding cubes
  const cubePositions = [
    [80, 0, 0], [-80, 0, 0],
    [0, 80, 0], [0, -80, 0],
    [0, 0, 80], [0, 0, -80],
  ];

  for (const [x, y, z] of cubePositions) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(25, 25, 25),
      new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true })
    );
    cube.position.set(x, y, z);
    scene.add(cube);
    objects.push(cube);
  }

  // Corner spheres
  const spherePositions = [
    [60, 60, 60], [-60, 60, 60], [60, -60, 60], [60, 60, -60],
    [-60, -60, 60], [-60, 60, -60], [60, -60, -60], [-60, -60, -60],
  ];

  for (const [x, y, z] of spherePositions) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true })
    );
    sphere.position.set(x, y, z);
    scene.add(sphere);
    objects.push(sphere);
  }

  // Axis helpers (lines showing X, Y, Z)
  const axisLength = 100;

  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff0000 })
  );
  scene.add(xAxis);

  const yAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ff00 })
  );
  scene.add(yAxis);

  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength),
    ]),
    new THREE.LineBasicMaterial({ color: 0x0000ff })
  );
  scene.add(zAxis);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera: cameraFront,
  });
  renderer.setScissorTest(true);

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
      knot.rotation.x = time * 0.3;
      knot.rotation.y = time * 0.4;

      for (let i = 0; i < objects.length; i++) {
        if (objects[i] !== knot) {
          objects[i].rotation.x = time * 0.2 + i * 0.1;
          objects[i].rotation.y = time * 0.3 + i * 0.1;
        }
      }

      // Render each viewport
      for (const view of cameras) {
        renderer.setViewport(view.x, view.y, view.w, view.h);
        renderer.setScissor(view.x, view.y, view.w, view.h);

        scene.background = new THREE.Color(view.bg);
        renderer.render(scene, view.camera);
      }

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
    { title: 'three.js webgl - camera - array' },
    (a) => {
      a.window(
        { title: 'three.js webgl - camera - array', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCameraArray(a, win, { width: WIDTH, height: HEIGHT });
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
