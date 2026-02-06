/**
 * three.js webgl - geometry - convex hull
 *
 * Tests:
 * - ConvexGeometry from random points
 * - Multiple convex hulls
 * - Dynamic point sets
 * - Wireframe visualization
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryConvexParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryConvexDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryConvex(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryConvexParams = {}
): Promise<WebGLGeometryConvexDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const meshes: THREE.Mesh[] = [];
  const pointClouds: THREE.Points[] = [];

  // Create multiple convex hulls with different point distributions
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const positions = [
    new THREE.Vector3(-150, 100, 0),
    new THREE.Vector3(0, 100, 0),
    new THREE.Vector3(150, 100, 0),
    new THREE.Vector3(-150, -50, 0),
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(150, -50, 0),
  ];

  for (let h = 0; h < 6; h++) {
    const points: THREE.Vector3[] = [];
    const pointCount = 15 + Math.floor(Math.random() * 10);

    // Generate random points with different distributions
    for (let i = 0; i < pointCount; i++) {
      let point: THREE.Vector3;

      switch (h) {
        case 0: // Spherical distribution
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.acos(2 * Math.random() - 1);
          const r = 30 + Math.random() * 20;
          point = new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
          );
          break;

        case 1: // Box distribution
          point = new THREE.Vector3(
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 80
          );
          break;

        case 2: // Elongated distribution
          point = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 20
          );
          break;

        case 3: // Flattened disc
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 50;
          point = new THREE.Vector3(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 10,
            Math.sin(angle) * dist
          );
          break;

        case 4: // Tetrahedron-like (4 clusters)
          const cluster = Math.floor(Math.random() * 4);
          const clusterCenters = [
            new THREE.Vector3(0, 40, 0),
            new THREE.Vector3(-35, -20, 20),
            new THREE.Vector3(35, -20, 20),
            new THREE.Vector3(0, -20, -35),
          ];
          point = clusterCenters[cluster]
            .clone()
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30
              )
            );
          break;

        case 5: // Ring distribution
        default:
          const ringAngle = Math.random() * Math.PI * 2;
          const ringRadius = 30 + Math.random() * 15;
          point = new THREE.Vector3(
            Math.cos(ringAngle) * ringRadius,
            (Math.random() - 0.5) * 30,
            Math.sin(ringAngle) * ringRadius
          );
          break;
      }

      points.push(point);
    }

    // Create convex hull
    const convexGeometry = new ConvexGeometry(points);
    const convexMaterial = new THREE.MeshBasicMaterial({
      color: colors[h],
      wireframe: true,
    });
    const convexMesh = new THREE.Mesh(convexGeometry, convexMaterial);
    convexMesh.position.copy(positions[h]);
    scene.add(convexMesh);
    meshes.push(convexMesh);

    // Also show the points
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsPositions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      pointsPositions[i * 3] = points[i].x;
      pointsPositions[i * 3 + 1] = points[i].y;
      pointsPositions[i * 3 + 2] = points[i].z;
    }
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4,
    });
    const pointsCloud = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsCloud.position.copy(positions[h]);
    scene.add(pointsCloud);
    pointClouds.push(pointsCloud);
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

      // Rotate all meshes and point clouds together
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].rotation.y = time * 0.3;
        meshes[i].rotation.x = time * 0.2;
        pointClouds[i].rotation.y = time * 0.3;
        pointClouds[i].rotation.x = time * 0.2;
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
    { title: 'three.js webgl - geometry - convex hull' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - convex hull', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryConvex(a, win, { width: WIDTH, height: HEIGHT });
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
