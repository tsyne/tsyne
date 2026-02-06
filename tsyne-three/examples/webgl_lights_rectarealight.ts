/**
 * three.js webgl - lights - rect area light
 *
 * Port of: three/examples/webgl_lights_rectarealight.html
 *
 * Tests:
 * - THREE.RectAreaLight with different colors (red, green, blue)
 * - RectAreaLightHelper for visualizing lights
 * - RectAreaLightUniformsLib initialization
 * - MeshLambertMaterial with procedural checker texture (floor)
 * - TorusKnotGeometry with MeshLambertMaterial
 * - Animated light rotation
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Uses DataTexture for procedural checker pattern
 * - Removes Stats, OrbitControls
 * - Uses while(running) animation loop with await gl.flush()
 * - Uses THREE.Timer for delta calculations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';
import { RectAreaLightHelper } from '../../three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from '../../three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightsRectAreaLightParams {
  width?: number;
  height?: number;
}

export interface WebGLLightsRectAreaLightDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Lights RectAreaLight demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() and getTime() methods
 */
export async function buildWebGLLightsRectAreaLight(
  a: App,
  win: Window,
  params: WebGLLightsRectAreaLightParams = {}
): Promise<WebGLLightsRectAreaLightDemo> {
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
  // Helper: Create procedural checker texture
  // ─────────────────────────────────────────────────────────────────────────

  function createCheckerTexture(repeat: number = 1): any {
    // Create a 2x2 checker pattern
    const size = 2;
    const data = new Uint8Array(size * size * 4);

    // Black background
    for (let i = 0; i < data.length; i++) {
      data[i] = 0;
    }

    // White checkers at (0,0) and (1,1)
    // Pixel (0,0)
    data[0] = 255; // R
    data[1] = 255; // G
    data[2] = 255; // B
    data[3] = 255; // A

    // Pixel (1,1)
    const idx = (1 * size + 1) * 4;
    data[idx] = 255;     // R
    data[idx + 1] = 255; // G
    data[idx + 2] = 255; // B
    data[idx + 3] = 255; // A

    const texture = new THREE.DataTexture(data, size, size);
    texture.repeat.set(repeat, repeat);
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(0, 5, -15);

  const scene = new THREE.Scene();

  // Initialize RectAreaLight uniforms (required for proper rendering)
  RectAreaLightUniformsLib.init();

  // Create three RectAreaLights with different colors
  const rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 4, 10);
  rectLight1.position.set(-5, 6, 5);
  scene.add(rectLight1);

  const rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 4, 10);
  rectLight2.position.set(0, 6, 5);
  scene.add(rectLight2);

  const rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 4, 10);
  rectLight3.position.set(5, 6, 5);
  scene.add(rectLight3);

  // Add light helpers to visualize the rect area lights
  scene.add(new RectAreaLightHelper(rectLight1));
  scene.add(new RectAreaLightHelper(rectLight2));
  scene.add(new RectAreaLightHelper(rectLight3));

  // Floor with checker texture
  // Note: Using MeshLambertMaterial instead of MeshStandardMaterial
  // because GLSL 110 doesn't support the 'transpose' function needed for StandardMaterial
  const geoFloor = new THREE.BoxGeometry(2000, 0.1, 2000);
  const matFloor = new THREE.MeshLambertMaterial({ color: 0x444444 });
  matFloor.map = createCheckerTexture(400);
  const mshFloor = new THREE.Mesh(geoFloor, matFloor);
  scene.add(mshFloor);

  // Torus knot with reflective material
  // Using MeshLambertMaterial for compatibility with GLSL 110
  const geoKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16);
  const matKnot = new THREE.MeshLambertMaterial({
    color: 0xffffff,
  });
  const meshKnot = new THREE.Mesh(geoKnot, matKnot);
  meshKnot.position.set(0, 5.5, 0);
  scene.add(meshKnot);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1); // No window.devicePixelRatio in Node
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  let time = 0;

  const timer = new THREE.Timer();

  const animate = async () => {
    while (running) {
      timer.update();
      const delta = timer.getDelta();
      time += delta;

      // Animate the rect area lights (rotating them)
      rectLight1.rotation.y += -delta;
      rectLight2.rotation.y += delta * 0.5;
      rectLight3.rotation.y += delta;

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
    getTime: () => time,
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
    { title: 'three.js webgl - lights - rect area light' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lights - rect area light', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLLightsRectAreaLight(a, win, { width: WIDTH, height: HEIGHT });
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
