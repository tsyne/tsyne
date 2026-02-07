/**
 * three.js webgl - materials - toon
 *
 * Port of the canonical three.js example: three/examples/webgl_materials_toon.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Skips OutlineEffect (addon not available), renders directly
 * - Skips OrbitControls and Stats (browser-only)
 * - Skips FontLoader/TextGeometry labels (requires font file loading)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsToonParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsToonDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Materials Toon demo
 *
 * Creates a 5x5x5 grid of spheres using MeshToonMaterial with varying
 * hue, gradient steps, and diffuse intensity. An orbiting point light
 * illuminates the scene.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLMaterialsToon(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsToonParams = {}
): Promise<WebGLMaterialsToonDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2500);
  camera.position.set(0.0, 400, 400 * 3.5);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444488);

  // Materials - 5x5x5 grid of toon-shaded spheres

  const cubeWidth = 400;
  const numberOfSpheresPerSide = 5;
  const sphereRadius = (cubeWidth / numberOfSpheresPerSide) * 0.8 * 0.5;
  const stepSize = 1.0 / numberOfSpheresPerSide;

  const geometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

  for (let alpha = 0, alphaIndex = 0; alpha <= 1.0; alpha += stepSize, alphaIndex++) {

    const colors = new Uint8Array(alphaIndex + 2);

    for (let c = 0; c <= colors.length; c++) {
      colors[c] = (c / colors.length) * 256;
    }

    const gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    gradientMap.needsUpdate = true;

    for (let beta = 0; beta <= 1.0; beta += stepSize) {

      for (let gamma = 0; gamma <= 1.0; gamma += stepSize) {

        // basic monochromatic energy preservation
        const diffuseColor = new THREE.Color().setHSL(alpha, 0.5, gamma * 0.5 + 0.1).multiplyScalar(1 - beta * 0.2);

        const material = new THREE.MeshToonMaterial({
          color: diffuseColor,
          gradientMap: gradientMap,
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.x = alpha * 400 - 200;
        mesh.position.y = beta * 400 - 200;
        mesh.position.z = gamma * 400 - 200;

        scene.add(mesh);

      }

    }

  }

  // Orbiting particle light (small white sphere with attached point light)
  const particleLight = new THREE.Mesh(
    new THREE.SphereGeometry(4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  // Lights
  scene.add(new THREE.AmbientLight(0xc1c1c1, 3));

  const pointLight = new THREE.PointLight(0xffffff, 2, 800, 0);
  particleLight.add(pointLight);

  // Renderer (no OutlineEffect - skip addon)
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

  const animate = async () => {
    while (running) {
      const timer = Date.now() * 0.00025;

      particleLight.position.x = Math.sin(timer * 7) * 300;
      particleLight.position.y = Math.cos(timer * 5) * 400;
      particleLight.position.z = Math.cos(timer * 3) * 300;

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
    { title: 'three.js webgl - materials - toon' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - toon', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLMaterialsToon(a, win, { width: WIDTH, height: HEIGHT });
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
