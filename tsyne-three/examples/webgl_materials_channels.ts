/**
 * three.js webgl - materials channels
 *
 * Tests:
 * - MeshStandardMaterial channel properties
 * - Normal map simulation (procedural)
 * - Roughness and metalness textures
 * - Environment mapping basics
 * - Multiple spheres with material variants
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsChannelsParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsChannelsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsChannels(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsChannelsParams = {}
): Promise<WebGLMaterialsChannelsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Procedural texture generation
  // ─────────────────────────────────────────────────────────────────────────

  function createNoiseTexture(size: number, contrast: number): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const noise = Math.random() * contrast + (255 - contrast) / 2;
      data[i * 4] = noise;
      data[i * 4 + 1] = noise;
      data[i * 4 + 2] = noise;
      data[i * 4 + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  function createGradientTexture(size: number): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const fx = x / size;
        const fy = y / size;

        data[i] = Math.floor(fx * 255);
        data[i + 1] = Math.floor(fy * 255);
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 15);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff6600, 100, 50);
  pointLight.position.set(-5, 3, -5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x0066ff, 100, 50);
  pointLight2.position.set(5, -3, 5);
  scene.add(pointLight2);

  // Create textures
  const roughnessMap = createNoiseTexture(256, 200);
  const metalnessMap = createGradientTexture(256);

  // Geometry
  const sphereGeometry = new THREE.SphereGeometry(1, 64, 32);

  // Array of materials with different properties
  const materials: THREE.MeshStandardMaterial[] = [];
  const meshes: THREE.Mesh[] = [];

  // Row 1: Varying roughness
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: i / 4,
      metalness: 0.5,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.set((i - 2) * 2.5, 2, 0);
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Varying metalness
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: i / 4,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.set((i - 2) * 2.5, -0.5, 0);
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Different colors with maps
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: colors[i],
      roughness: 0.5,
      metalness: 0.5,
      roughnessMap: roughnessMap,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.set((i - 2) * 2.5, -3, 0);
    scene.add(mesh);
    meshes.push(mesh);
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

      // Rotate all spheres
      for (const mesh of meshes) {
        mesh.rotation.y = time * 0.3;
      }

      // Animate point lights
      pointLight.position.x = Math.sin(time) * 8;
      pointLight.position.z = Math.cos(time) * 8;

      pointLight2.position.x = Math.sin(time + Math.PI) * 8;
      pointLight2.position.z = Math.cos(time + Math.PI) * 8;

      renderer.render(scene, camera);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
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
    { title: 'three.js webgl - materials channels' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - materials channels',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsChannels(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
