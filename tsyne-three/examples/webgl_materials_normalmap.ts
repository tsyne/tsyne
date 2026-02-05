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
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

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
  win: Window,
  params: WebGLMaterialsNormalmapParams = {}
): Promise<WebGLMaterialsNormalmapDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  const light1 = new THREE.PointLight(0xffffff, 2, 1000);
  light1.position.set(200, 200, 200);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff8888, 1, 800);
  light2.position.set(-200, 100, 200);
  scene.add(light2);

  scene.add(new THREE.AmbientLight(0x333333));

  // Create normal maps
  const normalMapBricks = generateNormalMap('bricks');
  const normalMapWaves = generateNormalMap('waves');
  const normalMapBumps = generateNormalMap('bumps');
  const normalMapTiles = generateNormalMap('tiles');

  // Create base color texture (procedural)
  function generateColorTexture(color: number, size: number = 256): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    for (let i = 0; i < size * size; i++) {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    return texture;
  }

  // Create materials with normal maps
  const sphereGeometry = new THREE.SphereGeometry(70, 64, 32);

  const materials = [
    new THREE.MeshPhongMaterial({
      color: 0xcc6633,
      normalMap: normalMapBricks,
      normalScale: new THREE.Vector2(1, 1),
      shininess: 50,
    }),
    new THREE.MeshPhongMaterial({
      color: 0x3366cc,
      normalMap: normalMapWaves,
      normalScale: new THREE.Vector2(1, 1),
      shininess: 100,
    }),
    new THREE.MeshPhongMaterial({
      color: 0x66cc33,
      normalMap: normalMapBumps,
      normalScale: new THREE.Vector2(1, 1),
      shininess: 80,
    }),
    new THREE.MeshPhongMaterial({
      color: 0xcc33cc,
      normalMap: normalMapTiles,
      normalScale: new THREE.Vector2(1, 1),
      shininess: 60,
    }),
  ];

  // Create spheres in a grid
  const spheres: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, materials[i]);
    sphere.position.x = ((i % 2) - 0.5) * 200;
    sphere.position.y = (Math.floor(i / 2) - 0.5) * 200;
    scene.add(sphere);
    spheres.push(sphere);
  }

  // Add a light helper
  const lightHelper = new THREE.Mesh(
    new THREE.SphereGeometry(10, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(lightHelper);

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

      // Animate light position
      light1.position.x = Math.sin(time) * 300;
      light1.position.z = Math.cos(time) * 300;
      lightHelper.position.copy(light1.position);

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
