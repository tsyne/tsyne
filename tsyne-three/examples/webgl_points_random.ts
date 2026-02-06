/**
 * three.js webgl - points - random
 *
 * Tests:
 * - Large point cloud (50k points)
 * - Vertex colors with position-based coloring
 * - Point size
 * - Dynamic rotation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPointsRandomParams {
  width?: number;
  height?: number;
}

export interface WebGLPointsRandomDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPointsRandom(
  a: App,
  win: ITsyneWindow,
  params: WebGLPointsRandomParams = {}
): Promise<WebGLPointsRandomDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Create large point cloud
  const particleCount = 50000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color = new THREE.Color();
  const radius = 400;

  for (let i = 0; i < particleCount; i++) {
    // Random position in sphere
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5) * radius;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Color based on position
    color.setHSL(
      (x + radius) / (radius * 2), // Hue from position
      0.8 + Math.random() * 0.2, // Saturation
      0.4 + (r / radius) * 0.3 // Lightness from distance
    );

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Add a second smaller cluster with different distribution
  const clusterGeometry = new THREE.BufferGeometry();
  const clusterCount = 10000;
  const clusterPositions = new Float32Array(clusterCount * 3);
  const clusterColors = new Float32Array(clusterCount * 3);

  for (let i = 0; i < clusterCount; i++) {
    // Gaussian-like distribution using Box-Muller
    const u1 = Math.random();
    const u2 = Math.random();
    const mag = 100 * Math.sqrt(-2 * Math.log(u1));

    clusterPositions[i * 3] = mag * Math.cos(2 * Math.PI * u2);
    clusterPositions[i * 3 + 1] = mag * Math.sin(2 * Math.PI * u2);
    clusterPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;

    // White to blue gradient
    const t = Math.sqrt(
      clusterPositions[i * 3] ** 2 + clusterPositions[i * 3 + 1] ** 2
    ) / 150;
    color.setRGB(1 - t * 0.5, 1 - t * 0.3, 1);

    clusterColors[i * 3] = color.r;
    clusterColors[i * 3 + 1] = color.g;
    clusterColors[i * 3 + 2] = color.b;
  }

  clusterGeometry.setAttribute('position', new THREE.BufferAttribute(clusterPositions, 3));
  clusterGeometry.setAttribute('color', new THREE.BufferAttribute(clusterColors, 3));

  const clusterMaterial = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
  });

  const cluster = new THREE.Points(clusterGeometry, clusterMaterial);
  cluster.position.set(0, 0, 0);
  scene.add(cluster);

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

      // Rotate point clouds
      points.rotation.x = time * 0.1;
      points.rotation.y = time * 0.15;

      cluster.rotation.z = time * 0.3;
      cluster.rotation.x = time * 0.1;

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
    { title: 'three.js webgl - points - random' },
    (a) => {
      a.window(
        { title: 'three.js webgl - points - random', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPointsRandom(a, win, { width: WIDTH, height: HEIGHT });
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
