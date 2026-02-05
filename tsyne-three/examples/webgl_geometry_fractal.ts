/**
 * three.js webgl - geometry fractal
 *
 * Tests:
 * - Fractal-like recursive geometry
 * - Sierpinski tetrahedron structure
 * - Deep hierarchy of meshes
 * - Animated recursive transformations
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryFractalParams {
  width?: number;
  height?: number;
  depth?: number;
}

export interface WebGLGeometryFractalDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryFractal(
  a: App,
  win: Window,
  params: WebGLGeometryFractalParams = {}
): Promise<WebGLGeometryFractalDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const depth = params.depth ?? 4;

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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a15);

  // ─────────────────────────────────────────────────────────────────────────
  // Create Sierpinski tetrahedron
  // ─────────────────────────────────────────────────────────────────────────

  const mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Tetrahedron vertices (centered)
  const sqrt2 = Math.sqrt(2);
  const sqrt3 = Math.sqrt(3);
  const tetraVertices = [
    new THREE.Vector3(1, 0, -1 / sqrt2),
    new THREE.Vector3(-1, 0, -1 / sqrt2),
    new THREE.Vector3(0, 1, 1 / sqrt2),
    new THREE.Vector3(0, -1, 1 / sqrt2),
  ];

  const allMeshes: THREE.LineSegments[] = [];

  function createTetrahedronLines(vertices: THREE.Vector3[], depthLevel: number): THREE.Group {
    const group = new THREE.Group();

    if (depthLevel === 0) {
      // Create line geometry for edges
      const positions: number[] = [];
      const colors: number[] = [];
      const color = new THREE.Color();

      // Draw all 6 edges
      const edges = [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [1, 3], [2, 3]
      ];

      for (const edge of edges) {
        const v1 = vertices[edge[0]];
        const v2 = vertices[edge[1]];

        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);

        // Color based on edge direction
        const hue = (edge[0] + edge[1]) / 6;
        color.setHSL(hue, 0.8, 0.6);
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
      });

      const lines = new THREE.LineSegments(geometry, material);
      group.add(lines);
      allMeshes.push(lines);
    } else {
      // Subdivide: create 4 smaller tetrahedra
      const midpoints: THREE.Vector3[] = [];
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          midpoints.push(
            new THREE.Vector3().lerpVectors(vertices[i], vertices[j], 0.5)
          );
        }
      }

      // Create 4 sub-tetrahedra at corners
      const subTetrahedra = [
        [vertices[0], midpoints[0], midpoints[1], midpoints[2]], // corner 0
        [midpoints[0], vertices[1], midpoints[3], midpoints[4]], // corner 1
        [midpoints[1], midpoints[3], vertices[2], midpoints[5]], // corner 2
        [midpoints[2], midpoints[4], midpoints[5], vertices[3]], // corner 3
      ];

      for (const subVerts of subTetrahedra) {
        const subGroup = createTetrahedronLines(subVerts, depthLevel - 1);
        group.add(subGroup);
      }
    }

    return group;
  }

  // Scale up the initial tetrahedron
  const scale = 150;
  const scaledVertices = tetraVertices.map(v => v.clone().multiplyScalar(scale));
  const fractal = createTetrahedronLines(scaledVertices, depth);
  mainGroup.add(fractal);

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Rotate fractal
      mainGroup.rotation.y = time * 0.3;
      mainGroup.rotation.x = Math.sin(time * 0.2) * 0.3;

      // Pulsing effect on opacity
      for (let i = 0; i < allMeshes.length; i++) {
        const mesh = allMeshes[i];
        const opacity = 0.5 + 0.4 * Math.sin(time * 2 + i * 0.1);
        (mesh.material as THREE.LineBasicMaterial).opacity = opacity;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 350;
      camera.position.z = Math.cos(time * 0.15) * 350;
      camera.position.y = Math.sin(time * 0.1) * 150;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - geometry fractal' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry fractal', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryFractal(a, win, { width: WIDTH, height: HEIGHT });
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
