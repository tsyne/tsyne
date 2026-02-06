/**
 * three.js webgl - geometry octree
 *
 * Tests:
 * - Octree visualization with wireframe boxes
 * - Recursive spatial subdivision
 * - Animated expansion/collapse
 * - Hierarchical line geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryOctreeParams {
  width?: number;
  height?: number;
  maxDepth?: number;
}

export interface WebGLGeometryOctreeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryOctree(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryOctreeParams = {}
): Promise<WebGLGeometryOctreeDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const maxDepth = params.maxDepth ?? 3;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  // ─────────────────────────────────────────────────────────────────────────
  // Create octree visualization
  // ─────────────────────────────────────────────────────────────────────────

  interface OctreeNode {
    group: THREE.Group;
    box: THREE.LineSegments;
    depth: number;
    children: OctreeNode[];
    center: THREE.Vector3;
    size: number;
  }

  const allNodes: OctreeNode[] = [];

  function createWireframeBox(center: THREE.Vector3, size: number, depth: number): THREE.LineSegments {
    const halfSize = size / 2;
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    // 12 edges of a box
    const corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // front
      [4, 5], [5, 6], [6, 7], [7, 4], // back
      [0, 4], [1, 5], [2, 6], [3, 7]  // connecting
    ];

    color.setHSL(depth / maxDepth, 0.8, 0.5);

    for (const edge of edges) {
      const c1 = corners[edge[0]];
      const c2 = corners[edge[1]];

      positions.push(
        center.x + c1[0] * halfSize,
        center.y + c1[1] * halfSize,
        center.z + c1[2] * halfSize,
        center.x + c2[0] * halfSize,
        center.y + c2[1] * halfSize,
        center.z + c2[2] * halfSize
      );

      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1 - depth * 0.15,
    });

    return new THREE.LineSegments(geometry, material);
  }

  function createOctree(center: THREE.Vector3, size: number, depth: number): OctreeNode {
    const group = new THREE.Group();
    const box = createWireframeBox(center, size, depth);
    group.add(box);

    const node: OctreeNode = {
      group,
      box,
      depth,
      children: [],
      center,
      size,
    };

    if (depth < maxDepth) {
      const childSize = size / 2;
      const offset = childSize / 2;

      // Create 8 children
      for (let x = -1; x <= 1; x += 2) {
        for (let y = -1; y <= 1; y += 2) {
          for (let z = -1; z <= 1; z += 2) {
            const childCenter = new THREE.Vector3(
              center.x + x * offset,
              center.y + y * offset,
              center.z + z * offset
            );

            // Randomly decide whether to subdivide (for visual interest)
            if (Math.random() > 0.3) {
              const child = createOctree(childCenter, childSize, depth + 1);
              node.children.push(child);
              group.add(child.group);
            }
          }
        }
      }
    }

    allNodes.push(node);
    return node;
  }

  const rootSize = 200;
  const rootCenter = new THREE.Vector3(0, 0, 0);
  const octree = createOctree(rootCenter, rootSize, 0);
  scene.add(octree.group);

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

      // Rotate octree
      octree.group.rotation.y = time * 0.2;
      octree.group.rotation.x = Math.sin(time * 0.1) * 0.2;

      // Animate node visibility based on depth and time
      for (const node of allNodes) {
        const scale = 0.8 + 0.2 * Math.sin(time * 2 + node.depth);
        node.group.scale.setScalar(scale);

        // Pulsing opacity
        const mat = node.box.material as THREE.LineBasicMaterial;
        mat.opacity = (1 - node.depth * 0.15) * (0.7 + 0.3 * Math.sin(time * 3 + node.depth * 0.5));
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 450;
      camera.position.z = Math.cos(time * 0.15) * 450;
      camera.position.y = Math.sin(time * 0.1) * 150 + 100;
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
    { title: 'three.js webgl - geometry octree' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry octree', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryOctree(a, win, { width: WIDTH, height: HEIGHT });
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
