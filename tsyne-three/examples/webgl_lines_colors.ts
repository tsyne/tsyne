/**
 * three.js webgl - lines - colors
 *
 * Based on: three/examples/webgl_lines_colors.html
 *
 * Tests:
 * - Multiple Line objects with different vertex colors
 * - CatmullRomCurve3 for smooth curves
 * - BufferGeometry with color attribute
 *
 * Adaptations for Tsyne:
 * - Uses procedural curves instead of hilbert3D
 * - Removes mouse interaction
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesColorsParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesColorsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesColors(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesColorsParams = {}
): Promise<WebGLLinesColorsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(33, width / height, 1, 10000);
  camera.position.z = 700;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Generate spiral curve points
  function generateSpiralPoints(
    turns: number,
    pointsPerTurn: number,
    radius: number,
    height: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= turns * pointsPerTurn; i++) {
      const t = i / pointsPerTurn;
      const angle = t * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius * (1 + t * 0.1),
          (t / turns) * height - height / 2,
          Math.sin(angle) * radius * (1 + t * 0.1)
        )
      );
    }
    return points;
  }

  // Generate Lissajous curve points
  function generateLissajousPoints(
    a: number,
    b: number,
    delta: number,
    scale: number,
    points: number
  ): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 4;
      result.push(
        new THREE.Vector3(
          Math.sin(a * t + delta) * scale,
          Math.sin(b * t) * scale,
          Math.cos(a * t) * scale * 0.5
        )
      );
    }
    return result;
  }

  const lines: THREE.Line[] = [];

  // Create colored spiral lines
  const spiralPoints = generateSpiralPoints(3, 50, 60, 150);
  const spiralSpline = new THREE.CatmullRomCurve3(spiralPoints);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const colors: number[] = [];
      const color = new THREE.Color();

      const subdivisions = 200;
      for (let i = 0; i <= subdivisions; i++) {
        const t = i / subdivisions;
        const point = spiralSpline.getPoint(t);
        vertices.push(point.x, point.y, point.z);

        // Different coloring schemes
        if (row === 0 && col === 0) {
          // Hue based on position along curve
          color.setHSL(t, 1.0, 0.5);
        } else if (row === 0 && col === 1) {
          // Blue gradient
          color.setHSL(0.6, 1.0, 0.3 + t * 0.5);
        } else if (row === 0 && col === 2) {
          // Green-red gradient
          color.setHSL(t * 0.3, 1.0, 0.5);
        } else if (row === 1 && col === 0) {
          // Magenta-cyan
          color.setHSL(0.8 - t * 0.3, 1.0, 0.5);
        } else if (row === 1 && col === 1) {
          // White-yellow
          color.setRGB(1.0, 1.0, 1.0 - t * 0.8);
        } else {
          // Red-white-blue
          if (t < 0.5) {
            color.setRGB(1.0, t * 2, t * 2);
          } else {
            color.setRGB(1.0 - (t - 0.5) * 2, 1.0 - (t - 0.5) * 2, 1.0);
          }
        }

        colors.push(color.r, color.g, color.b);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({ vertexColors: true });
      const line = new THREE.Line(geometry, material);

      const spacing = 160;
      line.position.x = (col - 1) * spacing;
      line.position.y = (row - 0.5) * spacing;

      scene.add(line);
      lines.push(line);
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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate lines alternating directions
      for (let i = 0; i < lines.length; i++) {
        lines[i].rotation.y = time * (i % 2 ? 0.5 : -0.5);
        lines[i].rotation.x = time * 0.2;
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
    { title: 'three.js webgl - lines - colors' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines - colors', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesColors(a, win, { width: WIDTH, height: HEIGHT });
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
