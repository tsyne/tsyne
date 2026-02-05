/**
 * three.js webgl - memory test
 *
 * Based on: https://threejs.org/examples/webgl_test_memory.html
 *
 * Tests:
 * - Geometry creation and disposal
 * - Material creation and disposal
 * - Texture creation and disposal
 * - Memory cleanup via dispose()
 * - Dynamic geometry generation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLTestMemoryParams {
  width?: number;
  height?: number;
}

export interface WebGLTestMemoryDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLTestMemory(
  a: App,
  win: Window,
  params: WebGLTestMemoryParams = {}
): Promise<WebGLTestMemoryDemo> {
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
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Texture generation
  // ─────────────────────────────────────────────────────────────────────────

  function createTextureData(): Uint8Array {
    // Generate random colored texture data
    const size = 256 * 256 * 4;
    const data = new Uint8Array(size);

    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    for (let i = 0; i < size; i += 4) {
      // Add some variation
      data[i] = r + Math.floor(Math.random() * 50 - 25);
      data[i + 1] = g + Math.floor(Math.random() * 50 - 25);
      data[i + 2] = b + Math.floor(Math.random() * 50 - 25);
      data[i + 3] = 255;
    }

    return data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let frameCount = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      frameCount++;

      // Create new geometry each frame (different segment counts)
      const geometry = new THREE.SphereGeometry(
        50,
        Math.floor(Math.random() * 64) + 8,
        Math.floor(Math.random() * 32) + 8
      );

      // Create new texture
      const textureData = createTextureData();
      const texture = new THREE.DataTexture(textureData, 256, 256);
      texture.needsUpdate = true;

      // Create material with texture
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        wireframe: frameCount % 2 === 0,
      });

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Render
      renderer.render(scene, camera);

      // Clean up immediately - this is the memory test
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // Slower frame rate to not overwhelm the system
      await new Promise((resolve) => setTimeout(resolve, 50));
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
    { title: 'three.js webgl - memory test' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - memory test',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTestMemory(a, win, { width: WIDTH, height: HEIGHT });
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
