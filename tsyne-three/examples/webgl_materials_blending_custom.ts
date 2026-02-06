/**
 * three.js webgl - materials - custom blending
 *
 * Port of: three/examples/webgl_materials_blending_custom.html
 *
 * Demonstrates:
 * - Custom blending with all source and destination blend factors
 * - 11x10 grid of PlaneGeometry meshes with different blend factor combinations
 * - Procedural checkerboard background texture (replaces CanvasTexture)
 * - Procedural label textures for source/destination factor names
 * - Texture-mapped foreground with lensflare0_alpha.png
 * - Animated background texture offset
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsBlendingCustomParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsBlendingCustomDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Procedural texture helpers (replace browser Canvas2D)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a checkerboard background texture as RGBA pixel data.
 * Mimics the original CanvasTexture created in the HTML example:
 *   128x128, with nested rectangles in shades of gray.
 */
function createCheckerboardData(size: number): Uint8Array {
  const data = new Uint8Array(size * size * 4);

  // Helper: fill a rectangle with an RGBA color
  function fillRect(
    x0: number,
    y0: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number
  ) {
    for (let y = y0; y < y0 + h && y < size; y++) {
      for (let x = x0; x < x0 + w && x < size; x++) {
        const i = (y * size + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  }

  // Matches original: #ddd base, then overlapping rects
  fillRect(0, 0, 128, 128, 0xdd, 0xdd, 0xdd); // #ddd
  fillRect(0, 0, 64, 64, 0x55, 0x55, 0x55); // #555
  fillRect(32, 32, 32, 32, 0x99, 0x99, 0x99); // #999
  fillRect(64, 64, 64, 64, 0x55, 0x55, 0x55); // #555
  fillRect(96, 96, 32, 32, 0x77, 0x77, 0x77); // #777

  return data;
}

/**
 * Create a simple label texture as RGBA pixel data.
 * Since we don't have Canvas2D text rendering, we render a colored rectangle
 * with a lighter inner region to suggest a label. The text itself is not
 * rendered (no font rasterizer), but the color-coded labels still visually
 * mark rows/columns.
 *
 * @param bgR - background red 0-255
 * @param bgG - background green 0-255
 * @param bgB - background blue 0-255
 */
function createLabelData(
  width: number,
  height: number,
  bgR: number,
  bgG: number,
  bgB: number
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Border (2px)
      const isBorder = x < 2 || x >= width - 2 || y < 2 || y >= height - 2;
      if (isBorder) {
        data[i] = Math.min(255, bgR + 80);
        data[i + 1] = Math.min(255, bgG + 80);
        data[i + 2] = Math.min(255, bgB + 80);
      } else {
        data[i] = bgR;
        data[i + 1] = bgG;
        data[i + 2] = bgB;
      }
      data[i + 3] = 255;
    }
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Materials Blending Custom demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLMaterialsBlendingCustom(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsBlendingCustomParams = {}
): Promise<WebGLMaterialsBlendingCustomDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(80, width / height, 1, 1000);
  camera.position.z = 700;

  // ─────────────────────────────────────────────────────────────────────────
  // Scene
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();

  // ─────────────────────────────────────────────────────────────────────────
  // Background - procedural checkerboard
  // ─────────────────────────────────────────────────────────────────────────

  const bgSize = 128;
  const bgData = createCheckerboardData(bgSize);
  const mapBg = new THREE.DataTexture(bgData, bgSize, bgSize, THREE.RGBAFormat);
  mapBg.colorSpace = THREE.SRGBColorSpace;
  mapBg.wrapS = THREE.RepeatWrapping;
  mapBg.wrapT = THREE.RepeatWrapping;
  mapBg.repeat.set(64, 32);
  mapBg.needsUpdate = true;

  scene.background = mapBg;

  // ─────────────────────────────────────────────────────────────────────────
  // Blend factor definitions
  // ─────────────────────────────────────────────────────────────────────────

  const src = [
    { name: 'Zero', constant: THREE.ZeroFactor },
    { name: 'One', constant: THREE.OneFactor },
    { name: 'SrcColor', constant: THREE.SrcColorFactor },
    { name: 'OneMinusSrcColor', constant: THREE.OneMinusSrcColorFactor },
    { name: 'SrcAlpha', constant: THREE.SrcAlphaFactor },
    { name: 'OneMinusSrcAlpha', constant: THREE.OneMinusSrcAlphaFactor },
    { name: 'DstAlpha', constant: THREE.DstAlphaFactor },
    { name: 'OneMinusDstAlpha', constant: THREE.OneMinusDstAlphaFactor },
    { name: 'DstColor', constant: THREE.DstColorFactor },
    { name: 'OneMinusDstColor', constant: THREE.OneMinusDstColorFactor },
    { name: 'SrcAlphaSaturate', constant: THREE.SrcAlphaSaturateFactor },
  ];

  const dst = [
    { name: 'Zero', constant: THREE.ZeroFactor },
    { name: 'One', constant: THREE.OneFactor },
    { name: 'SrcColor', constant: THREE.SrcColorFactor },
    { name: 'OneMinusSrcColor', constant: THREE.OneMinusSrcColorFactor },
    { name: 'SrcAlpha', constant: THREE.SrcAlphaFactor },
    { name: 'OneMinusSrcAlpha', constant: THREE.OneMinusSrcAlphaFactor },
    { name: 'DstAlpha', constant: THREE.DstAlphaFactor },
    { name: 'OneMinusDstAlpha', constant: THREE.OneMinusDstAlphaFactor },
    { name: 'DstColor', constant: THREE.DstColorFactor },
    { name: 'OneMinusDstColor', constant: THREE.OneMinusDstColorFactor },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry
  // ─────────────────────────────────────────────────────────────────────────

  const geo1 = new THREE.PlaneGeometry(100, 100);
  const geo2 = new THREE.PlaneGeometry(100, 25);

  // ─────────────────────────────────────────────────────────────────────────
  // Load lensflare texture
  // ─────────────────────────────────────────────────────────────────────────

  const texturePath = path.resolve(
    __dirname,
    '../../three/examples/textures/lensflare/lensflare0_alpha.png'
  );
  console.log('[webgl_materials_blending_custom] Loading texture from:', texturePath);

  const texture = await loadTexture(THREE, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;

  // ─────────────────────────────────────────────────────────────────────────
  // Create blending grid (src columns x dst rows)
  // ─────────────────────────────────────────────────────────────────────────

  const materials: any[] = [];

  for (let i = 0; i < dst.length; i++) {
    const blendDst = dst[i];

    for (let j = 0; j < src.length; j++) {
      const blendSrc = src[j];

      const material = new THREE.MeshBasicMaterial({ map: texture });
      material.transparent = true;

      material.blending = THREE.CustomBlending;
      material.blendSrc = blendSrc.constant;
      material.blendDst = blendDst.constant;
      material.blendEquation = THREE.AddEquation;

      const x = (j - src.length / 2) * 110;
      const z = 0;
      const y = (i - dst.length / 2) * 110 + 50;

      const mesh = new THREE.Mesh(geo1, material);
      mesh.position.set(x, -y, z);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);

      materials.push(material);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Source labels (top row, green)
  // ─────────────────────────────────────────────────────────────────────────

  for (let j = 0; j < src.length; j++) {
    const labelW = 128;
    const labelH = 32;
    const labelData = createLabelData(labelW, labelH, 0, 150, 0);
    const labelTex = new THREE.DataTexture(labelData, labelW, labelH, THREE.RGBAFormat);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.needsUpdate = true;

    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });

    const x = (j - src.length / 2) * 110;
    const z = 0;
    const y = (0 - dst.length / 2) * 110 + 50;

    const mesh = new THREE.Mesh(geo2, labelMat);
    mesh.position.set(x, -(y - 70), z);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Destination labels (left column, red)
  // ─────────────────────────────────────────────────────────────────────────

  for (let i = 0; i < dst.length; i++) {
    const labelW = 128;
    const labelH = 32;
    const labelData = createLabelData(labelW, labelH, 150, 0, 0);
    const labelTex = new THREE.DataTexture(labelData, labelW, labelH, THREE.RGBAFormat);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.needsUpdate = true;

    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });

    const x = (0 - src.length / 2) * 110 - 125;
    const z = 0;
    const y = (i - dst.length / 2) * 110 + 165;

    const mesh = new THREE.Mesh(geo2, labelMat);
    mesh.position.set(x, -(y - 120), z);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;

  const animate = async () => {
    while (running) {
      const time = Date.now() * 0.00025;
      const ox = (time * -0.01 * mapBg.repeat.x) % 1;
      const oy = (time * -0.01 * mapBg.repeat.y) % 1;

      mapBg.offset.set(ox, oy);

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
    { title: 'three.js webgl - materials - custom blending' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - materials - custom blending',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsBlendingCustom(a, win, {
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
