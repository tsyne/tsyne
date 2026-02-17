/**
 * three.js webgl - normal mapping
 *
 * Port of: three/examples/webgl_materials_normalmap.html
 *
 * Tests:
 * - Normal mapping technique
 * - Procedural normal map generation
 * - Tangent space calculations
 *
 * Adaptations for Tsyne:
 * - Uses procedurally generated normal maps
 * - Multiple normal map patterns
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsNormalmapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsNormalmapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsNormalmap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsNormalmapParams = {}
): Promise<WebGLMaterialsNormalmapDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate procedural normal maps
  // ─────────────────────────────────────────────────────────────────────────

  function generateNormalMap(
    pattern: 'bricks' | 'waves' | 'bumps' | 'tiles',
    size: number = 256
  ): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const fx = x / size;
        const fy = y / size;

        let nx = 0;
        let ny = 0;
        const nz = 1;

        switch (pattern) {
          case 'bricks': {
            // Brick pattern
            const brickW = 0.25;
            const brickH = 0.125;
            const mortarW = 0.02;
            const mortarH = 0.02;

            const row = Math.floor(fy / brickH);
            const offset = row % 2 === 0 ? 0 : brickW / 2;
            const bx = (fx + offset) % brickW;
            const by = fy % brickH;

            // Edge detection for normals
            if (bx < mortarW) nx = -0.5;
            else if (bx > brickW - mortarW) nx = 0.5;
            if (by < mortarH) ny = -0.5;
            else if (by > brickH - mortarH) ny = 0.5;
            break;
          }

          case 'waves': {
            // Sine wave pattern
            const freq = 8;
            const h = Math.sin(fx * Math.PI * freq) * Math.cos(fy * Math.PI * freq);
            nx = Math.cos(fx * Math.PI * freq) * Math.PI * freq * 0.1;
            ny = -Math.sin(fy * Math.PI * freq) * Math.PI * freq * 0.1;
            break;
          }

          case 'bumps': {
            // Random bumps using simple noise
            const bumpFreq = 16;
            const seed = Math.sin(fx * bumpFreq) * Math.cos(fy * bumpFreq) +
                         Math.sin(fx * bumpFreq * 2.1) * Math.cos(fy * bumpFreq * 2.3) * 0.5;
            nx = Math.cos(fx * bumpFreq) * 0.3;
            ny = -Math.sin(fy * bumpFreq) * 0.3;
            break;
          }

          case 'tiles': {
            // Tile pattern with beveled edges
            const tileSize = 0.125;
            const bevel = 0.02;

            const tx = fx % tileSize;
            const ty = fy % tileSize;

            if (tx < bevel) nx = -0.7;
            else if (tx > tileSize - bevel) nx = 0.7;
            if (ty < bevel) ny = -0.7;
            else if (ty > tileSize - bevel) ny = 0.7;
            break;
          }
        }

        // Normalize and convert to 0-255 range
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        data[i] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
        data[i + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
        data[i + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Lighting
  const pointLight = new THREE.PointLight(0xffffff, 50000, 1000);
  pointLight.position.set(200, 200, 200);
  scene.add(pointLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  // Light helper sphere
  const lightHelperGeo = new THREE.SphereGeometry(5, 8, 8);
  const lightHelperMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const lightHelper = new THREE.Mesh(lightHelperGeo, lightHelperMat);
  pointLight.add(lightHelper);

  // Generate normal maps for each pattern
  const normalBricks = generateNormalMap('bricks');
  const normalWaves = generateNormalMap('waves');
  const normalBumps = generateNormalMap('bumps');
  const normalTiles = generateNormalMap('tiles');

  // Create 4 spheres with different normal maps
  const sphereGeometry = new THREE.SphereGeometry(80, 32, 16);
  const colors = [0xcc4444, 0x44cc44, 0x4444cc, 0xcccc44];
  const normalMaps = [normalBricks, normalWaves, normalBumps, normalTiles];
  const positions: [number, number, number][] = [
    [-120, 80, 0],
    [120, 80, 0],
    [-120, -80, 0],
    [120, -80, 0],
  ];

  const spheres: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshPhongMaterial({
      color: colors[i],
      normalMap: normalMaps[i],
      normalScale: new THREE.Vector2(1, 1),
      shininess: 50,
    });
    const mesh = new THREE.Mesh(sphereGeometry, mat);
    mesh.position.set(...positions[i]);
    scene.add(mesh);
    spheres.push(mesh);
  }

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

      // Orbit the point light
      pointLight.position.x = Math.cos(time * 0.5) * 300;
      pointLight.position.z = Math.sin(time * 0.5) * 300;
      pointLight.position.y = Math.sin(time * 0.3) * 150 + 100;

      // Rotate spheres
      spheres.forEach((sphere, i) => {
        sphere.rotation.y = time * 0.3 * (i % 2 === 0 ? 1 : -1);
        sphere.rotation.x = time * 0.2;
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
    { title: 'three.js webgl - normal mapping' },
    (a) => {
      a.window(
        { title: 'three.js webgl - normal mapping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsNormalmap(a, win, { width: WIDTH, height: HEIGHT });
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
