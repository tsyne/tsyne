/**
 * three.js webgl - shaders - sky sun shader
 *
 * Port of: three/examples/webgl_shaders_sky.html
 *
 * Tests:
 * - Sky shader (Preetham atmospheric scattering model)
 * - ShaderMaterial with complex GLSL (vertex + fragment)
 * - Tone mapping (ACESFilmic)
 * - Dynamic uniform updates (sun position, turbidity, rayleigh, etc.)
 * - Slow camera rotation for animation
 *
 * Adaptations for Tsyne:
 * - Removes GUI, OrbitControls, Stats
 * - Removes all DOM/browser APIs
 * - Adds slow camera orbit for visual interest
 * - Uses setupTsyneThreeJS for three.js initialization
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLShadersSkyParams {
  width?: number;
  height?: number;
}

export interface WebGLShadersSkyDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Shaders Sky demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLShadersSky(
  a: App,
  win: Window,
  params: WebGLShadersSkyParams = {}
): Promise<WebGLShadersSkyDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 100, 2000000);
  camera.position.set(0, 100, 2000);

  const scene = new THREE.Scene();

  // Grid helper for ground reference
  const helper = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
  scene.add(helper);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer setup
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  // ─────────────────────────────────────────────────────────────────────────
  // Sky setup
  // ─────────────────────────────────────────────────────────────────────────

  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  const sun = new THREE.Vector3();

  // Effect parameters (matching the HTML example defaults)
  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
    cloudCoverage: 0.4,
    cloudDensity: 0.4,
    cloudElevation: 0.5,
  };

  function updateSky() {
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
    uniforms['cloudCoverage'].value = effectController.cloudCoverage;
    uniforms['cloudDensity'].value = effectController.cloudDensity;
    uniforms['cloudElevation'].value = effectController.cloudElevation;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms['sunPosition'].value.copy(sun);

    renderer.toneMappingExposure = effectController.exposure;
  }

  // Apply initial sky parameters
  updateSky();

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop with slow camera rotation
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();

  const animate = async () => {
    while (running) {
      const elapsed = (Date.now() - startTime) * 0.001; // seconds

      // Slow camera orbit around the Y axis for visual interest
      const orbitRadius = 2000;
      const orbitSpeed = 0.1; // radians per second
      camera.position.x = Math.sin(elapsed * orbitSpeed) * orbitRadius;
      camera.position.z = Math.cos(elapsed * orbitSpeed) * orbitRadius;
      camera.position.y = 100 + Math.sin(elapsed * 0.05) * 50;
      camera.lookAt(0, 100, 0);

      // Update cloud animation time
      sky.material.uniforms['time'].value = elapsed;

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
    { title: 'three.js webgl - shaders - sky' },
    (a) => {
      a.window(
        { title: 'three.js webgl - shaders - sky', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLShadersSky(a, win, { width: WIDTH, height: HEIGHT });
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
