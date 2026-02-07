/**
 * three.js webgl - materials - displacement map
 *
 * Port of: three/examples/webgl_materials_displacementmap.html
 *
 * Tests:
 * - MeshStandardMaterial with displacement mapping
 * - Procedural height map generation
 * - Dynamic displacement animation
 * - High subdivision geometry
 *
 * Adaptations for Tsyne:
 * - Uses procedural displacement map
 * - Animated displacement values
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsDisplacementmapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsDisplacementmapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsDisplacementmap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsDisplacementmapParams = {}
): Promise<WebGLMaterialsDisplacementmapDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Procedural displacement map generation
  // ─────────────────────────────────────────────────────────────────────────

  const mapSize = 256;

  function generateDisplacementMap(time: number): THREE.DataTexture {
    const data = new Uint8Array(mapSize * mapSize);

    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        const i = y * mapSize + x;
        const nx = x / mapSize;
        const ny = y / mapSize;

        // Create animated wave pattern
        let value = 0;

        // Radial waves from center
        const cx = 0.5;
        const cy = 0.5;
        const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
        value += Math.sin(dist * 20 - time * 2) * 0.3;

        // Sine waves
        value += Math.sin(nx * 12 + time) * Math.cos(ny * 12 + time * 0.7) * 0.2;

        // Perlin-like noise approximation
        value += Math.sin(nx * 5 + ny * 3 + time * 0.3) * 0.15;
        value += Math.sin(nx * 11 - ny * 7 + time * 0.5) * 0.1;

        // Circular bump
        for (let bx = 0; bx < 3; bx++) {
          for (let by = 0; by < 3; by++) {
            const bcx = (bx + 0.5) / 3 + Math.sin(time + bx * by) * 0.1;
            const bcy = (by + 0.5) / 3 + Math.cos(time * 0.7 + bx) * 0.1;
            const bdist = Math.sqrt((nx - bcx) ** 2 + (ny - bcy) ** 2);
            if (bdist < 0.15) {
              value += Math.cos((bdist / 0.15) * Math.PI / 2) * 0.25;
            }
          }
        }

        data[i] = Math.min(255, Math.max(0, (value + 1) * 127));
      }
    }

    const texture = new THREE.DataTexture(data, mapSize, mapSize, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 3000);
  camera.position.set(0, 150, 450);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000020);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x333344, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x4488ff, 100, 300);
  pointLight.position.set(100, 100, 100);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xff4488, 100, 300);
  pointLight2.position.set(-100, 50, 100);
  scene.add(pointLight2);

  // Create high-subdivision plane for displacement
  const planeGeometry = new THREE.PlaneGeometry(300, 300, 128, 128);
  let displacementMap = generateDisplacementMap(0);

  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4488aa,
    metalness: 0.3,
    roughness: 0.6,
    displacementMap: displacementMap,
    displacementScale: 50,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -50;
  scene.add(plane);

  // Create a sphere with displacement
  const sphereGeometry = new THREE.SphereGeometry(60, 64, 32);
  let sphereDisplacementMap = generateDisplacementMap(0);

  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xaa6644,
    metalness: 0.4,
    roughness: 0.5,
    displacementMap: sphereDisplacementMap,
    displacementScale: 15,
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 60, 0);
  scene.add(sphere);

  // Create additional objects
  const torusGeometry = new THREE.TorusGeometry(40, 15, 32, 64);
  let torusDisplacementMap = generateDisplacementMap(0);

  const torusMaterial = new THREE.MeshStandardMaterial({
    color: 0x66aa44,
    metalness: 0.5,
    roughness: 0.4,
    displacementMap: torusDisplacementMap,
    displacementScale: 8,
  });

  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(-100, 60, 50);
  torus.rotation.x = Math.PI / 4;
  scene.add(torus);

  const torus2 = new THREE.Mesh(torusGeometry.clone(), torusMaterial.clone());
  torus2.position.set(100, 60, 50);
  torus2.rotation.x = -Math.PI / 4;
  scene.add(torus2);

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
  let lastMapUpdate = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Update displacement maps periodically (not every frame for performance)
      if (currentTime - lastMapUpdate > 50) {
        displacementMap.dispose();
        displacementMap = generateDisplacementMap(time);
        planeMaterial.displacementMap = displacementMap;
        planeMaterial.needsUpdate = true;

        sphereDisplacementMap.dispose();
        sphereDisplacementMap = generateDisplacementMap(time * 1.5);
        sphereMaterial.displacementMap = sphereDisplacementMap;
        sphereMaterial.needsUpdate = true;

        lastMapUpdate = currentTime;
      }

      // Rotate objects
      sphere.rotation.y = time * 0.3;
      torus.rotation.y = time * 0.4;
      torus.rotation.z = time * 0.2;
      torus2.rotation.y = -time * 0.4;
      torus2.rotation.z = -time * 0.2;

      // Animate lights
      pointLight.position.x = Math.sin(time * 0.5) * 150;
      pointLight.position.z = Math.cos(time * 0.5) * 150;

      pointLight2.position.x = Math.sin(time * 0.3 + 2) * 120;
      pointLight2.position.z = Math.cos(time * 0.3 + 2) * 120;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 400;
      camera.position.z = Math.cos(time * 0.15) * 400;
      camera.position.y = 150 + Math.sin(time * 0.1) * 50;
      camera.lookAt(0, 30, 0);

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
    { title: 'three.js webgl - materials - displacement map' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - displacement map', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsDisplacementmap(a, win, { width: WIDTH, height: HEIGHT });
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
