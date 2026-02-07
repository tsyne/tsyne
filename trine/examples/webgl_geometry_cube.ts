/**
 * three.js webgl - geometry - cube
 *
 * Port of the canonical three.js example: three/examples/webgl_geometry_cube.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Uses TsyneTextureLoader to load actual crate.gif texture
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryCubeParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryCubeDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Geometry Cube demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLGeometryCube(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryCubeParams = {}
): Promise<WebGLGeometryCubeDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  // Load the crate.gif texture (from three.js examples)
  // Path is relative to project root (where npx tsx is run from)
  const texturePath = path.resolve(__dirname, '../../three/examples/textures/crate.gif');
  console.log('[webgl_geometry_cube] Loading texture from:', texturePath);

  const texture = await loadTexture(THREE, texturePath);

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1); // No window.devicePixelRatio in Node
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

  const animate = async () => {
    while (running) {
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.01;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
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
    { title: 'three.js webgl - geometry - cube' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - cube', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLGeometryCube(a, win, { width: WIDTH, height: HEIGHT });
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
