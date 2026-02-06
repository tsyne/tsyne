/**
 * three.js webgl - buffergeometry - attributes
 *
 * Tests:
 * - Custom vertex attributes
 * - Dynamic attribute updates
 * - Multiple attribute types (position, color, size)
 * - Attribute interleaving concepts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryAttributesParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryAttributesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryAttributes(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryAttributesParams = {}
): Promise<WebGLBufferGeometryAttributesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Create point cloud with custom attributes
  const particleCount = 10000;
  const geometry = new THREE.BufferGeometry();

  // Position attribute
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount); // Custom attribute for animation

  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    // Distribute in a torus shape
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    const R = 150; // Major radius
    const r = 50 + Math.random() * 30; // Minor radius with variation

    positions[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
    positions[i * 3 + 1] = (R + r * Math.cos(v)) * Math.sin(u);
    positions[i * 3 + 2] = r * Math.sin(v);

    // Color based on position in torus
    color.setHSL(u / (Math.PI * 2), 0.8, 0.5 + Math.cos(v) * 0.2);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Size variation
    sizes[i] = 2 + Math.random() * 3;

    // Random phase for animation
    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Create line geometry with dynamic colors
  const lineCount = 100;
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(lineCount * 2 * 3); // 2 vertices per line
  const lineColors = new Float32Array(lineCount * 2 * 3);

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const r1 = 80;
    const r2 = 120;

    // Start point
    linePositions[i * 6] = Math.cos(angle) * r1;
    linePositions[i * 6 + 1] = Math.sin(angle) * r1;
    linePositions[i * 6 + 2] = 0;

    // End point
    linePositions[i * 6 + 3] = Math.cos(angle) * r2;
    linePositions[i * 6 + 4] = Math.sin(angle) * r2;
    linePositions[i * 6 + 5] = 0;

    // Colors
    color.setHSL(i / lineCount, 1, 0.5);
    lineColors[i * 6] = color.r;
    lineColors[i * 6 + 1] = color.g;
    lineColors[i * 6 + 2] = color.b;
    lineColors[i * 6 + 3] = color.r;
    lineColors[i * 6 + 4] = color.g;
    lineColors[i * 6 + 5] = color.b;
  }

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  // Store references for animation
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
  const lineColorAttribute = lineGeometry.getAttribute('color') as THREE.BufferAttribute;

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

      // Animate point positions
      for (let i = 0; i < particleCount; i++) {
        const phase = phases[i];
        const u = (i / particleCount) * Math.PI * 2 + time * 0.2;
        const v = phase + time * 0.5;
        const R = 150;
        const r = 50 + Math.sin(time + phase) * 20;

        positionAttribute.array[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
        positionAttribute.array[i * 3 + 1] = (R + r * Math.cos(v)) * Math.sin(u);
        positionAttribute.array[i * 3 + 2] = r * Math.sin(v);

        // Animate colors
        const hue = (u / (Math.PI * 2) + time * 0.1) % 1;
        color.setHSL(hue, 0.8, 0.5 + Math.sin(time + phase) * 0.2);
        colorAttribute.array[i * 3] = color.r;
        colorAttribute.array[i * 3 + 1] = color.g;
        colorAttribute.array[i * 3 + 2] = color.b;
      }
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;

      // Animate line colors
      for (let i = 0; i < lineCount; i++) {
        const hue = ((i / lineCount) + time * 0.2) % 1;
        color.setHSL(hue, 1, 0.5);
        lineColorAttribute.array[i * 6] = color.r;
        lineColorAttribute.array[i * 6 + 1] = color.g;
        lineColorAttribute.array[i * 6 + 2] = color.b;
        lineColorAttribute.array[i * 6 + 3] = color.r;
        lineColorAttribute.array[i * 6 + 4] = color.g;
        lineColorAttribute.array[i * 6 + 5] = color.b;
      }
      lineColorAttribute.needsUpdate = true;

      // Rotate scene
      points.rotation.x = time * 0.1;
      points.rotation.y = time * 0.15;
      lines.rotation.z = time * 0.3;

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
    { title: 'three.js webgl - buffergeometry - attributes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry - attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryAttributes(a, win, { width: WIDTH, height: HEIGHT });
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
