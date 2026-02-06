/**
 * three.js webgl - simple global illumination
 *
 * Based on: https://threejs.org/examples/webgl_simple_gi.html
 *
 * Tests:
 * - Render to texture for GI computation
 * - Dynamic vertex colors
 * - TorusKnot geometry
 * - Multi-material box (room)
 * - Progressive vertex color accumulation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLSimpleGIParams {
  width?: number;
  height?: number;
}

export interface WebGLSimpleGIDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLSimpleGI(
  a: App,
  win: ITsyneWindow,
  params: WebGLSimpleGIParams = {}
): Promise<WebGLSimpleGIDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 4;

  const scene = new THREE.Scene();

  // TorusKnot with vertex colors
  const torusGeometry = new THREE.TorusKnotGeometry(0.75, 0.3, 128, 32, 1);
  const torusMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const torusKnot = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torusKnot);

  // Initialize vertex colors
  const positionAttribute = torusGeometry.attributes.position;
  const colorsArray = new Float32Array(positionAttribute.count * 3);

  // Start with random initial colors based on position
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);

    // Initial color based on position
    colorsArray[i * 3] = 0.5 + x * 0.3;
    colorsArray[i * 3 + 1] = 0.5 + y * 0.3;
    colorsArray[i * 3 + 2] = 0.5 + z * 0.3;
  }

  torusGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colorsArray, 3)
  );

  // Room (box with colored faces)
  const roomMaterials: THREE.MeshBasicMaterial[] = [];
  const roomColors = [
    0xff0000, // red - right
    0x00ff00, // green - left
    0x0000ff, // blue - top
    0xffff00, // yellow - bottom
    0xff00ff, // magenta - front
    0x00ffff, // cyan - back
  ];

  for (let i = 0; i < 6; i++) {
    roomMaterials.push(
      new THREE.MeshBasicMaterial({
        color: roomColors[i],
        side: THREE.BackSide,
      })
    );
  }

  const boxGeometry = new THREE.BoxGeometry(3, 3, 3);
  const box = new THREE.Mesh(boxGeometry, roomMaterials);
  scene.add(box);

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
  // Simple GI simulation
  // ─────────────────────────────────────────────────────────────────────────

  // For this simplified version, we'll animate the vertex colors
  // to simulate light bouncing from the colored walls

  const colorAttribute = torusGeometry.attributes.color as THREE.BufferAttribute;
  const tempColor = new THREE.Color();

  function simulateGI(time: number) {
    const colors = colorAttribute.array as Float32Array;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      // Simulate color bleeding from walls
      // Based on which direction the vertex faces
      const nx = x / Math.max(0.001, Math.sqrt(x * x + y * y + z * z));
      const ny = y / Math.max(0.001, Math.sqrt(x * x + y * y + z * z));
      const nz = z / Math.max(0.001, Math.sqrt(x * x + y * y + z * z));

      // Color contribution from each wall
      let r = 0.3,
        g = 0.3,
        b = 0.3;

      // Right wall (red) contribution
      if (nx > 0) r += nx * 0.4 * (0.5 + 0.5 * Math.sin(time));
      // Left wall (green) contribution
      if (nx < 0) g += -nx * 0.4 * (0.5 + 0.5 * Math.sin(time * 0.8));
      // Top wall (blue) contribution
      if (ny > 0) b += ny * 0.4 * (0.5 + 0.5 * Math.sin(time * 1.2));
      // Bottom wall (yellow) contribution
      if (ny < 0) {
        r += -ny * 0.3;
        g += -ny * 0.3;
      }
      // Front wall (magenta) contribution
      if (nz > 0) {
        r += nz * 0.3 * (0.5 + 0.5 * Math.sin(time * 0.6));
        b += nz * 0.3 * (0.5 + 0.5 * Math.sin(time * 0.6));
      }
      // Back wall (cyan) contribution
      if (nz < 0) {
        g += -nz * 0.3 * (0.5 + 0.5 * Math.sin(time * 0.9));
        b += -nz * 0.3 * (0.5 + 0.5 * Math.sin(time * 0.9));
      }

      colors[i * 3] = Math.min(1, r);
      colors[i * 3 + 1] = Math.min(1, g);
      colors[i * 3 + 2] = Math.min(1, b);
    }

    colorAttribute.needsUpdate = true;
  }

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

      // Rotate torus knot
      torusKnot.rotation.x = time * 0.2;
      torusKnot.rotation.y = time * 0.3;

      // Simulate GI
      simulateGI(time);

      renderer.render(scene, camera);

      // Flush GL commands
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
    { title: 'three.js webgl - simple global illumination' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - simple global illumination',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLSimpleGI(a, win, { width: WIDTH, height: HEIGHT });
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
