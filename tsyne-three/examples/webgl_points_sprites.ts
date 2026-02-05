/**
 * three.js webgl - points - sprites
 *
 * Demonstrates various point rendering techniques
 *
 * Tests:
 * - Multiple Points objects with different colors
 * - Large point counts (10k particles)
 * - Point size variations
 * - Dynamic rotation
 *
 * Adaptations for Tsyne:
 * - Uses solid color PointsMaterial (no sprites/textures)
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPointsSpritesParams {
  width?: number;
  height?: number;
}

export interface WebGLPointsSpritesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPointsSprites(
  a: App,
  win: Window,
  params: WebGLPointsSpritesParams = {}
): Promise<WebGLPointsSpritesDemo> {
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

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 2000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create multiple point systems with different colors and positions
  const materials: THREE.PointsMaterial[] = [];
  const colors = [0xff0040, 0x0040ff, 0x80ff80, 0xffaa00, 0x00ffaa, 0xaa00ff];

  for (let i = 0; i < colors.length; i++) {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    // Generate random points in a sphere
    for (let j = 0; j < 2000; j++) {
      const radius = 500 + Math.random() * 100;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;

      vertices.push(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
      color: colors[i],
      size: 2 + i,
    });
    materials.push(material);

    const particles = new THREE.Points(geometry, material);
    particles.rotation.x = Math.random() * 6;
    particles.rotation.y = Math.random() * 6;
    particles.rotation.z = Math.random() * 6;
    scene.add(particles);
  }

  // Add a central cluster with vertex colors
  const centralGeometry = new THREE.BufferGeometry();
  const centralVertices: number[] = [];
  const centralColors: number[] = [];

  for (let i = 0; i < 5000; i++) {
    // Cube distribution
    centralVertices.push(
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400
    );

    // Color based on position
    const color = new THREE.Color();
    color.setHSL(i / 5000, 1.0, 0.5);
    centralColors.push(color.r, color.g, color.b);
  }

  centralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(centralVertices, 3));
  centralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(centralColors, 3));

  const centralMaterial = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
  });

  const centralParticles = new THREE.Points(centralGeometry, centralMaterial);
  scene.add(centralParticles);

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

      // Rotate all point systems
      for (let i = 0; i < scene.children.length; i++) {
        const object = scene.children[i];
        if (object instanceof THREE.Points) {
          object.rotation.y = time * (i + 1) * 0.05;
        }
      }

      // Orbit camera
      camera.position.x = Math.cos(time * 0.1) * 800;
      camera.position.z = Math.sin(time * 0.1) * 800;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - points - sprites' },
    (a) => {
      a.window(
        { title: 'three.js webgl - points - sprites', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPointsSprites(a, win, { width: WIDTH, height: HEIGHT });
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
