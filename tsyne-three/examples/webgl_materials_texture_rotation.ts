/**
 * three.js webgl - texture rotation
 *
 * Port of: three/examples/webgl_materials_texture_rotation.html
 *
 * Tests:
 * - Texture rotation and transformation
 * - Texture offset and repeat
 * - Center-based rotation
 *
 * Adaptations for Tsyne:
 * - Uses procedural textures
 * - Animated texture transforms
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTextureRotationParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTextureRotationDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTextureRotation(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTextureRotationParams = {}
): Promise<WebGLMaterialsTextureRotationDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate procedural texture
  // ─────────────────────────────────────────────────────────────────────────

  function generateArrowTexture(size: number): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const fx = x / size;
        const fy = y / size;

        // Background color
        let r = 40;
        let g = 40;
        let b = 60;

        // Draw arrow shape
        const cx = 0.5;
        const cy = 0.5;

        // Arrow body (rectangle)
        if (fx > 0.35 && fx < 0.65 && fy > 0.2 && fy < 0.65) {
          r = 255;
          g = 200;
          b = 50;
        }

        // Arrow head (triangle)
        if (fy < 0.35) {
          const headWidth = 0.5 - Math.abs(fy - 0.1) * 1.5;
          if (fx > 0.5 - headWidth && fx < 0.5 + headWidth) {
            r = 255;
            g = 200;
            b = 50;
          }
        }

        // Border
        const borderDist = Math.min(fx, fy, 1 - fx, 1 - fy);
        if (borderDist < 0.02) {
          r = 100;
          g = 100;
          b = 120;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Add lighting
  scene.add(new THREE.AmbientLight(0xffffff));

  // Create textures
  const texture1 = generateArrowTexture(128);
  const texture2 = generateArrowTexture(128);
  const texture3 = generateArrowTexture(128);
  const texture4 = generateArrowTexture(128);

  // Set texture centers for rotation
  texture1.center.set(0.5, 0.5);
  texture2.center.set(0.5, 0.5);
  texture3.center.set(0.5, 0.5);
  texture4.center.set(0, 0); // Corner rotation

  // Create planes with different texture transformations
  const planeGeometry = new THREE.PlaneGeometry(150, 150);

  const material1 = new THREE.MeshBasicMaterial({ map: texture1 });
  const plane1 = new THREE.Mesh(planeGeometry, material1);
  plane1.position.set(-100, 100, 0);
  scene.add(plane1);

  const material2 = new THREE.MeshBasicMaterial({ map: texture2 });
  const plane2 = new THREE.Mesh(planeGeometry, material2);
  plane2.position.set(100, 100, 0);
  scene.add(plane2);

  const material3 = new THREE.MeshBasicMaterial({ map: texture3 });
  const plane3 = new THREE.Mesh(planeGeometry, material3);
  plane3.position.set(-100, -100, 0);
  scene.add(plane3);

  const material4 = new THREE.MeshBasicMaterial({ map: texture4 });
  const plane4 = new THREE.Mesh(planeGeometry, material4);
  plane4.position.set(100, -100, 0);
  scene.add(plane4);

  // Create a 3D object to show texture on curved surface
  const sphereGeometry = new THREE.SphereGeometry(60, 32, 16);
  const texture5 = generateArrowTexture(128);
  texture5.center.set(0.5, 0.5);
  const sphereMaterial = new THREE.MeshBasicMaterial({ map: texture5 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, -100);
  scene.add(sphere);

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

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Animate texture transformations

      // Texture 1: Continuous rotation (center)
      texture1.rotation = time;

      // Texture 2: Oscillating rotation
      texture2.rotation = Math.sin(time * 2) * Math.PI * 0.5;

      // Texture 3: Rotation + scale
      texture3.rotation = time * 0.5;
      texture3.repeat.set(
        1 + 0.5 * Math.sin(time),
        1 + 0.5 * Math.sin(time)
      );

      // Texture 4: Corner rotation + offset
      texture4.rotation = time * 0.8;
      texture4.offset.set(
        Math.sin(time) * 0.2,
        Math.cos(time) * 0.2
      );

      // Texture 5 (sphere): Rotation on surface
      texture5.rotation = time * 0.3;

      // Rotate sphere
      sphere.rotation.y = time * 0.2;

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
    { title: 'three.js webgl - texture rotation' },
    (a) => {
      a.window(
        { title: 'three.js webgl - texture rotation', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTextureRotation(a, win, { width: WIDTH, height: HEIGHT });
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
