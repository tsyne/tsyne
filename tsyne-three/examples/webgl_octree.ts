/**
 * three.js webgl - octree
 *
 * Port of: three/examples/webgl_octree.html
 *
 * Tests:
 * - Octree data structure visualization
 * - Spatial partitioning
 * - Box geometry for octree nodes
 * - Hierarchical structure display
 *
 * Adaptations for Tsyne:
 * - Manual octree implementation
 * - Procedural visualization
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLOctreeParams {
  width?: number;
  height?: number;
}

export interface WebGLOctreeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Octree Implementation
// ═══════════════════════════════════════════════════════════════════════════

interface OctreeNode {
  center: { x: number; y: number; z: number };
  size: number;
  depth: number;
  children: OctreeNode[] | null;
  objects: THREE.Vector3[];
}

function createOctree(
  center: { x: number; y: number; z: number },
  size: number,
  maxDepth: number,
  maxObjects: number,
  objects: THREE.Vector3[],
  depth: number = 0
): OctreeNode {
  const node: OctreeNode = {
    center,
    size,
    depth,
    children: null,
    objects: [],
  };

  // Filter objects that belong to this node
  const halfSize = size / 2;
  for (const obj of objects) {
    if (
      obj.x >= center.x - halfSize && obj.x < center.x + halfSize &&
      obj.y >= center.y - halfSize && obj.y < center.y + halfSize &&
      obj.z >= center.z - halfSize && obj.z < center.z + halfSize
    ) {
      node.objects.push(obj);
    }
  }

  // Subdivide if necessary
  if (node.objects.length > maxObjects && depth < maxDepth) {
    node.children = [];
    const quarterSize = size / 4;

    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const childCenter = {
            x: center.x + x * quarterSize,
            y: center.y + y * quarterSize,
            z: center.z + z * quarterSize,
          };
          node.children.push(
            createOctree(childCenter, halfSize, maxDepth, maxObjects, node.objects, depth + 1)
          );
        }
      }
    }
  }

  return node;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLOctree(
  a: App,
  win: Window,
  params: WebGLOctreeParams = {}
): Promise<WebGLOctreeDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(150, 150, 150);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // ─────────────────────────────────────────────────────────────────────────
  // Generate random points
  // ─────────────────────────────────────────────────────────────────────────

  const points: THREE.Vector3[] = [];
  const worldSize = 100;
  const pointCount = 500;

  // Create clustered distribution
  const clusters = [
    new THREE.Vector3(-30, -30, -30),
    new THREE.Vector3(30, 30, 30),
    new THREE.Vector3(-30, 30, -30),
    new THREE.Vector3(30, -30, 30),
  ];

  for (let i = 0; i < pointCount; i++) {
    const cluster = clusters[Math.floor(Math.random() * clusters.length)];
    const spread = 25;
    points.push(
      new THREE.Vector3(
        cluster.x + (Math.random() - 0.5) * spread,
        cluster.y + (Math.random() - 0.5) * spread,
        cluster.z + (Math.random() - 0.5) * spread
      )
    );
  }

  // Build octree
  const octree = createOctree(
    { x: 0, y: 0, z: 0 },
    worldSize,
    5, // max depth
    10, // max objects per node before split
    points
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Visualize octree
  // ─────────────────────────────────────────────────────────────────────────

  const octreeGroup = new THREE.Group();

  // Colors for different depths
  const depthColors = [
    0xff0000,
    0xff8800,
    0xffff00,
    0x00ff00,
    0x0088ff,
    0x8800ff,
  ];

  function visualizeNode(node: OctreeNode) {
    // Create wireframe box for this node
    const geometry = new THREE.BoxGeometry(node.size, node.size, node.size);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: depthColors[node.depth % depthColors.length],
      transparent: true,
      opacity: 0.3 + (node.depth * 0.1),
    });
    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.set(node.center.x, node.center.y, node.center.z);
    octreeGroup.add(wireframe);

    // Visualize children recursively
    if (node.children) {
      for (const child of node.children) {
        visualizeNode(child);
      }
    }
  }

  visualizeNode(octree);
  scene.add(octreeGroup);

  // Visualize points
  const pointsGeometry = new THREE.BufferGeometry();
  const pointPositions: number[] = [];
  const pointColors: number[] = [];

  for (const point of points) {
    pointPositions.push(point.x, point.y, point.z);
    // Color based on position
    pointColors.push(
      0.5 + point.x / worldSize,
      0.5 + point.y / worldSize,
      0.5 + point.z / worldSize
    );
  }

  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
  pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
  });

  const pointsCloud = new THREE.Points(pointsGeometry, pointsMaterial);
  scene.add(pointsCloud);

  // Add small spheres at cluster centers
  for (const cluster of clusters) {
    const sphereGeometry = new THREE.SphereGeometry(3, 16, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(cluster);
    scene.add(sphere);
  }

  // Add coordinate axes
  const axesHelper = new THREE.AxesHelper(worldSize / 2);
  scene.add(axesHelper);

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

      // Rotate octree visualization
      octreeGroup.rotation.y = time * 0.1;
      pointsCloud.rotation.y = time * 0.1;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 200;
      camera.position.z = Math.cos(time * 0.2) * 200;
      camera.position.y = 100 + Math.sin(time * 0.1) * 50;
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
    { title: 'three.js webgl - octree' },
    (a) => {
      a.window(
        { title: 'three.js webgl - octree', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLOctree(a, win, { width: WIDTH, height: HEIGHT });
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
