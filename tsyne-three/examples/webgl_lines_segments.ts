/**
 * three.js webgl - lines - segments
 *
 * Custom example demonstrating LineSegments with vertex colors.
 *
 * Tests:
 * - THREE.LineSegments
 * - Vertex colors on line segments
 * - Dynamic geometry generation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesSegmentsParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesSegmentsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesSegments(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesSegmentsParams = {}
): Promise<WebGLLinesSegmentsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const group = new THREE.Group();
  scene.add(group);

  // Create a starburst pattern of line segments
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();

  const numRays = 100;
  const innerRadius = 50;
  const outerRadius = 200;

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    const hue = i / numRays;

    // Inner point
    positions.push(
      Math.cos(angle) * innerRadius,
      Math.sin(angle) * innerRadius,
      0
    );
    color.setHSL(hue, 1, 0.5);
    colors.push(color.r, color.g, color.b);

    // Outer point
    positions.push(
      Math.cos(angle) * outerRadius,
      Math.sin(angle) * outerRadius,
      0
    );
    color.setHSL(hue, 1, 0.8);
    colors.push(color.r, color.g, color.b);
  }

  const geometry1 = new THREE.BufferGeometry();
  geometry1.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry1.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material1 = new THREE.LineBasicMaterial({ vertexColors: true });
  const lines1 = new THREE.LineSegments(geometry1, material1);
  group.add(lines1);

  // Create a second layer with offset
  const lines2 = lines1.clone();
  lines2.rotation.z = Math.PI / numRays;
  lines2.scale.setScalar(0.7);
  group.add(lines2);

  // Create a third layer
  const lines3 = lines1.clone();
  lines3.rotation.z = Math.PI / numRays * 2;
  lines3.scale.setScalar(0.4);
  group.add(lines3);

  // Add a grid of line segments in the background
  const gridPositions: number[] = [];
  const gridColors: number[] = [];
  const gridSize = 400;
  const gridStep = 40;

  for (let x = -gridSize; x <= gridSize; x += gridStep) {
    // Vertical lines
    gridPositions.push(x, -gridSize, -100);
    gridPositions.push(x, gridSize, -100);

    const intensity = 0.2 + Math.abs(x / gridSize) * 0.1;
    gridColors.push(intensity, intensity, intensity);
    gridColors.push(intensity, intensity, intensity);
  }

  for (let y = -gridSize; y <= gridSize; y += gridStep) {
    // Horizontal lines
    gridPositions.push(-gridSize, y, -100);
    gridPositions.push(gridSize, y, -100);

    const intensity = 0.2 + Math.abs(y / gridSize) * 0.1;
    gridColors.push(intensity, intensity, intensity);
    gridColors.push(intensity, intensity, intensity);
  }

  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
  gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));

  const gridMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  scene.add(grid);

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

      // Rotate the starburst
      group.rotation.z = time * 0.2;

      // Pulse the scale slightly
      const scale = 1 + Math.sin(time * 2) * 0.05;
      group.scale.setScalar(scale);

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
    { title: 'three.js webgl - lines segments' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines segments', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesSegments(a, win, { width: WIDTH, height: HEIGHT });
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
