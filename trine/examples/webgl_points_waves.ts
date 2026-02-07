/**
 * three.js webgl - particles - waves
 *
 * Port of: three/examples/webgl_points_waves.html
 *
 * Tests:
 * - Dynamic vertex position updates
 * - Large particle grids
 * - Wave animation using sin functions
 * - PointsMaterial (adapted from original ShaderMaterial)
 *
 * Adaptations for Tsyne:
 * - Removes Stats
 * - Uses PointsMaterial instead of ShaderMaterial for compatibility
 * - Removes mouse tracking (uses time-based camera animation)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPointsWavesParams {
  width?: number;
  height?: number;
  amountX?: number;
  amountY?: number;
}

export interface WebGLPointsWavesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPointsWaves(
  a: App,
  win: ITsyneWindow,
  params: WebGLPointsWavesParams = {}
): Promise<WebGLPointsWavesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const AMOUNTX = params.amountX ?? 50;
  const AMOUNTY = params.amountY ?? 50;
  const SEPARATION = 100;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create particle grid
  const numParticles = AMOUNTX * AMOUNTY;
  const positions = new Float32Array(numParticles * 3);

  let i = 0;
  for (let ix = 0; ix < AMOUNTX; ix++) {
    for (let iy = 0; iy < AMOUNTY; iy++) {
      positions[i] = ix * SEPARATION - ((AMOUNTX * SEPARATION) / 2); // x
      positions[i + 1] = 0; // y (will be animated)
      positions[i + 2] = iy * SEPARATION - ((AMOUNTY * SEPARATION) / 2); // z
      i += 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Using PointsMaterial instead of ShaderMaterial for compatibility
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 10,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

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
  let count = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      // Animate camera in a gentle circle
      const time = currentTime * 0.001;
      camera.position.x = Math.sin(time * 0.2) * 200;
      camera.position.y = Math.cos(time * 0.15) * 300 + 200;
      camera.lookAt(scene.position);

      // Update particle positions with wave effect
      const positionAttr = particles.geometry.attributes.position;
      const posArray = positionAttr.array as Float32Array;

      let idx = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          // Animate Y position with wave
          posArray[idx + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          idx += 3;
        }
      }

      positionAttr.needsUpdate = true;
      count += 0.1;

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
    { title: 'three.js webgl - particles waves' },
    (a) => {
      a.window(
        { title: 'three.js webgl - particles waves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPointsWaves(a, win, { width: WIDTH, height: HEIGHT });
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
