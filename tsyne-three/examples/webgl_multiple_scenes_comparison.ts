/**
 * three.js webgl - multiple scenes comparison
 *
 * Port of: three/examples/webgl_multiple_scenes_comparison.html
 *
 * Tests:
 * - Side-by-side scene comparison
 * - Same object with different materials/settings
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleScenesComparisonParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleScenesComparisonDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleScenesComparison(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleScenesComparisonParams = {}
): Promise<WebGLMultipleScenesComparisonDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create two scenes for comparison
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.TorusKnotGeometry(30, 10, 100, 16);

  // Scene 1: Smooth shading with Phong material
  const scene1 = new THREE.Scene();
  scene1.background = new THREE.Color(0x222233);

  const ambient1 = new THREE.AmbientLight(0x444444);
  scene1.add(ambient1);

  const directional1 = new THREE.DirectionalLight(0xffffff, 2);
  directional1.position.set(1, 1, 1);
  scene1.add(directional1);

  const material1 = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    shininess: 100,
    specular: 0x444444,
    flatShading: false,
  });
  const mesh1 = new THREE.Mesh(geometry, material1);
  scene1.add(mesh1);

  // Scene 2: Flat shading with Lambert material
  const scene2 = new THREE.Scene();
  scene2.background = new THREE.Color(0x332222);

  const ambient2 = new THREE.AmbientLight(0x444444);
  scene2.add(ambient2);

  const directional2 = new THREE.DirectionalLight(0xffffff, 2);
  directional2.position.set(1, 1, 1);
  scene2.add(directional2);

  const material2 = new THREE.MeshLambertMaterial({
    color: 0xff6600,
    flatShading: true,
  });
  const mesh2 = new THREE.Mesh(geometry.clone(), material2);
  scene2.add(mesh2);

  // Shared camera
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
  camera.position.z = 120;

  // Divider position (0 to 1, represents where the split is)
  let dividerPosition = 0.5;

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

      // Animate divider position
      dividerPosition = (Math.sin(time * 0.3) + 1) * 0.5 * 0.8 + 0.1;

      // Rotate both meshes identically
      mesh1.rotation.y = time * 0.5;
      mesh1.rotation.x = time * 0.3;
      mesh2.rotation.y = time * 0.5;
      mesh2.rotation.x = time * 0.3;

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render left scene (Scene 1)
      const leftWidth = Math.floor(width * dividerPosition);
      camera.aspect = leftWidth / height;
      camera.updateProjectionMatrix();
      renderer.setScissor(0, 0, leftWidth, height);
      renderer.setViewport(0, 0, leftWidth, height);
      renderer.render(scene1, camera);

      // Render right scene (Scene 2)
      const rightWidth = width - leftWidth;
      camera.aspect = rightWidth / height;
      camera.updateProjectionMatrix();
      renderer.setScissor(leftWidth, 0, rightWidth, height);
      renderer.setViewport(leftWidth, 0, rightWidth, height);
      renderer.render(scene2, camera);

      // Draw divider line (using a simple rect)
      renderer.setScissor(leftWidth - 2, 0, 4, height);
      renderer.setViewport(leftWidth - 2, 0, 4, height);
      renderer.setClearColor(0xffffff);
      renderer.clear();

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
    { title: 'three.js webgl - multiple scenes comparison' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple scenes comparison', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleScenesComparison(a, win, { width: WIDTH, height: HEIGHT });
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
