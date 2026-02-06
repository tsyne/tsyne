/**
 * three.js webgl - multiple canvases circle
 *
 * Port of: three/examples/webgl_multiple_canvases_circle.html
 *
 * Tests:
 * - Multiple viewports arranged in a circle
 * - Shared scene, different camera angles
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleCanvasesCircleParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleCanvasesCircleDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleCanvasesCircle(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleCanvasesCircleParams = {}
): Promise<WebGLMultipleCanvasesCircleDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (shared scene)
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create central object
  const torusGeometry = new THREE.TorusKnotGeometry(30, 10, 64, 16);
  const torusMaterial = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    shininess: 50,
  });
  const torusKnot = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torusKnot);

  // Add some smaller objects around
  const sphereGeometry = new THREE.SphereGeometry(8, 16, 12);
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const spheres: any[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const sphere = new THREE.Mesh(
      sphereGeometry,
      new THREE.MeshPhongMaterial({ color: colors[i] })
    );
    sphere.position.x = Math.cos(angle) * 60;
    sphere.position.z = Math.sin(angle) * 60;
    scene.add(sphere);
    spheres.push(sphere);
  }

  // Create multiple cameras for circular arrangement
  const numViews = 6;
  const cameras: any[] = [];
  const viewSize = Math.min(width, height) / 3;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  for (let i = 0; i < numViews; i++) {
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
    const angle = (i / numViews) * Math.PI * 2;
    camera.position.x = Math.cos(angle) * 150;
    camera.position.z = Math.sin(angle) * 150;
    camera.position.y = 50;
    camera.lookAt(0, 0, 0);
    cameras.push({ camera, angle });
  }

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

      // Rotate central object
      torusKnot.rotation.y = time * 0.5;
      torusKnot.rotation.x = time * 0.3;

      // Animate spheres
      spheres.forEach((sphere, i) => {
        sphere.position.y = Math.sin(time * 2 + i) * 20;
      });

      // Clear the renderer
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.clear();

      // Render each viewport
      for (let i = 0; i < numViews; i++) {
        const { camera, angle: baseAngle } = cameras[i];

        // Calculate viewport position in circle
        const angle = baseAngle + time * 0.2;
        const vx = centerX + Math.cos(angle) * radius - viewSize / 2;
        const vy = centerY + Math.sin(angle) * radius - viewSize / 2;

        // Update camera position to orbit
        camera.position.x = Math.cos(baseAngle + time * 0.3) * 150;
        camera.position.z = Math.sin(baseAngle + time * 0.3) * 150;
        camera.lookAt(0, 0, 0);

        // Set viewport and scissor
        const left = Math.floor(vx);
        const bottom = Math.floor(height - vy - viewSize);
        const w = Math.floor(viewSize);
        const h = Math.floor(viewSize);

        renderer.setScissor(left, bottom, w, h);
        renderer.setViewport(left, bottom, w, h);
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
    { title: 'three.js webgl - multiple canvases circle' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple canvases circle', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleCanvasesCircle(a, win, { width: WIDTH, height: HEIGHT });
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
