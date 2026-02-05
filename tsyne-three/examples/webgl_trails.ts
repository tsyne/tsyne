/**
 * three.js webgl - trails
 *
 * Tests:
 * - Trail/ribbon effects
 * - Dynamic line geometry
 * - History-based rendering
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLTrailsParams {
  width?: number;
  height?: number;
}

export interface WebGLTrailsDemo {
  stop: () => void;
  getTime: () => number;
}

interface Trail {
  line: THREE.Line;
  positions: Float32Array;
  colors: Float32Array;
  head: THREE.Mesh;
  historyLength: number;
  currentIndex: number;
  hue: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLTrails(
  a: App,
  win: Window,
  params: WebGLTrailsParams = {}
): Promise<WebGLTrailsDemo> {
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

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  const trails: Trail[] = [];
  const trailCount = 10;
  const historyLength = 100;

  for (let i = 0; i < trailCount; i++) {
    // Create trail geometry
    const positions = new Float32Array(historyLength * 3);
    const colors = new Float32Array(historyLength * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Create head sphere
    const headGeometry = new THREE.SphereGeometry(5, 16, 12);
    const hue = i / trailCount;
    const headMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue, 1, 0.5),
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    scene.add(head);

    // Initialize positions
    const startX = (Math.random() - 0.5) * 200;
    const startY = (Math.random() - 0.5) * 200;
    const startZ = (Math.random() - 0.5) * 200;

    for (let j = 0; j < historyLength; j++) {
      positions[j * 3] = startX;
      positions[j * 3 + 1] = startY;
      positions[j * 3 + 2] = startZ;
    }

    trails.push({
      line,
      positions,
      colors,
      head,
      historyLength,
      currentIndex: 0,
      hue,
    });
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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      for (let i = 0; i < trails.length; i++) {
        const trail = trails[i];

        // Calculate new head position (Lissajous-like curves)
        const phase = i * Math.PI * 2 / trailCount;
        const newX = Math.sin(time * 0.7 + phase) * 150 + Math.sin(time * 1.3 + phase) * 50;
        const newY = Math.cos(time * 0.5 + phase) * 150 + Math.cos(time * 1.1 + phase) * 50;
        const newZ = Math.sin(time * 0.3 + phase) * 100;

        // Update head position
        trail.head.position.set(newX, newY, newZ);

        // Shift all positions back
        for (let j = trail.historyLength - 1; j > 0; j--) {
          trail.positions[j * 3] = trail.positions[(j - 1) * 3];
          trail.positions[j * 3 + 1] = trail.positions[(j - 1) * 3 + 1];
          trail.positions[j * 3 + 2] = trail.positions[(j - 1) * 3 + 2];
        }

        // Add new position at front
        trail.positions[0] = newX;
        trail.positions[1] = newY;
        trail.positions[2] = newZ;

        // Update colors (fade from bright to dim)
        const color = new THREE.Color();
        for (let j = 0; j < trail.historyLength; j++) {
          const t = j / trail.historyLength;
          color.setHSL(trail.hue, 1, 0.5 * (1 - t));
          trail.colors[j * 3] = color.r;
          trail.colors[j * 3 + 1] = color.g;
          trail.colors[j * 3 + 2] = color.b;
        }

        // Mark attributes as needing update
        const positionAttr = trail.line.geometry.getAttribute('position');
        const colorAttr = trail.line.geometry.getAttribute('color');
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
      }

      // Slowly rotate camera
      camera.position.x = Math.sin(time * 0.1) * 400;
      camera.position.z = Math.cos(time * 0.1) * 400;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - trails' },
    (a) => {
      a.window(
        { title: 'three.js webgl - trails', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTrails(a, win, { width: WIDTH, height: HEIGHT });
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
