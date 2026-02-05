/**
 * three.js webgl - materials variations toon
 *
 * Port of: three/examples/webgl_materials_variations_toon.html
 *
 * Tests:
 * - MeshToonMaterial variations
 * - Gradient maps for toon shading
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsVariationsToonParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsVariationsToonDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsVariationsToon(
  a: App,
  win: Window,
  params: WebGLMaterialsVariationsToonParams = {}
): Promise<WebGLMaterialsVariationsToonDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create gradient maps for toon shading (procedural)
  function createGradientTexture(colors: number[]) {
    const size = colors.length;
    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size; i++) {
      const color = new THREE.Color(colors[i]);
      data[i * 4] = Math.floor(color.r * 255);
      data[i * 4 + 1] = Math.floor(color.g * 255);
      data[i * 4 + 2] = Math.floor(color.b * 255);
      data[i * 4 + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  // Different gradient maps
  const twoTone = createGradientTexture([0x000000, 0xffffff]);
  const threeTone = createGradientTexture([0x000000, 0x888888, 0xffffff]);
  const fiveTone = createGradientTexture([0x000000, 0x444444, 0x888888, 0xcccccc, 0xffffff]);

  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const meshes: any[] = [];

  // Row 1: Different colors with default toon
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshToonMaterial({ color: colors[i] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 150;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Different gradient maps
  const gradientMaps = [null, twoTone, threeTone, fiveTone, null];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshToonMaterial({
      color: 0x00aaff,
      gradientMap: gradientMaps[i],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Emissive toon materials
  const emissiveColors = [0x330000, 0x003300, 0x000033, 0x333300, 0x330033];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshToonMaterial({
      color: new THREE.Color().setHSL(i / 5, 0.8, 0.5),
      emissive: emissiveColors[i],
      gradientMap: threeTone,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = -150;
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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      meshes.forEach((mesh) => {
        mesh.rotation.y = time * 0.3;
        mesh.rotation.x = time * 0.15;
      });

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
    { title: 'three.js webgl - materials variations toon' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials variations toon', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsVariationsToon(a, win, { width: WIDTH, height: HEIGHT });
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
