/**
 * three.js webgl - lines - loop
 *
 * Tests:
 * - LineLoop geometry (closed loop)
 * - Multiple closed polygons
 * - Vertex colors on loops
 * - Dynamic rotation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesLoopParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesLoopDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesLoop(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesLoopParams = {}
): Promise<WebGLLinesLoopDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const loops: THREE.LineLoop[] = [];

  // Create regular polygon loops (triangle, square, pentagon, hexagon, etc.)
  for (let sides = 3; sides <= 12; sides++) {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    const radius = 30 + (sides - 3) * 5;
    const color = new THREE.Color();

    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);

      // Color based on vertex position
      color.setHSL((sides - 3) / 10, 1, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const loop = new THREE.LineLoop(geometry, material);

    // Arrange in a grid
    const col = (sides - 3) % 5;
    const row = Math.floor((sides - 3) / 5);
    loop.position.set(col * 100 - 200, row * -150 + 75, 0);

    scene.add(loop);
    loops.push(loop);
  }

  // Star shapes with LineLoop
  for (let points = 5; points <= 8; points++) {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    const outerRadius = 40;
    const innerRadius = 20;
    const color = new THREE.Color();

    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);

      // Color gradient
      color.setHSL((points - 5) / 4 + 0.5, 1, 0.6);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const loop = new THREE.LineLoop(geometry, material);

    loop.position.set((points - 5) * 100 - 150, -225, 0);
    scene.add(loop);
    loops.push(loop);
  }

  // Spiral shape with LineLoop
  const spiralGeometry = new THREE.BufferGeometry();
  const spiralPositions: number[] = [];
  const spiralColors: number[] = [];
  const spiralColor = new THREE.Color();

  const spiralPoints = 100;
  for (let i = 0; i < spiralPoints; i++) {
    const t = i / spiralPoints;
    const angle = t * Math.PI * 8;
    const radius = 10 + t * 40;
    spiralPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);

    spiralColor.setHSL(t, 1, 0.5);
    spiralColors.push(spiralColor.r, spiralColor.g, spiralColor.b);
  }

  spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spiralPositions, 3));
  spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(spiralColors, 3));

  const spiralMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
  const spiralLoop = new THREE.LineLoop(spiralGeometry, spiralMaterial);
  spiralLoop.position.set(200, 0, 0);
  scene.add(spiralLoop);
  loops.push(spiralLoop);

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

      // Rotate all loops
      for (let i = 0; i < loops.length; i++) {
        loops[i].rotation.z = time * (0.3 + i * 0.05);
        loops[i].rotation.x = Math.sin(time * 0.5 + i * 0.1) * 0.3;
        loops[i].rotation.y = Math.cos(time * 0.5 + i * 0.1) * 0.3;
      }

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
    { title: 'three.js webgl - lines - loop' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines - loop', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesLoop(a, win, { width: WIDTH, height: HEIGHT });
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
