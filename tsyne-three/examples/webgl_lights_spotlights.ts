/**
 * three.js webgl - lights - spotlights
 *
 * Port of the three.js example: three/examples/webgl_lights_spotlights.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Skips OrbitControls, TWEEN library, SpotLightHelpers
 * - Shadows disabled (FBOs not yet supported)
 * - Spotlight animation uses simple sinusoidal motion instead of TWEEN
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// =============================================================================
// Types
// =============================================================================

export interface WebGLLightsSpotlightsParams {
  width?: number;
  height?: number;
}

export interface WebGLLightsSpotlightsDemo {
  stop: () => void;
}

// =============================================================================
// Demo Builder
// =============================================================================

/**
 * Build the WebGL Lights Spotlights demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLLightsSpotlights(
  a: App,
  win: ITsyneWindow,
  params: WebGLLightsSpotlightsParams = {}
): Promise<WebGLLightsSpotlightsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ---------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // ---------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(4.6, 2.2, -2.1);
  camera.lookAt(0, 0.5, 0);

  const scene = new THREE.Scene();

  // Materials
  const matFloor = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const matBox = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });

  // Geometry
  const geoFloor = new THREE.PlaneGeometry(100, 100);
  const geoBox = new THREE.BoxGeometry(0.3, 0.1, 0.2);

  // Floor mesh
  const mshFloor = new THREE.Mesh(geoFloor, matFloor);
  mshFloor.rotation.x = -Math.PI * 0.5;
  mshFloor.position.set(0, -0.05, 0);

  // Box mesh
  const mshBox = new THREE.Mesh(geoBox, matBox);
  mshBox.position.set(0, 0.5, 0);

  // Ambient light
  const ambient = new THREE.AmbientLight(0x444444);

  // Spotlights - same colors as original
  function createSpotlight(color: number) {
    const light = new THREE.SpotLight(color, 10);
    // Shadows disabled - FBOs not supported yet
    light.castShadow = false;
    light.angle = 0.3;
    light.penumbra = 0.2;
    light.decay = 2;
    light.distance = 50;
    return light;
  }

  const spotLight1 = createSpotlight(0xff7f00); // orange
  const spotLight2 = createSpotlight(0x00ff7f); // green
  const spotLight3 = createSpotlight(0x7f00ff); // purple

  // Initial positions (same as original)
  spotLight1.position.set(1.5, 4, 4.5);
  spotLight2.position.set(0, 4, 3.5);
  spotLight3.position.set(-1.5, 4, 4.5);

  // All spotlights aim at the origin area by default (target at 0,0,0)

  // Add to scene
  scene.add(mshFloor);
  scene.add(mshBox);
  scene.add(ambient);
  scene.add(spotLight1, spotLight2, spotLight3);
  // Add spotlight targets to scene so they work properly
  scene.add(spotLight1.target, spotLight2.target, spotLight3.target);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  // Shadows disabled
  renderer.shadowMap = renderer.shadowMap || {};
  renderer.shadowMap.enabled = false;

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();

  const animate = async () => {
    while (running) {
      const elapsed = (Date.now() - startTime) * 0.001; // seconds

      // Animate spotlight positions with sinusoidal motion
      // (replaces TWEEN-based animation from the original)
      spotLight1.position.x = 1.5 + Math.sin(elapsed * 0.7) * 1.5;
      spotLight1.position.y = 2.5 + Math.sin(elapsed * 0.5) * 1.0;
      spotLight1.position.z = 4.5 + Math.cos(elapsed * 0.3) * 1.5;

      spotLight2.position.x = Math.sin(elapsed * 0.5) * 1.5;
      spotLight2.position.y = 2.5 + Math.cos(elapsed * 0.4) * 1.0;
      spotLight2.position.z = 3.5 + Math.sin(elapsed * 0.6) * 1.5;

      spotLight3.position.x = -1.5 + Math.cos(elapsed * 0.6) * 1.5;
      spotLight3.position.y = 2.5 + Math.sin(elapsed * 0.3) * 1.0;
      spotLight3.position.z = 4.5 + Math.sin(elapsed * 0.5) * 1.5;

      // Gently animate spotlight angles
      spotLight1.angle = 0.3 + Math.sin(elapsed * 0.4) * 0.15;
      spotLight2.angle = 0.3 + Math.cos(elapsed * 0.3) * 0.15;
      spotLight3.angle = 0.3 + Math.sin(elapsed * 0.5) * 0.15;

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

// =============================================================================
// Main
// =============================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - lights - spotlights' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lights - spotlights', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLLightsSpotlights(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// =============================================================================
// Entry Point
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
}
