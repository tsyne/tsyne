/**
 * three.js webgl - materials - bump map
 *
 * Port of: three/examples/webgl_materials_bumpmap.html
 *
 * Tests:
 * - MeshPhongMaterial with procedural bump mapping
 * - Procedural normal map generation
 * - Multiple light sources
 * - Sphere with bump detail
 *
 * Adaptations for Tsyne:
 * - Uses procedural bump map instead of loaded textures
 * - Uses DataTexture for procedural normals
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsBumpmapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsBumpmapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsBumpmap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsBumpmapParams = {}
): Promise<WebGLMaterialsBumpmapDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Procedural bump map generation
  // ─────────────────────────────────────────────────────────────────────────

  function generateBumpMap(size: number): THREE.DataTexture {
    const data = new Uint8Array(size * size);

    // Create a noise-based bump pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;

        // Multi-octave noise simulation
        let value = 0;
        let frequency = 1;
        let amplitude = 1;

        for (let octave = 0; octave < 4; octave++) {
          const nx = x * frequency / size * 8;
          const ny = y * frequency / size * 8;

          // Simple pseudo-random based on position
          const noise = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
          value += (noise - Math.floor(noise)) * amplitude;

          frequency *= 2;
          amplitude *= 0.5;
        }

        // Add circular bumps
        for (let bx = 0; bx < 4; bx++) {
          for (let by = 0; by < 4; by++) {
            const cx = (bx + 0.5) * size / 4;
            const cy = (by + 0.5) * size / 4;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const radius = size / 10;
            if (dist < radius) {
              value += Math.cos((dist / radius) * Math.PI / 2) * 0.3;
            }
          }
        }

        data[i] = Math.min(255, Math.max(0, value * 128 + 128));
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
  camera.position.set(0, 0, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xff4422, 200, 500);
  pointLight1.position.set(100, 100, 100);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x2244ff, 200, 500);
  pointLight2.position.set(-100, -100, 100);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0x44ff22, 150, 500);
  pointLight3.position.set(0, 100, -100);
  scene.add(pointLight3);

  // Create bump map
  const bumpMap = generateBumpMap(256);

  // Create main sphere with bump mapping
  const sphereGeometry = new THREE.SphereGeometry(80, 64, 32);

  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0xaa8866,
    specular: 0x333333,
    shininess: 25,
    bumpMap: bumpMap,
    bumpScale: 10,
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // Create smaller detail spheres
  const smallSphereGeometry = new THREE.SphereGeometry(25, 32, 16);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const radius = 130;

    const smallBumpMap = generateBumpMap(128);

    const colors = [0x88aa66, 0x6688aa, 0xaa6688, 0x88aa88];
    const smallMaterial = new THREE.MeshPhongMaterial({
      color: colors[i],
      specular: 0x222222,
      shininess: 30,
      bumpMap: smallBumpMap,
      bumpScale: 5,
    });

    const smallSphere = new THREE.Mesh(smallSphereGeometry, smallMaterial);
    smallSphere.position.x = Math.cos(angle) * radius;
    smallSphere.position.z = Math.sin(angle) * radius;
    scene.add(smallSphere);
  }

  // Add floor plane with bump
  const planeGeometry = new THREE.PlaneGeometry(500, 500, 100, 100);
  const planeBumpMap = generateBumpMap(512);

  const planeMaterial = new THREE.MeshPhongMaterial({
    color: 0x444444,
    specular: 0x111111,
    shininess: 10,
    bumpMap: planeBumpMap,
    bumpScale: 3,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -100;
  scene.add(plane);

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

      // Rotate main sphere
      sphere.rotation.y = time * 0.2;
      sphere.rotation.x = Math.sin(time * 0.3) * 0.1;

      // Animate lights
      pointLight1.position.x = Math.sin(time * 0.7) * 150;
      pointLight1.position.z = Math.cos(time * 0.7) * 150;

      pointLight2.position.x = Math.sin(time * 0.5 + 2) * 150;
      pointLight2.position.z = Math.cos(time * 0.5 + 2) * 150;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 300;
      camera.position.z = Math.cos(time * 0.1) * 300;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - materials - bump map' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - bump map', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsBumpmap(a, win, { width: WIDTH, height: HEIGHT });
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
