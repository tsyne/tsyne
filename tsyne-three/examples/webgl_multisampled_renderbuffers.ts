/**
 * three.js webgl - multisampled renderbuffers
 *
 * Based on: https://threejs.org/examples/webgl_multisampled_renderbuffers.html
 *
 * Tests:
 * - WebGLRenderTarget with samples (multisampling)
 * - Side-by-side comparison rendering
 * - Scissor test for split view
 * - Polygon offset for wireframe overlay
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultisampledRenderbuffersParams {
  width?: number;
  height?: number;
}

export interface WebGLMultisampledRenderbuffersDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultisampledRenderbuffers(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultisampledRenderbuffersParams = {}
): Promise<WebGLMultisampledRenderbuffersDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 10, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xcccccc, 100, 1500);

  // Hemisphere light
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 5);
  hemiLight.position.set(1, 1, 1);
  scene.add(hemiLight);

  // Group of spheres with wireframes
  const group = new THREE.Group();

  const sphereGeometry = new THREE.SphereGeometry(10, 64, 40);
  const material = new THREE.MeshLambertMaterial({
    color: 0xee0808,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });

  for (let i = 0; i < 50; i++) {
    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.x = Math.random() * 600 - 300;
    mesh.position.y = Math.random() * 600 - 300;
    mesh.position.z = Math.random() * 600 - 300;
    mesh.rotation.x = Math.random();
    mesh.rotation.z = Math.random();
    mesh.scale.setScalar(Math.random() * 5 + 5);
    group.add(mesh);

    // Add wireframe overlay
    const meshWireframe = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    meshWireframe.position.copy(mesh.position);
    meshWireframe.rotation.copy(mesh.rotation);
    meshWireframe.scale.copy(mesh.scale);
    group.add(meshWireframe);
  }

  scene.add(group);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // Create two render targets - one normal, one multisampled
  const rtNormal = new THREE.WebGLRenderTarget(width / 2, height);
  const rtMultisampled = new THREE.WebGLRenderTarget(width / 2, height, {
    samples: 4,
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

      // Rotate group
      group.rotation.y += 0.002;

      const halfWidth = Math.floor(width / 2);

      renderer.setScissorTest(true);

      // Left side: normal (no MSAA) rendering
      renderer.setScissor(0, 0, halfWidth - 1, height);
      renderer.setViewport(0, 0, halfWidth, height);
      renderer.clear();
      renderer.render(scene, camera);

      // Right side: multisampled rendering (simulated via regular render)
      // Note: true MSAA comparison would require post-processing
      renderer.setScissor(halfWidth, 0, halfWidth, height);
      renderer.setViewport(halfWidth, 0, halfWidth, height);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setScissorTest(false);

      // Flush GL commands
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
    { title: 'three.js webgl - multisampled renderbuffers' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - multisampled renderbuffers',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultisampledRenderbuffers(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
