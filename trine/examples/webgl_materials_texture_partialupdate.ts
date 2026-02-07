/**
 * three.js webgl - partial texture updates
 *
 * Port of: three/examples/webgl_materials_texture_partialupdate.html
 *
 * Tests:
 * - Partial texture updates (subregion updates)
 * - Efficient texture modification
 * - Dynamic texture painting
 *
 * Adaptations for Tsyne:
 * - Uses DataTexture with partial updates
 * - Simulated painting on texture
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTexturePartialupdateParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTexturePartialupdateDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTexturePartialupdate(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTexturePartialupdateParams = {}
): Promise<WebGLMaterialsTexturePartialupdateDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  scene.add(new THREE.AmbientLight(0xffffff));

  // Create main texture
  const texSize = 512;
  const textureData = new Uint8Array(texSize * texSize * 4);

  // Initialize with a grid pattern
  for (let y = 0; y < texSize; y++) {
    for (let x = 0; x < texSize; x++) {
      const i = (y * texSize + x) * 4;
      const isGrid = x % 32 === 0 || y % 32 === 0;
      const value = isGrid ? 50 : 30;
      textureData[i] = value;
      textureData[i + 1] = value;
      textureData[i + 2] = value;
      textureData[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(textureData, texSize, texSize);
  texture.needsUpdate = true;

  // Function to "paint" on the texture
  function paintCircle(
    cx: number,
    cy: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ) {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(texSize, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(texSize, Math.ceil(cy + radius));

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;

        if (d2 < radius * radius) {
          const i = (y * texSize + x) * 4;
          const fade = 1 - Math.sqrt(d2) / radius;
          textureData[i] = Math.min(255, textureData[i] + r * fade);
          textureData[i + 1] = Math.min(255, textureData[i + 1] + g * fade);
          textureData[i + 2] = Math.min(255, textureData[i + 2] + b * fade);
        }
      }
    }
  }

  // Create mesh with texture
  const planeGeometry = new THREE.PlaneGeometry(400, 400);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
  });

  const plane = new THREE.Mesh(planeGeometry, material);
  scene.add(plane);

  // Create smaller preview cubes
  const cubeGeometry = new THREE.BoxGeometry(80, 80, 80);
  const cube1 = new THREE.Mesh(cubeGeometry, material);
  cube1.position.set(-250, 0, 0);
  scene.add(cube1);

  const cube2 = new THREE.Mesh(cubeGeometry, material);
  cube2.position.set(250, 0, 0);
  scene.add(cube2);

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
  const startTime = Date.now();
  let currentTime = 0;
  let lastPaintTime = 0;
  const paintInterval = 100; // Paint every 100ms

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Paint on texture periodically
      if (currentTime - lastPaintTime > paintInterval) {
        lastPaintTime = currentTime;

        // Paint a colored circle at a random/animated position
        const angle = time * 2;
        const radius = 100 + Math.sin(time * 0.5) * 80;

        const cx = texSize / 2 + Math.cos(angle) * radius;
        const cy = texSize / 2 + Math.sin(angle) * radius;

        // Rainbow colors over time
        const hue = time * 0.2;
        const r = Math.floor((Math.sin(hue * Math.PI * 2) * 0.5 + 0.5) * 100);
        const g = Math.floor((Math.sin((hue + 0.333) * Math.PI * 2) * 0.5 + 0.5) * 100);
        const b = Math.floor((Math.sin((hue + 0.666) * Math.PI * 2) * 0.5 + 0.5) * 100);

        paintCircle(cx, cy, 20, r, g, b);

        // Paint at opposite position
        paintCircle(texSize - cx, texSize - cy, 15, b, r, g);

        texture.needsUpdate = true;
      }

      // Rotate cubes
      cube1.rotation.x = time * 0.5;
      cube1.rotation.y = time * 0.3;

      cube2.rotation.x = -time * 0.4;
      cube2.rotation.y = time * 0.6;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
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
    { title: 'three.js webgl - partial texture updates' },
    (a) => {
      a.window(
        { title: 'three.js webgl - partial texture updates', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTexturePartialupdate(a, win, { width: WIDTH, height: HEIGHT });
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
