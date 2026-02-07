/**
 * three.js webgl - particles - billboards
 *
 * Port of the canonical three.js example: three/examples/webgl_points_billboards.html
 *
 * Renders 10000 billboard point sprites using a disc texture, with animated
 * color cycling via HSL. The camera orbits the scene based on simulated
 * mouse position (since Tsyne has no pointer events in this headless mode).
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Uses loadTexture to load disc.png sprite texture
 * - Removes Stats/GUI panels
 * - Removes pointer move and window resize handlers
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ==========================================================================
// Types
// ==========================================================================

export interface WebGLPointsBillboardsParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLPointsBillboardsDemo {
  stop: () => void;
}

// ==========================================================================
// Demo Builder
// ==========================================================================

/**
 * Build the WebGL Points Billboards demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height, particleCount)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLPointsBillboards(
  a: App,
  win: ITsyneWindow,
  params: WebGLPointsBillboardsParams = {}
): Promise<WebGLPointsBillboardsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const particleCount = params.particleCount ?? 10000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // --------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // --------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(55, width / height, 2, 2000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);

  // Create geometry with random point positions
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];

  for (let i = 0; i < particleCount; i++) {
    const x = 2000 * Math.random() - 1000;
    const y = 2000 * Math.random() - 1000;
    const z = 2000 * Math.random() - 1000;

    vertices.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  // Load the disc sprite texture
  const texturePath = path.resolve(__dirname, '../../three/examples/textures/sprites/disc.png');
  console.log('[webgl_points_billboards] Loading texture from:', texturePath);

  const sprite = await loadTexture(THREE, texturePath);
  sprite.colorSpace = THREE.SRGBColorSpace;

  // Create PointsMaterial with the sprite texture
  const material = new THREE.PointsMaterial({
    size: 35,
    sizeAttenuation: true,
    map: sprite,
    alphaTest: 0.5,
    transparent: true,
  });
  material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Create renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // --------------------------------------------------------------------------
  // Animation loop
  // --------------------------------------------------------------------------

  let running = true;

  // In the original, mouseX/mouseY come from pointer events.
  // Here we keep them at 0 so the camera stays centered.
  let mouseX = 0;
  let mouseY = 0;
  const windowHalfX = width / 2;
  const windowHalfY = height / 2;

  const animate = async () => {
    while (running) {
      const time = Date.now() * 0.00005;

      // Camera follows (simulated) mouse with easing
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;

      camera.lookAt(scene.position);

      // Cycle color through HSL
      const h = (360 * (1.0 + time) % 360) / 360;
      material.color.setHSL(h, 0.5, 0.5);

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

// ==========================================================================
// Main
// ==========================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - particles - billboards' },
    (a) => {
      a.window(
        { title: 'three.js webgl - particles - billboards', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLPointsBillboards(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ==========================================================================
// Entry Point
// ==========================================================================

if (require.main === module) {
  main().catch(console.error);
}
