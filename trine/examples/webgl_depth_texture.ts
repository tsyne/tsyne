/**
 * three.js webgl - depth texture visualization
 *
 * Tests:
 * - Depth buffer concepts
 * - Near/far plane visualization
 * - Multiple objects at different depths
 * - Depth-based coloring
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLDepthTextureParams {
  width?: number;
  height?: number;
}

export interface WebGLDepthTextureDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLDepthTexture(
  a: App,
  win: ITsyneWindow,
  params: WebGLDepthTextureParams = {}
): Promise<WebGLDepthTextureDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const meshes: THREE.Mesh[] = [];

  // Create objects at various depths with colors indicating depth
  const near = 1;
  const far = 1000;

  for (let i = 0; i < 100; i++) {
    const z = -far + (i / 100) * (far - near) + 200;
    const normalizedDepth = (z + far) / (far + far);

    // Color based on depth: near = red, far = blue
    const color = new THREE.Color();
    color.setHSL(0.6 - normalizedDepth * 0.6, 1, 0.5);

    const size = 20 + Math.random() * 30;
    const geometry = i % 3 === 0
      ? new THREE.BoxGeometry(size, size, size)
      : i % 3 === 1
        ? new THREE.SphereGeometry(size / 2, 16, 12)
        : new THREE.TetrahedronGeometry(size / 2);

    const material = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (Math.random() - 0.5) * 600;
    mesh.position.y = (Math.random() - 0.5) * 400;
    mesh.position.z = z;

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;

    scene.add(mesh);
    meshes.push(mesh);
  }

  // Add depth reference planes
  const planeGeometry = new THREE.PlaneGeometry(800, 600);

  // Near plane indicator
  const nearPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const nearPlane = new THREE.Mesh(planeGeometry, nearPlaneMaterial);
  nearPlane.position.z = 300;
  scene.add(nearPlane);

  // Mid plane indicator
  const midPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const midPlane = new THREE.Mesh(planeGeometry, midPlaneMaterial);
  midPlane.position.z = 0;
  scene.add(midPlane);

  // Far plane indicator
  const farPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const farPlane = new THREE.Mesh(planeGeometry, farPlaneMaterial);
  farPlane.position.z = -300;
  scene.add(farPlane);

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

      // Rotate all meshes
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].rotation.x += 0.005;
        meshes[i].rotation.y += 0.01;
      }

      // Move camera forward and back
      camera.position.z = 400 + Math.sin(time * 0.5) * 200;

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
    { title: 'three.js webgl - depth texture' },
    (a) => {
      a.window(
        { title: 'three.js webgl - depth texture', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLDepthTexture(a, win, { width: WIDTH, height: HEIGHT });
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
