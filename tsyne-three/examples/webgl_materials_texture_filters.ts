/**
 * three.js webgl - texture filters
 *
 * Port of: three/examples/webgl_materials_texture_filters.html
 *
 * Tests:
 * - Different texture filtering modes
 * - Nearest vs Linear filtering
 * - Mipmap filtering comparison
 *
 * Adaptations for Tsyne:
 * - Uses procedural textures
 * - Side-by-side filter comparison
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTextureFiltersParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTextureFiltersDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTextureFilters(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTextureFiltersParams = {}
): Promise<WebGLMaterialsTextureFiltersDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate procedural test texture
  // ─────────────────────────────────────────────────────────────────────────

  function generateTestTexture(size: number): Uint8Array {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        // Create a pattern with fine details
        const fx = x / size;
        const fy = y / size;

        // Checkerboard at multiple scales
        const check1 = ((Math.floor(fx * 4) + Math.floor(fy * 4)) % 2) * 128;
        const check2 = ((Math.floor(fx * 16) + Math.floor(fy * 16)) % 2) * 64;
        const check3 = ((Math.floor(fx * 64) + Math.floor(fy * 64)) % 2) * 32;

        // Gradient overlay
        const grad = Math.floor(fx * 50);

        const value = check1 + check2 + check3 + grad;

        // Add color based on position
        data[i] = Math.min(255, value + Math.floor(fx * 50));
        data[i + 1] = Math.min(255, value + Math.floor(fy * 50));
        data[i + 2] = Math.min(255, value);
        data[i + 3] = 255;
      }
    }

    return data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 5000);
  camera.position.set(0, 200, 800);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const texSize = 256;
  const textureData = generateTestTexture(texSize);

  // Create textures with different filtering
  const filterModes = [
    { mag: THREE.NearestFilter, min: THREE.NearestFilter, name: 'Nearest' },
    { mag: THREE.LinearFilter, min: THREE.LinearFilter, name: 'Linear' },
    { mag: THREE.LinearFilter, min: THREE.NearestMipmapNearestFilter, name: 'NearestMipmap' },
    { mag: THREE.LinearFilter, min: THREE.LinearMipmapLinearFilter, name: 'LinearMipmap' },
  ];

  const planeGeometry = new THREE.PlaneGeometry(300, 300);
  const meshes: THREE.Mesh[] = [];

  filterModes.forEach((mode, i) => {
    const texture = new THREE.DataTexture(
      new Uint8Array(textureData),
      texSize,
      texSize
    );
    texture.magFilter = mode.mag;
    texture.minFilter = mode.min;
    texture.generateMipmaps = mode.min !== THREE.NearestFilter && mode.min !== THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.needsUpdate = true;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
    });

    const mesh = new THREE.Mesh(planeGeometry, material);
    const col = i % 2;
    const row = Math.floor(i / 2);
    mesh.position.x = (col - 0.5) * 320;
    mesh.position.y = (row - 0.5) * 320;
    mesh.rotation.x = -Math.PI / 6;

    scene.add(mesh);
    meshes.push(mesh);
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Animate camera to show filtering differences
      camera.position.z = 500 + Math.sin(time * 0.5) * 300;
      camera.position.y = 200 + Math.sin(time * 0.3) * 100;
      camera.lookAt(0, 0, 0);

      // Rotate planes slightly
      meshes.forEach((mesh, i) => {
        mesh.rotation.x = -Math.PI / 6 + Math.sin(time * 0.5 + i) * 0.1;
      });

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
    { title: 'three.js webgl - texture filters' },
    (a) => {
      a.window(
        { title: 'three.js webgl - texture filters', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTextureFilters(a, win, { width: WIDTH, height: HEIGHT });
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
