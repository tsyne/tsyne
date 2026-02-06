/**
 * three.js webgl - multiple canvases grid
 *
 * Port of: three/examples/webgl_multiple_canvases_grid.html
 *
 * Tests:
 * - Multiple viewports in a grid layout
 * - Same scene from different angles
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleCanvasesGridParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleCanvasesGridDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleCanvasesGrid(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleCanvasesGridParams = {}
): Promise<WebGLMultipleCanvasesGridDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (shared scene)
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create a complex object
  const group = new THREE.Group();

  // Central torus knot
  const knotGeometry = new THREE.TorusKnotGeometry(25, 8, 64, 16);
  const knotMaterial = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    shininess: 50,
  });
  const knot = new THREE.Mesh(knotGeometry, knotMaterial);
  group.add(knot);

  // Orbiting boxes
  const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
  const boxColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
  const boxes: any[] = [];

  for (let i = 0; i < 4; i++) {
    const box = new THREE.Mesh(
      boxGeometry,
      new THREE.MeshPhongMaterial({ color: boxColors[i] })
    );
    const angle = (i / 4) * Math.PI * 2;
    box.position.x = Math.cos(angle) * 50;
    box.position.z = Math.sin(angle) * 50;
    group.add(box);
    boxes.push(box);
  }

  scene.add(group);

  // Create 3x3 grid of cameras
  const gridSize = 3;
  const cameras: any[] = [];
  const cameraPositions = [
    // Top row: top views
    { x: 0, y: 150, z: 0, lookAt: [0, 0, 0] },
    { x: 0, y: 100, z: 100, lookAt: [0, 0, 0] },
    { x: 100, y: 100, z: 100, lookAt: [0, 0, 0] },
    // Middle row: side views
    { x: -150, y: 0, z: 0, lookAt: [0, 0, 0] },
    { x: 0, y: 0, z: 150, lookAt: [0, 0, 0] },
    { x: 150, y: 0, z: 0, lookAt: [0, 0, 0] },
    // Bottom row: bottom/angled views
    { x: -100, y: -100, z: 100, lookAt: [0, 0, 0] },
    { x: 0, y: -100, z: 100, lookAt: [0, 0, 0] },
    { x: 0, y: -150, z: 0, lookAt: [0, 0, 0] },
  ];

  for (let i = 0; i < gridSize * gridSize; i++) {
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
    const pos = cameraPositions[i];
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(pos.lookAt[0], pos.lookAt[1], pos.lookAt[2]);
    cameras.push(camera);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Rotate central knot
      knot.rotation.y = time * 0.5;
      knot.rotation.x = time * 0.3;

      // Orbit boxes
      boxes.forEach((box, i) => {
        const angle = (i / 4) * Math.PI * 2 + time * 0.5;
        box.position.x = Math.cos(angle) * 50;
        box.position.z = Math.sin(angle) * 50;
        box.rotation.y = time;
        box.rotation.x = time * 0.5;
      });

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render each grid cell
      const cellWidth = width / gridSize;
      const cellHeight = height / gridSize;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const i = row * gridSize + col;
          const left = Math.floor(col * cellWidth);
          const bottom = Math.floor((gridSize - 1 - row) * cellHeight);
          const w = Math.floor(cellWidth);
          const h = Math.floor(cellHeight);

          cameras[i].aspect = w / h;
          cameras[i].updateProjectionMatrix();

          renderer.setScissor(left, bottom, w, h);
          renderer.setViewport(left, bottom, w, h);
          renderer.render(scene, cameras[i]);
        }
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
    { title: 'three.js webgl - multiple canvases grid' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple canvases grid', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleCanvasesGrid(a, win, { width: WIDTH, height: HEIGHT });
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
