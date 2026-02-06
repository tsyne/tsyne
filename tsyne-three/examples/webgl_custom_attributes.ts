/**
 * three.js webgl - custom attributes
 *
 * Tests:
 * - Custom buffer attributes
 * - Per-vertex custom data
 * - Dynamic attribute updates
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCustomAttributesParams {
  width?: number;
  height?: number;
}

export interface WebGLCustomAttributesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCustomAttributes(
  a: App,
  win: ITsyneWindow,
  params: WebGLCustomAttributesParams = {}
): Promise<WebGLCustomAttributesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Create geometry with custom attributes
  const segments = 50;
  const verticesPerRow = segments + 1;
  const vertexCount = verticesPerRow * verticesPerRow;

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const sizes = new Float32Array(vertexCount);
  const displacement = new Float32Array(vertexCount);
  const customTime = new Float32Array(vertexCount);

  let idx = 0;
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const u = i / segments;
      const v = j / segments;

      // Grid positions
      positions[idx * 3] = (u - 0.5) * 300;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = (v - 0.5) * 300;

      // Colors based on position
      colors[idx * 3] = u;
      colors[idx * 3 + 1] = v;
      colors[idx * 3 + 2] = 1 - (u + v) / 2;

      // Random sizes
      sizes[idx] = 2 + Math.random() * 4;

      // Displacement values
      displacement[idx] = Math.random() * 50;

      // Time offset for animation
      customTime[idx] = Math.random() * Math.PI * 2;

      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('displacement', new THREE.BufferAttribute(displacement, 1));
  geometry.setAttribute('customTime', new THREE.BufferAttribute(customTime, 1));

  const material = new THREE.PointsMaterial({
    size: 4,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Create a second geometry - sphere with custom attributes
  const sphereRadius = 80;
  const sphereSegments = 32;
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

  // Get sphere positions and add custom wave data
  const spherePositions = sphereGeometry.getAttribute('position');
  const sphereVertexCount = spherePositions.count;

  const sphereColors = new Float32Array(sphereVertexCount * 3);
  const sphereWave = new Float32Array(sphereVertexCount);

  for (let i = 0; i < sphereVertexCount; i++) {
    const x = spherePositions.getX(i);
    const y = spherePositions.getY(i);
    const z = spherePositions.getZ(i);

    // Color based on normal direction
    const length = Math.sqrt(x * x + y * y + z * z);
    sphereColors[i * 3] = (x / length + 1) / 2;
    sphereColors[i * 3 + 1] = (y / length + 1) / 2;
    sphereColors[i * 3 + 2] = (z / length + 1) / 2;

    // Wave phase based on position
    sphereWave[i] = Math.atan2(x, z);
  }

  sphereGeometry.setAttribute('color', new THREE.BufferAttribute(sphereColors, 3));
  sphereGeometry.setAttribute('wave', new THREE.BufferAttribute(sphereWave, 1));

  const sphereMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    wireframe: true,
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 100, 0);
  scene.add(sphere);

  // Store original positions for animation
  const originalSpherePositions = new Float32Array(spherePositions.array);

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

      // Animate point cloud displacement
      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const displacementAttr = geometry.getAttribute('displacement') as THREE.BufferAttribute;
      const customTimeAttr = geometry.getAttribute('customTime') as THREE.BufferAttribute;
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const row = Math.floor(i / verticesPerRow);
        const col = i % verticesPerRow;

        // Wave displacement
        const x = positionAttr.array[i3];
        const z = positionAttr.array[i3 + 2];
        const wave = Math.sin(x * 0.02 + time * 2) * Math.cos(z * 0.02 + time * 2);
        positionAttr.array[i3 + 1] = wave * displacementAttr.array[i];

        // Animate colors
        colorAttr.array[i3] = Math.sin(time + customTimeAttr.array[i]) * 0.5 + 0.5;
        colorAttr.array[i3 + 1] = Math.cos(time * 0.7 + customTimeAttr.array[i]) * 0.5 + 0.5;
        colorAttr.array[i3 + 2] = Math.sin(time * 1.3 + customTimeAttr.array[i]) * 0.5 + 0.5;
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      // Animate sphere vertices
      const spherePosAttr = sphereGeometry.getAttribute('position') as THREE.BufferAttribute;
      const waveAttr = sphereGeometry.getAttribute('wave') as THREE.BufferAttribute;

      for (let i = 0; i < sphereVertexCount; i++) {
        const i3 = i * 3;
        const phase = waveAttr.array[i];
        const scale = 1 + Math.sin(time * 3 + phase * 4) * 0.15;

        spherePosAttr.array[i3] = originalSpherePositions[i3] * scale;
        spherePosAttr.array[i3 + 1] = originalSpherePositions[i3 + 1] * scale;
        spherePosAttr.array[i3 + 2] = originalSpherePositions[i3 + 2] * scale;
      }

      spherePosAttr.needsUpdate = true;

      // Rotate sphere
      sphere.rotation.y = time * 0.5;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.position.y = 150 + Math.sin(time * 0.15) * 100;
      camera.lookAt(0, 50, 0);

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
    { title: 'three.js webgl - custom attributes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - custom attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCustomAttributes(a, win, { width: WIDTH, height: HEIGHT });
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
