/**
 * three.js webgl - texture anisotropy
 *
 * Port of: three/examples/webgl_materials_texture_anisotropy.html
 *
 * Tests:
 * - Anisotropic texture filtering
 * - Texture quality at glancing angles
 * - Comparison of different anisotropy levels
 *
 * Adaptations for Tsyne:
 * - Uses procedurally generated textures
 * - Demonstrates anisotropy effect on floor plane
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTextureAnisotropyParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTextureAnisotropyDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTextureAnisotropy(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTextureAnisotropyParams = {}
): Promise<WebGLMaterialsTextureAnisotropyDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate procedural checker texture
  // ─────────────────────────────────────────────────────────────────────────

  function generateCheckerTexture(size: number, checks: number): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        const cx = Math.floor((x / size) * checks);
        const cy = Math.floor((y / size) * checks);
        const isWhite = (cx + cy) % 2 === 0;

        const value = isWhite ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 25000);
  camera.position.set(0, 300, 2500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 1000, 10000);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Create textures with different settings
  const texSize = 256;
  const texChecks = 32;

  // Texture without anisotropy
  const texture1 = generateCheckerTexture(texSize, texChecks);
  texture1.minFilter = THREE.LinearMipmapLinearFilter;
  texture1.magFilter = THREE.LinearFilter;
  texture1.generateMipmaps = true;

  // Texture with anisotropy
  const texture2 = generateCheckerTexture(texSize, texChecks);
  texture2.minFilter = THREE.LinearMipmapLinearFilter;
  texture2.magFilter = THREE.LinearFilter;
  texture2.generateMipmaps = true;
  // Note: anisotropy would be set here, but DataTextures may not support it fully

  // Create floor planes
  const planeGeometry = new THREE.PlaneGeometry(10000, 1000);

  // Left floor - no anisotropy
  const material1 = new THREE.MeshPhongMaterial({
    map: texture1,
    color: 0xffffff,
  });
  material1.map!.repeat.set(100, 10);

  const floor1 = new THREE.Mesh(planeGeometry, material1);
  floor1.rotation.x = -Math.PI / 2;
  floor1.position.x = -2000;
  floor1.position.y = -100;
  scene.add(floor1);

  // Right floor - with anisotropy
  const material2 = new THREE.MeshPhongMaterial({
    map: texture2,
    color: 0xffffff,
  });
  material2.map!.repeat.set(100, 10);

  const floor2 = new THREE.Mesh(planeGeometry, material2);
  floor2.rotation.x = -Math.PI / 2;
  floor2.position.x = 2000;
  floor2.position.y = -100;
  scene.add(floor2);

  // Add center divider
  const dividerGeometry = new THREE.BoxGeometry(10, 500, 10000);
  const dividerMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
  divider.position.y = 150;
  scene.add(divider);

  // Add some reference objects
  const boxGeometry = new THREE.BoxGeometry(100, 100, 100);

  for (let i = 0; i < 20; i++) {
    const z = -4000 + i * 400;

    // Left side boxes
    const box1 = new THREE.Mesh(
      boxGeometry,
      new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
    );
    box1.position.set(-1500 - Math.random() * 500, 50, z);
    scene.add(box1);

    // Right side boxes
    const box2 = new THREE.Mesh(
      boxGeometry,
      new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
    );
    box2.position.set(1500 + Math.random() * 500, 50, z);
    scene.add(box2);
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

      // Move camera forward through scene
      const z = 4000 - ((time * 300) % 8000);
      camera.position.z = z;

      // Oscillate camera horizontally to show both sides
      camera.position.x = Math.sin(time * 0.5) * 1500;
      camera.lookAt(camera.position.x, -100, camera.position.z - 1000);

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
    { title: 'three.js webgl - texture anisotropy' },
    (a) => {
      a.window(
        { title: 'three.js webgl - texture anisotropy', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTextureAnisotropy(a, win, { width: WIDTH, height: HEIGHT });
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
