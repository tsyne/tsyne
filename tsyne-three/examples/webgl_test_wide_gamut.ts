/**
 * three.js webgl - test - wide gamut
 *
 * Port of: three/examples/webgl_test_wide_gamut.html
 *
 * Tests:
 * - Display P3 color space support
 * - Side-by-side sRGB vs Display P3 comparison
 * - Scissor rendering for split view
 * - Texture loading with color space assignment
 * - TextureUtils.contain for aspect-correct background
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';
import {
  DisplayP3ColorSpace,
  DisplayP3ColorSpaceImpl,
  LinearDisplayP3ColorSpace,
  LinearDisplayP3ColorSpaceImpl,
} from '../../three/examples/jsm/math/ColorSpaces.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLTestWideGamutParams {
  width?: number;
  height?: number;
}

export interface WebGLTestWideGamutDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLTestWideGamut(
  a: App,
  win: Window,
  params: WebGLTestWideGamutParams = {}
): Promise<WebGLTestWideGamutDemo> {
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
  // Color space setup
  // ─────────────────────────────────────────────────────────────────────────

  // Register Display P3 color spaces with Three.js ColorManagement
  THREE.ColorManagement.define({
    [DisplayP3ColorSpace]: DisplayP3ColorSpaceImpl,
    [LinearDisplayP3ColorSpace]: LinearDisplayP3ColorSpaceImpl,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup - two scenes for side-by-side comparison
  // ─────────────────────────────────────────────────────────────────────────

  const sceneL = new THREE.Scene();
  const sceneR = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.z = 6;

  // ─────────────────────────────────────────────────────────────────────────
  // Texture loading
  // ─────────────────────────────────────────────────────────────────────────

  const textureDir = path.resolve(__dirname, '../../three/examples/textures/wide_gamut');

  const textureL = await loadTexture(THREE, path.join(textureDir, 'logo_srgb.png'));
  const textureR = await loadTexture(THREE, path.join(textureDir, 'logo_p3.png'));

  // Assign color spaces
  textureL.colorSpace = THREE.SRGBColorSpace;
  textureR.colorSpace = DisplayP3ColorSpace;

  // Set textures as scene backgrounds with aspect-correct containment
  sceneL.background = THREE.TextureUtils.contain(textureL, width / height);
  sceneR.background = THREE.TextureUtils.contain(textureR, width / height);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setScissorTest(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop - oscillating slider for comparison
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  // Slider position oscillates between 20% and 80% of width
  let sliderPos = Math.floor(width / 2);

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Oscillate slider position for visual interest
      sliderPos = Math.floor(width * (0.5 + 0.3 * Math.sin(time * 0.5)));

      // Render left scene (sRGB)
      renderer.setScissor(0, 0, sliderPos, height);
      renderer.setViewport(0, 0, width, height);
      renderer.render(sceneL, camera);

      // Render right scene (Display P3)
      renderer.setScissor(sliderPos, 0, width - sliderPos, height);
      renderer.setViewport(0, 0, width, height);
      renderer.render(sceneR, camera);

      // Draw divider line
      renderer.setScissor(sliderPos - 1, 0, 2, height);
      renderer.setViewport(sliderPos - 1, 0, 2, height);
      renderer.setClearColor(0xffffff);
      renderer.clear();

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
    { title: 'three.js webgl - test - wide gamut' },
    (a) => {
      a.window(
        { title: 'three.js webgl - test - wide gamut', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTestWideGamut(a, win, { width: WIDTH, height: HEIGHT });
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
