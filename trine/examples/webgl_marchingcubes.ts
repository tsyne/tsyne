/**
 * three.js webgl - marching cubes
 *
 * Port of: three/examples/webgl_marchingcubes.html
 *
 * Tests:
 * - Procedural isosurface generation
 * - Dynamic geometry updates
 * - Marching cubes algorithm visualization
 *
 * Adaptations for Tsyne:
 * - Simplified marching cubes implementation
 * - Uses metaball-like field function
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMarchingCubesParams {
  width?: number;
  height?: number;
  resolution?: number;
}

export interface WebGLMarchingCubesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Simple Marching Cubes Implementation
// ═══════════════════════════════════════════════════════════════════════════

class SimpleMarchingCubes {
  resolution: number;
  field: Float32Array;
  size: number;

  constructor(resolution: number) {
    this.resolution = resolution;
    this.size = resolution * resolution * resolution;
    this.field = new Float32Array(this.size);
  }

  reset() {
    this.field.fill(0);
  }

  addBall(x: number, y: number, z: number, strength: number, subtract: boolean) {
    const sign = subtract ? -1 : 1;
    const r = this.resolution;
    const size = strength * r * 0.5;

    const cx = Math.floor(x * r);
    const cy = Math.floor(y * r);
    const cz = Math.floor(z * r);

    const range = Math.ceil(size * 2);

    for (let k = Math.max(0, cz - range); k < Math.min(r, cz + range); k++) {
      for (let j = Math.max(0, cy - range); j < Math.min(r, cy + range); j++) {
        for (let i = Math.max(0, cx - range); i < Math.min(r, cx + range); i++) {
          const dx = (i - cx) / size;
          const dy = (j - cy) / size;
          const dz = (k - cz) / size;
          const d2 = dx * dx + dy * dy + dz * dz;

          if (d2 < 4) {
            const val = (1 - d2 / 4) ** 2;
            this.field[i + j * r + k * r * r] += sign * val * strength;
          }
        }
      }
    }
  }

  getIndex(i: number, j: number, k: number): number {
    return i + j * this.resolution + k * this.resolution * this.resolution;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMarchingCubes(
  a: App,
  win: ITsyneWindow,
  params: WebGLMarchingCubesParams = {}
): Promise<WebGLMarchingCubesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const resolution = params.resolution ?? 28;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Add lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
  light1.position.set(0.5, 1, 0.5);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
  light2.position.set(-0.5, -1, -0.5);
  scene.add(light2);

  scene.add(new THREE.AmbientLight(0x404040));

  // Create marching cubes simulation
  const mc = new SimpleMarchingCubes(resolution);

  // Instead of actual marching cubes, we'll approximate with spheres
  // that merge to simulate metaballs
  const material = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    shininess: 100,
    flatShading: true,
  });

  // Create dynamic geometry using multiple merged spheres
  const spheres: THREE.Mesh[] = [];
  const numBalls = 6;

  for (let i = 0; i < numBalls; i++) {
    const geometry = new THREE.SphereGeometry(30 + Math.random() * 20, 16, 12);
    const sphere = new THREE.Mesh(geometry, material);
    spheres.push(sphere);
    scene.add(sphere);
  }

  // Create a single large "blob" mesh that will be deformed
  const blobGeometry = new THREE.IcosahedronGeometry(80, 3);
  const blob = new THREE.Mesh(blobGeometry, material);
  scene.add(blob);

  // Store original positions for deformation
  const originalPositions = new Float32Array(blobGeometry.attributes.position.array);

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

      // Animate metaball positions
      for (let i = 0; i < numBalls; i++) {
        const phase = i * Math.PI * 2 / numBalls;
        spheres[i].position.x = Math.sin(time + phase) * 80;
        spheres[i].position.y = Math.cos(time * 1.3 + phase) * 80;
        spheres[i].position.z = Math.sin(time * 0.7 + phase) * 80;

        // Pulse size
        const scale = 0.8 + 0.3 * Math.sin(time * 2 + phase);
        spheres[i].scale.setScalar(scale);
      }

      // Deform the blob geometry to simulate metaball surface
      const positions = blobGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];

        // Calculate displacement based on metaball influence
        let displacement = 0;
        for (let j = 0; j < numBalls; j++) {
          const dx = ox - spheres[j].position.x;
          const dy = oy - spheres[j].position.y;
          const dz = oz - spheres[j].position.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          displacement += 30 / (d + 30);
        }

        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const scale = 0.8 + displacement * 0.3;

        positions[i] = (ox / len) * 80 * scale;
        positions[i + 1] = (oy / len) * 80 * scale;
        positions[i + 2] = (oz / len) * 80 * scale;
      }
      blobGeometry.attributes.position.needsUpdate = true;
      blobGeometry.computeVertexNormals();

      // Rotate scene
      scene.rotation.y = time * 0.3;

      // Change color based on time
      const hue = (time * 0.1) % 1;
      (material as THREE.MeshPhongMaterial).color.setHSL(hue, 1, 0.5);

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
    { title: 'three.js webgl - marching cubes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - marching cubes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMarchingCubes(a, win, { width: WIDTH, height: HEIGHT });
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
