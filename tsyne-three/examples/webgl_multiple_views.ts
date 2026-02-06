/**
 * three.js webgl - multiple views
 *
 * Port of: three/examples/webgl_multiple_views.html
 *
 * Tests:
 * - Multiple camera views (top, front, side, perspective)
 * - Classic CAD-style viewport layout
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleViewsParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleViewsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleViews(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleViewsParams = {}
): Promise<WebGLMultipleViewsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Grid helper
  const gridHelper = new THREE.GridHelper(100, 10, 0x444444, 0x222222);
  scene.add(gridHelper);

  // Axes helper
  const axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);

  // Create a complex object
  const group = new THREE.Group();

  // Main body (box)
  const bodyGeometry = new THREE.BoxGeometry(30, 20, 50);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0066cc });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 10;
  group.add(body);

  // Top (cylinder)
  const topGeometry = new THREE.CylinderGeometry(8, 10, 15, 16);
  const topMaterial = new THREE.MeshPhongMaterial({ color: 0xcc6600 });
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.position.y = 27.5;
  group.add(top);

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(8, 8, 4, 16);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

  const wheelPositions = [
    { x: -15, z: 20 },
    { x: 15, z: 20 },
    { x: -15, z: -20 },
    { x: 15, z: -20 },
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos.x, 4, pos.z);
    group.add(wheel);
  });

  scene.add(group);

  // Create cameras for different views
  const frustumSize = 100;
  const aspect = 1;

  // Top view (orthographic)
  const topCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  topCamera.position.set(0, 200, 0);
  topCamera.lookAt(0, 0, 0);

  // Front view (orthographic)
  const frontCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  frontCamera.position.set(0, 20, 200);
  frontCamera.lookAt(0, 20, 0);

  // Side view (orthographic)
  const sideCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  sideCamera.position.set(200, 20, 0);
  sideCamera.lookAt(0, 20, 0);

  // Perspective view
  const perspCamera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
  perspCamera.position.set(100, 80, 100);
  perspCamera.lookAt(0, 15, 0);

  const cameras = [
    { camera: topCamera, label: 'Top', bg: 0x334433 },
    { camera: frontCamera, label: 'Front', bg: 0x333344 },
    { camera: sideCamera, label: 'Side', bg: 0x443333 },
    { camera: perspCamera, label: 'Perspective', bg: 0x333333 },
  ];

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
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

      // Slowly rotate the object
      group.rotation.y = time * 0.2;

      // Orbit perspective camera
      perspCamera.position.x = Math.sin(time * 0.3) * 120;
      perspCamera.position.z = Math.cos(time * 0.3) * 120;
      perspCamera.lookAt(0, 15, 0);

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render 2x2 grid of views
      const halfWidth = Math.floor(width / 2);
      const halfHeight = Math.floor(height / 2);

      // Update scene background for each view
      const viewports = [
        { x: 0, y: halfHeight, w: halfWidth, h: halfHeight },        // Top-left: Top view
        { x: halfWidth, y: halfHeight, w: halfWidth, h: halfHeight }, // Top-right: Front view
        { x: 0, y: 0, w: halfWidth, h: halfHeight },                  // Bottom-left: Side view
        { x: halfWidth, y: 0, w: halfWidth, h: halfHeight },          // Bottom-right: Perspective
      ];

      for (let i = 0; i < 4; i++) {
        const vp = viewports[i];
        const { camera, bg } = cameras[i];

        scene.background = new THREE.Color(bg);

        if (camera instanceof THREE.OrthographicCamera) {
          const aspect = vp.w / vp.h;
          camera.left = (frustumSize * aspect) / -2;
          camera.right = (frustumSize * aspect) / 2;
          camera.updateProjectionMatrix();
        } else {
          (camera as THREE.PerspectiveCamera).aspect = vp.w / vp.h;
          camera.updateProjectionMatrix();
        }

        renderer.setScissor(vp.x, vp.y, vp.w, vp.h);
        renderer.setViewport(vp.x, vp.y, vp.w, vp.h);
        renderer.render(scene, camera);
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
    { title: 'three.js webgl - multiple views' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple views', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleViews(a, win, { width: WIDTH, height: HEIGHT });
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
