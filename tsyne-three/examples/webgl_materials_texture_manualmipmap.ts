/**
 * three.js webgl - manual mipmaps
 *
 * Port of: three/examples/webgl_materials_texture_manualmipmap.html
 *
 * Tests:
 * - Manual mipmap level generation
 * - Custom mipmap colors for debugging
 * - Mipmap level visualization
 *
 * Adaptations for Tsyne:
 * - Uses DataTexture with manual mipmap data
 * - Color-coded mipmap levels
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTextureManualmipMapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTextureManualmipMapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTextureManualmipmap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTextureManualmipMapParams = {}
): Promise<WebGLMaterialsTextureManualmipMapDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate mipmap textures with different colors per level
  // ─────────────────────────────────────────────────────────────────────────

  // Mipmap level colors for visualization
  const mipmapColors = [
    [255, 0, 0],     // Level 0: Red
    [255, 127, 0],   // Level 1: Orange
    [255, 255, 0],   // Level 2: Yellow
    [0, 255, 0],     // Level 3: Green
    [0, 255, 255],   // Level 4: Cyan
    [0, 0, 255],     // Level 5: Blue
    [127, 0, 255],   // Level 6: Purple
    [255, 0, 255],   // Level 7: Magenta
  ];

  function generateColoredMipmap(size: number, color: number[]): Uint8Array {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        // Add checker pattern to show texture detail
        const check = ((Math.floor(x / (size / 4)) + Math.floor(y / (size / 4))) % 2) * 50;

        data[i] = Math.min(255, color[0] + check);
        data[i + 1] = Math.min(255, color[1] + check);
        data[i + 2] = Math.min(255, color[2] + check);
        data[i + 3] = 255;
      }
    }

    return data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000);
  camera.position.set(0, 400, 2000);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(0, 1, 0);
  scene.add(light);

  // Create texture with colored mipmap levels
  const baseSize = 256;
  const texture = new THREE.DataTexture(
    generateColoredMipmap(baseSize, mipmapColors[0]),
    baseSize,
    baseSize
  );
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false; // We'll create our own

  // Generate mipmaps manually
  const mipmaps = [];
  let size = baseSize;
  let level = 0;

  while (size >= 1) {
    mipmaps.push({
      data: generateColoredMipmap(size, mipmapColors[Math.min(level, mipmapColors.length - 1)]),
      width: size,
      height: size,
    });
    size = Math.floor(size / 2);
    level++;
  }

  texture.mipmaps = mipmaps;
  texture.needsUpdate = true;

  // Create floor plane to show mipmap transitions
  const planeGeometry = new THREE.PlaneGeometry(4000, 4000);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
  });
  material.map!.repeat.set(50, 50);

  const floor = new THREE.Mesh(planeGeometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -100;
  scene.add(floor);

  // Create auto-mipmap texture for comparison
  const autoTexture = new THREE.DataTexture(
    generateColoredMipmap(baseSize, [200, 200, 200]),
    baseSize,
    baseSize
  );
  autoTexture.minFilter = THREE.LinearMipmapLinearFilter;
  autoTexture.magFilter = THREE.LinearFilter;
  autoTexture.wrapS = THREE.RepeatWrapping;
  autoTexture.wrapT = THREE.RepeatWrapping;
  autoTexture.generateMipmaps = true;
  autoTexture.needsUpdate = true;

  const autoMaterial = new THREE.MeshBasicMaterial({
    map: autoTexture,
  });
  autoMaterial.map!.repeat.set(50, 50);

  const autoFloor = new THREE.Mesh(planeGeometry, autoMaterial);
  autoFloor.rotation.x = -Math.PI / 2;
  autoFloor.position.y = -101;
  autoFloor.position.x = 4100;
  scene.add(autoFloor);

  // Add reference cubes at different distances
  const cubeGeometry = new THREE.BoxGeometry(50, 50, 50);
  for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(
      cubeGeometry,
      new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
    );
    cube.position.set(-500 + Math.random() * 1000, 25, -i * 400);
    scene.add(cube);
  }

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

      // Move camera forward and back to show mipmap transitions
      camera.position.z = 1000 + Math.sin(time * 0.3) * 1500;
      camera.position.y = 200 + Math.sin(time * 0.2) * 100;
      camera.position.x = Math.sin(time * 0.15) * 500;
      camera.lookAt(0, 0, camera.position.z - 500);

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
    { title: 'three.js webgl - manual mipmaps' },
    (a) => {
      a.window(
        { title: 'three.js webgl - manual mipmaps', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTextureManualmipmap(a, win, { width: WIDTH, height: HEIGHT });
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
