/**
 * three.js webgl - lines - spiral
 *
 * Custom example demonstrating line-based visualizations.
 *
 * Tests:
 * - THREE.Line with LineBasicMaterial
 * - Procedural spiral/helix geometry
 * - Vertex colors on lines
 * - Multiple line objects
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesSpiralParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesSpiralDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesSpiral(
  a: App,
  win: Window,
  params: WebGLLinesSpiralParams = {}
): Promise<WebGLLinesSpiralDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const group = new THREE.Group();
  scene.add(group);

  // Create multiple spiral lines with different colors
  const spirals = [
    { color: 0xff0000, radius: 100, height: 300, turns: 5, phase: 0 },
    { color: 0x00ff00, radius: 100, height: 300, turns: 5, phase: Math.PI * 2 / 3 },
    { color: 0x0000ff, radius: 100, height: 300, turns: 5, phase: Math.PI * 4 / 3 },
    { color: 0xffff00, radius: 60, height: 200, turns: 8, phase: 0 },
    { color: 0xff00ff, radius: 60, height: 200, turns: 8, phase: Math.PI },
  ];

  for (const spiral of spirals) {
    const points = [];
    const colors = [];
    const segments = 500;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * spiral.turns + spiral.phase;
      const x = Math.cos(angle) * spiral.radius;
      const y = t * spiral.height - spiral.height / 2;
      const z = Math.sin(angle) * spiral.radius;
      points.push(new THREE.Vector3(x, y, z));

      // Color fades along the spiral
      const color = new THREE.Color(spiral.color);
      const hsv = { h: 0, s: 0, l: 0 };
      color.getHSL(hsv);
      color.setHSL(hsv.h + t * 0.2, hsv.s, 0.3 + t * 0.4);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  // Add a central axis line
  const axisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -200, 0),
    new THREE.Vector3(0, 200, 0),
  ]);
  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
  const axisLine = new THREE.Line(axisGeometry, axisMaterial);
  group.add(axisLine);

  // Add horizontal rings at intervals
  for (let y = -150; y <= 150; y += 75) {
    const ringPoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(
        Math.cos(angle) * 120,
        y,
        Math.sin(angle) * 120
      ));
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    const ring = new THREE.Line(ringGeometry, ringMaterial);
    group.add(ring);
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

      // Rotate the group
      group.rotation.y = time * 0.3;
      group.rotation.x = Math.sin(time * 0.2) * 0.2;

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
    { title: 'three.js webgl - lines spiral' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines spiral', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesSpiral(a, win, { width: WIDTH, height: HEIGHT });
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
