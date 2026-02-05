/**
 * three.js webgl - interactive cubes
 *
 * Port of: three/examples/webgl_interactive_cubes.html
 *
 * Tests:
 * - BoxGeometry
 * - MeshLambertMaterial with random colors
 * - DirectionalLight
 * - Many mesh instances (scaled down for performance)
 * - Camera orbit animation
 * - Raycasting for mouse hover interaction
 *
 * Adaptations for Tsyne:
 * - Uses HoverableShader for mouse events
 * - Removes Stats
 * - Reduces cube count for performance
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveCubesParams {
  width?: number;
  height?: number;
  cubeCount?: number;
}

export interface WebGLInteractiveCubesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractiveCubes(
  a: App,
  win: Window,
  params: WebGLInteractiveCubesParams = {}
): Promise<WebGLInteractiveCubesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const cubeCount = params.cubeCount ?? 200; // Reduced for Tsyne performance (original: 2000)

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
    interactive: true, // Enable mouse events for raycasting
    coreBridge: bridge, // Pass core bridge to wire up event routing
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new THREE.BoxGeometry(2, 2, 2);

  for (let i = 0; i < cubeCount; i++) {
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
    );

    object.position.x = Math.random() * 20 - 10;
    object.position.y = Math.random() * 20 - 10;
    object.position.z = Math.random() * 20 - 10;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10); // Start off-screen
  let INTERSECTED: any = null;

  // Get the canvas to add event listeners
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    pointer.x = (event.clientX / width) * 2 - 1;
    pointer.y = -(event.clientY / height) * 2 + 1;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.x = -10;
    pointer.y = -10;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let theta = 0;
  const radius = 20;

  // FPS tracking (optional - set TSYNE_FPS=1 to enable)
  const showFps = process.env.TSYNE_FPS === '1';
  let frameCount = 0;
  let lastFpsTime = Date.now();

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      theta += 0.1;

      camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(theta));
      camera.position.y = radius * Math.sin(THREE.MathUtils.degToRad(theta));
      camera.position.z = radius * Math.cos(THREE.MathUtils.degToRad(theta));
      camera.lookAt(scene.position);
      camera.updateMatrixWorld();

      // Perform raycasting to find intersected objects
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, false);

      if (intersects.length > 0) {
        if (INTERSECTED !== intersects[0].object) {
          // Restore previous object's color
          if (INTERSECTED) {
            INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
          }

          // Highlight new object
          INTERSECTED = intersects[0].object;
          INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
          INTERSECTED.material.emissive.setHex(0xff0000);
        }
      } else {
        // No intersection - restore previous object's color
        if (INTERSECTED) {
          INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
        }
        INTERSECTED = null;
      }

      renderer.render(scene, camera);

      // Flush GL commands synchronously (prevents flickering)
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // FPS tracking (optional)
      if (showFps) {
        frameCount++;
        const now = Date.now();
        if (now - lastFpsTime >= 2000) {
          const fps = (frameCount * 1000) / (now - lastFpsTime);
          console.log(`[FPS] ${fps.toFixed(1)} fps`);
          frameCount = 0;
          lastFpsTime = now;
        }
      }

      // Paint sync now handled on Go side - no delay needed
    }
  };

  // Start animation
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
    { title: 'three.js webgl - interactive cubes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - interactive cubes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveCubes(a, win, { width: WIDTH, height: HEIGHT });
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
