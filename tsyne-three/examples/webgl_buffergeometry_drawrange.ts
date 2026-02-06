/**
 * three.js webgl - buffergeometry - drawrange
 *
 * Port of: three/examples/webgl_buffergeometry_drawrange.html
 *
 * Tests:
 * - Dynamic buffer updates (position.needsUpdate)
 * - setDrawRange for partial rendering
 * - LineSegments with vertex colors
 * - Points with PointsMaterial
 * - Particle simulation with collision detection
 *
 * Adaptations for Tsyne:
 * - Removes Stats and GUI
 * - Removes OrbitControls
 * - Fixed particle count and settings
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLDrawRangeParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLDrawRangeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLDrawRange(
  a: App,
  win: ITsyneWindow,
  params: WebGLDrawRangeParams = {}
): Promise<WebGLDrawRangeDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const particleCount = params.particleCount ?? 200;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);
  camera.position.z = 1750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const group = new THREE.Group();
  scene.add(group);

  // Bounding box helper
  const r = 800;
  const rHalf = r / 2;
  const helper = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(r, r, r)));
  (helper.material as THREE.LineBasicMaterial).color.setHex(0x474747);
  group.add(helper);

  // Settings
  const maxParticleCount = particleCount;
  const minDistance = 150;

  // Line segments buffer (max connections)
  const segments = maxParticleCount * maxParticleCount;
  const positions = new Float32Array(segments * 3);
  const colors = new Float32Array(segments * 3);

  // Particle data
  const particlesData: { velocity: { x: number; y: number; z: number }; numConnections: number }[] = [];
  const particlePositions = new Float32Array(maxParticleCount * 3);

  for (let i = 0; i < maxParticleCount; i++) {
    const x = Math.random() * r - rHalf;
    const y = Math.random() * r - rHalf;
    const z = Math.random() * r - rHalf;

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;

    particlesData.push({
      velocity: {
        x: -1 + Math.random() * 2,
        y: -1 + Math.random() * 2,
        z: -1 + Math.random() * 2,
      },
      numConnections: 0,
    });
  }

  // Points
  const pMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 3,
    sizeAttenuation: false,
  });

  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particles.setDrawRange(0, particleCount);

  const pointCloud = new THREE.Points(particles, pMaterial);
  group.add(pointCloud);

  // Line segments
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  lineGeometry.computeBoundingSphere();
  lineGeometry.setDrawRange(0, 0);

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
  });

  const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  group.add(linesMesh);

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

      // Reset connections
      for (let i = 0; i < particleCount; i++) {
        particlesData[i].numConnections = 0;
      }

      let vertexpos = 0;
      let colorpos = 0;
      let numConnected = 0;

      // Update particle positions and find connections
      for (let i = 0; i < particleCount; i++) {
        const particleData = particlesData[i];

        // Move particle
        particlePositions[i * 3] += particleData.velocity.x;
        particlePositions[i * 3 + 1] += particleData.velocity.y;
        particlePositions[i * 3 + 2] += particleData.velocity.z;

        // Bounce off walls
        if (particlePositions[i * 3 + 1] < -rHalf || particlePositions[i * 3 + 1] > rHalf) {
          particleData.velocity.y = -particleData.velocity.y;
        }
        if (particlePositions[i * 3] < -rHalf || particlePositions[i * 3] > rHalf) {
          particleData.velocity.x = -particleData.velocity.x;
        }
        if (particlePositions[i * 3 + 2] < -rHalf || particlePositions[i * 3 + 2] > rHalf) {
          particleData.velocity.z = -particleData.velocity.z;
        }

        // Check for nearby particles and draw connections
        for (let j = i + 1; j < particleCount; j++) {
          const dx = particlePositions[i * 3] - particlePositions[j * 3];
          const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
          const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < minDistance) {
            particleData.numConnections++;
            particlesData[j].numConnections++;

            const alpha = 1.0 - dist / minDistance;

            // Line start
            positions[vertexpos++] = particlePositions[i * 3];
            positions[vertexpos++] = particlePositions[i * 3 + 1];
            positions[vertexpos++] = particlePositions[i * 3 + 2];

            // Line end
            positions[vertexpos++] = particlePositions[j * 3];
            positions[vertexpos++] = particlePositions[j * 3 + 1];
            positions[vertexpos++] = particlePositions[j * 3 + 2];

            // Colors (white with alpha based on distance)
            colors[colorpos++] = alpha;
            colors[colorpos++] = alpha;
            colors[colorpos++] = alpha;

            colors[colorpos++] = alpha;
            colors[colorpos++] = alpha;
            colors[colorpos++] = alpha;

            numConnected++;
          }
        }
      }

      // Update draw ranges
      linesMesh.geometry.setDrawRange(0, numConnected * 2);
      (linesMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (linesMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (pointCloud.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Rotate the group
      group.rotation.y = time * 0.1;

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
    { title: 'three.js webgl - buffergeometry drawrange' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry drawrange', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLDrawRange(a, win, { width: WIDTH, height: HEIGHT });
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
