/**
 * three.js webgl - panorama cube
 *
 * Port of: three/examples/webgl_panorama_cube.html
 *
 * Tests:
 * - Cube map environment (procedurally generated)
 * - Panoramic view with camera rotation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPanoramaCubeParams {
  width?: number;
  height?: number;
}

export interface WebGLPanoramaCubeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPanoramaCube(
  a: App,
  win: Window,
  params: WebGLPanoramaCubeParams = {}
): Promise<WebGLPanoramaCubeDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);

  const scene = new THREE.Scene();

  // Create procedural skybox textures
  function createSkyboxFace(color1: number, color2: number, label: string): THREE.DataTexture {
    const size = 128;
    const data = new Uint8Array(size * size * 4);

    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const t = y / size;

        // Gradient
        const r = Math.floor((c1.r * (1 - t) + c2.r * t) * 255);
        const g = Math.floor((c1.g * (1 - t) + c2.g * t) * 255);
        const b = Math.floor((c1.b * (1 - t) + c2.b * t) * 255);

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;

        // Add some variation/pattern
        if ((x + y) % 16 < 2) {
          data[i] = Math.min(255, r + 20);
          data[i + 1] = Math.min(255, g + 20);
          data[i + 2] = Math.min(255, b + 20);
        }
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  // Create a large cube surrounding the camera (skybox)
  const skyboxSize = 500;
  const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);

  // Create different colored faces for each side
  const materials = [
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0x4488cc, 0x2244aa, 'right'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0xcc8844, 0xaa4422, 'left'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0x88cc44, 0x44aa22, 'top'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0x4444cc, 0x222288, 'bottom'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0xcc4488, 0xaa2244, 'front'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: createSkyboxFace(0x44cc88, 0x22aa44, 'back'), side: THREE.BackSide }),
  ];

  const skybox = new THREE.Mesh(skyboxGeometry, materials);
  scene.add(skybox);

  // Add some floating objects in the scene for reference
  const sphereGeometry = new THREE.SphereGeometry(10, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = 0; i < 20; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
    (sphere.material as any).color.setHSL(Math.random(), 0.8, 0.5);
    sphere.position.x = (Math.random() - 0.5) * 300;
    sphere.position.y = (Math.random() - 0.5) * 300;
    sphere.position.z = (Math.random() - 0.5) * 300;
    scene.add(sphere);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // Camera rotation state
  let lon = 0;
  let lat = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Auto-rotate camera
      lon += 0.15;
      lat = Math.sin(time * 0.2) * 20;

      // Convert spherical to Cartesian
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);

      const target = new THREE.Vector3();
      target.x = 500 * Math.sin(phi) * Math.cos(theta);
      target.y = 500 * Math.cos(phi);
      target.z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(target);

      renderer.render(scene, camera);

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
    { title: 'three.js webgl - panorama cube' },
    (a) => {
      a.window(
        { title: 'three.js webgl - panorama cube', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPanoramaCube(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
