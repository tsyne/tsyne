/**
 * three.js webgl - materials blending
 *
 * Port of: three/examples/webgl_materials_blending.html
 *
 * Tests:
 * - Different blending modes (Normal, Additive, Subtractive, Multiply)
 * - MeshBasicMaterial with transparency
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsBlendingParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsBlendingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsBlending(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsBlendingParams = {}
): Promise<WebGLMaterialsBlendingDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Create procedural gradient texture
  const gradientSize = 128;
  const gradientData = new Uint8Array(gradientSize * gradientSize * 4);
  for (let y = 0; y < gradientSize; y++) {
    for (let x = 0; x < gradientSize; x++) {
      const i = (y * gradientSize + x) * 4;
      const cx = x - gradientSize / 2;
      const cy = y - gradientSize / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const alpha = Math.max(0, 1 - dist / (gradientSize / 2));
      gradientData[i] = 255;
      gradientData[i + 1] = 255;
      gradientData[i + 2] = 255;
      gradientData[i + 3] = Math.floor(alpha * 255);
    }
  }

  const gradientTexture = new THREE.DataTexture(
    gradientData,
    gradientSize,
    gradientSize,
    THREE.RGBAFormat
  );
  gradientTexture.needsUpdate = true;

  // Define blending modes
  const blendingModes = [
    { name: 'Normal', mode: THREE.NormalBlending },
    { name: 'Additive', mode: THREE.AdditiveBlending },
    { name: 'Subtractive', mode: THREE.SubtractiveBlending },
    { name: 'Multiply', mode: THREE.MultiplyBlending },
  ];

  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const geometry = new THREE.PlaneGeometry(100, 100);
  const meshes: any[] = [];

  // Create meshes for each blending mode
  for (let row = 0; row < blendingModes.length; row++) {
    const blendMode = blendingModes[row];
    for (let col = 0; col < colors.length; col++) {
      const material = new THREE.MeshBasicMaterial({
        map: gradientTexture,
        color: colors[col],
        transparent: true,
        blending: blendMode.mode,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = (col - 2.5) * 110;
      mesh.position.y = (row - 1.5) * 110;
      scene.add(mesh);
      meshes.push(mesh);
    }
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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Slowly rotate camera
      camera.position.x = Math.sin(time * 0.3) * 100;
      camera.lookAt(scene.position);

      // Animate mesh scales
      meshes.forEach((mesh, i) => {
        const scale = 1 + Math.sin(time * 2 + i * 0.5) * 0.1;
        mesh.scale.set(scale, scale, 1);
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
    { title: 'three.js webgl - materials blending' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials blending', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsBlending(a, win, { width: WIDTH, height: HEIGHT });
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
