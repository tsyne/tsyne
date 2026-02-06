/**
 * three.js webgl - interactive lines
 *
 * Tests:
 * - Line geometry
 * - Line segments
 * - Line loop
 * - Animated line connections
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveLinesParams {
  width?: number;
  height?: number;
}

export interface WebGLInteractiveLinesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractiveLines(
  a: App,
  win: ITsyneWindow,
  params: WebGLInteractiveLinesParams = {}
): Promise<WebGLInteractiveLinesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 800);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Create points that will be connected by lines
  const pointCount = 50;
  const points: THREE.Vector3[] = [];
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < pointCount; i++) {
    points.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400
      )
    );
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )
    );
  }

  // Create line geometry for connections
  const lineGeometry = new THREE.BufferGeometry();
  const maxConnections = pointCount * (pointCount - 1) / 2;
  const linePositions = new Float32Array(maxConnections * 6); // 2 points * 3 coords
  const lineColors = new Float32Array(maxConnections * 6);

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  lineGeometry.setDrawRange(0, 0);

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
  });

  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineSegments);

  // Create point cloud for the nodes
  const pointsGeometry = new THREE.BufferGeometry();
  const pointPositions = new Float32Array(pointCount * 3);
  const pointColors = new Float32Array(pointCount * 3);

  for (let i = 0; i < pointCount; i++) {
    const i3 = i * 3;
    pointPositions[i3] = points[i].x;
    pointPositions[i3 + 1] = points[i].y;
    pointPositions[i3 + 2] = points[i].z;

    // Color based on position
    pointColors[i3] = (points[i].x / 400 + 0.5);
    pointColors[i3 + 1] = (points[i].y / 400 + 0.5);
    pointColors[i3 + 2] = (points[i].z / 400 + 0.5);
  }

  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 8,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });

  const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
  scene.add(pointCloud);

  // Create a rotating polygon outline
  const polygonPoints = [];
  const sides = 6;
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    polygonPoints.push(new THREE.Vector3(
      Math.cos(angle) * 150,
      Math.sin(angle) * 150,
      0
    ));
  }

  const polygonGeometry = new THREE.BufferGeometry().setFromPoints(polygonPoints);
  const polygonMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const polygon = new THREE.LineLoop(polygonGeometry, polygonMaterial);
  scene.add(polygon);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  const connectionDistance = 150;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Update point positions
      const pointPosAttr = pointsGeometry.getAttribute('position') as THREE.BufferAttribute;
      const pointColAttr = pointsGeometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < pointCount; i++) {
        // Move point
        points[i].add(velocities[i]);

        // Bounce off boundaries
        if (Math.abs(points[i].x) > 200) velocities[i].x *= -1;
        if (Math.abs(points[i].y) > 200) velocities[i].y *= -1;
        if (Math.abs(points[i].z) > 200) velocities[i].z *= -1;

        const i3 = i * 3;
        pointPosAttr.array[i3] = points[i].x;
        pointPosAttr.array[i3 + 1] = points[i].y;
        pointPosAttr.array[i3 + 2] = points[i].z;

        // Update colors
        pointColAttr.array[i3] = (points[i].x / 400 + 0.5);
        pointColAttr.array[i3 + 1] = (points[i].y / 400 + 0.5);
        pointColAttr.array[i3 + 2] = (points[i].z / 400 + 0.5);
      }

      pointPosAttr.needsUpdate = true;
      pointColAttr.needsUpdate = true;

      // Update line connections
      const linePosAttr = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
      const lineColAttr = lineGeometry.getAttribute('color') as THREE.BufferAttribute;
      let connectionCount = 0;

      for (let i = 0; i < pointCount; i++) {
        for (let j = i + 1; j < pointCount; j++) {
          const distance = points[i].distanceTo(points[j]);
          
          if (distance < connectionDistance) {
            const idx = connectionCount * 6;
            
            // First point
            linePosAttr.array[idx] = points[i].x;
            linePosAttr.array[idx + 1] = points[i].y;
            linePosAttr.array[idx + 2] = points[i].z;
            
            // Second point
            linePosAttr.array[idx + 3] = points[j].x;
            linePosAttr.array[idx + 4] = points[j].y;
            linePosAttr.array[idx + 5] = points[j].z;

            // Color based on distance
            const alpha = 1 - distance / connectionDistance;
            lineColAttr.array[idx] = alpha;
            lineColAttr.array[idx + 1] = alpha * 0.5;
            lineColAttr.array[idx + 2] = 1;
            lineColAttr.array[idx + 3] = alpha;
            lineColAttr.array[idx + 4] = alpha * 0.5;
            lineColAttr.array[idx + 5] = 1;

            connectionCount++;
          }
        }
      }

      linePosAttr.needsUpdate = true;
      lineColAttr.needsUpdate = true;
      lineGeometry.setDrawRange(0, connectionCount * 2);

      // Rotate polygon
      polygon.rotation.z = time * 0.5;
      polygon.rotation.x = time * 0.3;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 600;
      camera.position.z = Math.cos(time * 0.2) * 600;
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
    { title: 'three.js webgl - interactive lines' },
    (a) => {
      a.window(
        { title: 'three.js webgl - interactive lines', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveLines(a, win, { width: WIDTH, height: HEIGHT });
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
