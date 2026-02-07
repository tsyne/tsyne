/**
 * three.js webgl - interactive - raycasting - points
 *
 * Port of: three/examples/webgl_interactive_raycasting_points.html
 *
 * Tests:
 * - BufferGeometry with position and color attributes
 * - PointsMaterial with vertexColors
 * - Three point clouds: regular, indexed, and indexed with offset
 * - Raycasting with Points.threshold parameter
 * - Sphere markers that appear at intersection points
 * - Camera rotation animation
 *
 * Adaptations for Tsyne:
 * - Uses simulated pointer position (center screen + sine wave)
 * - Removes Stats and Timer
 * - Uses while(running) animation loop with await gl.flush()
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveRaycastingPointsParams {
  width?: number;
  height?: number;
}

export interface WebGLInteractiveRaycastingPointsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractiveRaycastingPoints(
  a: App,
  win: ITsyneWindow,
  params: WebGLInteractiveRaycastingPointsParams = {}
): Promise<WebGLInteractiveRaycastingPointsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Point cloud generation functions
  // ─────────────────────────────────────────────────────────────────────────

  const threshold = 0.1;
  const pointSize = 0.05;
  const pointWidth = 80;
  const pointLength = 160;

  function generatePointCloudGeometry(color: any, width: number, length: number) {
    const geometry = new THREE.BufferGeometry();
    const numPoints = width * length;

    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    let k = 0;

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        const u = i / width;
        const v = j / length;
        const x = u - 0.5;
        const y = (Math.cos(u * Math.PI * 4) + Math.sin(v * Math.PI * 8)) / 20;
        const z = v - 0.5;

        positions[3 * k] = x;
        positions[3 * k + 1] = y;
        positions[3 * k + 2] = z;

        const intensity = (y + 0.1) * 5;
        colors[3 * k] = color.r * intensity;
        colors[3 * k + 1] = color.g * intensity;
        colors[3 * k + 2] = color.b * intensity;

        k++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingBox();

    return geometry;
  }

  function generatePointcloud(color: any, width: number, length: number) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true });
    return new THREE.Points(geometry, material);
  }

  function generateIndexedPointcloud(color: any, width: number, length: number) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const numPoints = width * length;
    const indices = new Uint16Array(numPoints);

    let k = 0;
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        indices[k] = k;
        k++;
      }
    }

    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true });
    return new THREE.Points(geometry, material);
  }

  function generateIndexedWithOffsetPointcloud(color: any, width: number, length: number) {
    const geometry = generatePointCloudGeometry(color, width, length);
    const numPoints = width * length;
    const indices = new Uint16Array(numPoints);

    let k = 0;
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        indices[k] = k;
        k++;
      }
    }

    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.addGroup(0, indices.length);

    const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true });
    return new THREE.Points(geometry, material);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.set(10, 10, 10);
  camera.lookAt(scene.position);
  camera.updateMatrix();

  // Create three point clouds
  const pcBuffer = generatePointcloud(new THREE.Color(1, 0, 0), pointWidth, pointLength);
  pcBuffer.scale.set(5, 10, 10);
  pcBuffer.position.set(-5, 0, 0);
  scene.add(pcBuffer);

  const pcIndexed = generateIndexedPointcloud(new THREE.Color(0, 1, 0), pointWidth, pointLength);
  pcIndexed.scale.set(5, 10, 10);
  pcIndexed.position.set(0, 0, 0);
  scene.add(pcIndexed);

  const pcIndexedOffset = generateIndexedWithOffsetPointcloud(
    new THREE.Color(0, 1, 1),
    pointWidth,
    pointLength
  );
  pcIndexedOffset.scale.set(5, 10, 10);
  pcIndexedOffset.position.set(5, 0, 0);
  scene.add(pcIndexedOffset);

  const pointclouds = [pcBuffer, pcIndexed, pcIndexedOffset];

  // Create sphere markers
  const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const spheres: any[] = [];

  for (let i = 0; i < 40; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    spheres.push(sphere);
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
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = threshold;

  // Simulated pointer position (moves in a circular pattern)
  const pointer = new THREE.Vector2();

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let spheresIndex = 0;
  let toggle = 0;
  const rotateY = new THREE.Matrix4().makeRotationY(0.005);

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = 0.016; // ~60fps

      // Rotate camera
      camera.applyMatrix4(rotateY);
      camera.updateMatrixWorld();

      // Simulate pointer movement (sine wave pattern)
      const t = currentTime / 1000;
      pointer.x = Math.sin(t * 0.5) * 0.5;
      pointer.y = Math.cos(t * 0.7) * 0.5;

      // Perform raycasting
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(pointclouds, false);
      const intersection = intersections.length > 0 ? intersections[0] : null;

      // Place spheres at intersection points
      if (toggle > 0.02 && intersection !== null) {
        spheres[spheresIndex].position.copy(intersection.point);
        spheres[spheresIndex].scale.set(1, 1, 1);
        spheresIndex = (spheresIndex + 1) % spheres.length;
        toggle = 0;
      }

      // Animate spheres (shrink over time)
      for (let i = 0; i < spheres.length; i++) {
        const sphere = spheres[i];
        sphere.scale.multiplyScalar(0.98);
        sphere.scale.clampScalar(0.01, 1);
      }

      toggle += deltaTime;

      renderer.render(scene, camera);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise(resolve => setTimeout(resolve, 16));
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
    { title: 'three.js webgl - interactive - raycasting - points' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - interactive - raycasting - points',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveRaycastingPoints(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
