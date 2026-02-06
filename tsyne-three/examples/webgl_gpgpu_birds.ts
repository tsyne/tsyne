/**
 * three.js webgl - gpgpu - birds
 *
 * Port of: three/examples/webgl_gpgpu_birds.html
 *
 * Tests:
 * - GPGPU simulation with render targets
 * - Flocking behavior (boids algorithm)
 * - Procedural bird geometry
 * - Shader-based physics simulation
 *
 * Adaptations for Tsyne:
 * - Simplified CPU-based boids for compatibility
 * - Procedural bird meshes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGPGPUBirdsParams {
  width?: number;
  height?: number;
  birdCount?: number;
}

export interface WebGLGPGPUBirdsDemo {
  stop: () => void;
  getTime: () => number;
}

// Boid data structure
interface Boid {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGPGPUBirds(
  a: App,
  win: ITsyneWindow,
  params: WebGLGPGPUBirdsParams = {}
): Promise<WebGLGPGPUBirdsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const birdCount = params.birdCount ?? 100;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
  camera.position.z = 350;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue
  scene.fog = new THREE.Fog(0x87ceeb, 100, 1000);

  // ─────────────────────────────────────────────────────────────────────────
  // Create bird geometry
  // ─────────────────────────────────────────────────────────────────────────

  function createBirdGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Simple bird shape - triangular body with wings
    const vertices = new Float32Array([
      // Body (pointed cone)
      0, 0, -4,  // nose
      -1, 0, 2,  // left back
      1, 0, 2,   // right back

      // Left wing
      0, 0, 0,   // body center
      -4, 0.5, 1, // wing tip
      -1, 0, 2,  // wing root

      // Right wing
      0, 0, 0,   // body center
      4, 0.5, 1, // wing tip
      1, 0, 2,   // wing root

      // Tail
      0, 0, 2,   // base
      -0.5, 0.5, 3.5, // left
      0.5, 0.5, 3.5,  // right
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize boids
  // ─────────────────────────────────────────────────────────────────────────

  const boids: Boid[] = [];
  const birds: THREE.Mesh[] = [];
  const birdGeometry = createBirdGeometry();

  const bounds = 400;
  const maxSpeed = 4;

  for (let i = 0; i < birdCount; i++) {
    // Initialize boid
    const boid: Boid = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * bounds,
        (Math.random() - 0.5) * bounds,
        (Math.random() - 0.5) * bounds
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      phase: Math.random() * Math.PI * 2,
    };
    boids.push(boid);

    // Create mesh
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.8, 0.5),
      side: THREE.DoubleSide,
    });
    const bird = new THREE.Mesh(birdGeometry, material);
    bird.scale.setScalar(2 + Math.random());
    scene.add(bird);
    birds.push(bird);
  }

  // Boids parameters
  const separationDistance = 30;
  const alignmentDistance = 50;
  const cohesionDistance = 80;
  const separationForce = 0.05;
  const alignmentForce = 0.02;
  const cohesionForce = 0.01;

  function updateBoids(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.1);

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];

      // Separation, Alignment, Cohesion
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();

      let separationCount = 0;
      let alignmentCount = 0;
      let cohesionCount = 0;

      for (let j = 0; j < boids.length; j++) {
        if (i === j) continue;

        const other = boids[j];
        const distance = boid.position.distanceTo(other.position);

        // Separation
        if (distance < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize().divideScalar(distance);
          separation.add(diff);
          separationCount++;
        }

        // Alignment
        if (distance < alignmentDistance) {
          alignment.add(other.velocity);
          alignmentCount++;
        }

        // Cohesion
        if (distance < cohesionDistance) {
          cohesion.add(other.position);
          cohesionCount++;
        }
      }

      // Apply forces
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
        separation.normalize().multiplyScalar(separationForce);
        boid.velocity.add(separation);
      }

      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.normalize().multiplyScalar(alignmentForce);
        boid.velocity.add(alignment);
      }

      if (cohesionCount > 0) {
        cohesion.divideScalar(cohesionCount);
        cohesion.sub(boid.position);
        cohesion.normalize().multiplyScalar(cohesionForce);
        boid.velocity.add(cohesion);
      }

      // Boundary avoidance
      const boundaryForce = 0.1;
      if (boid.position.x < -bounds) boid.velocity.x += boundaryForce;
      if (boid.position.x > bounds) boid.velocity.x -= boundaryForce;
      if (boid.position.y < -bounds) boid.velocity.y += boundaryForce;
      if (boid.position.y > bounds) boid.velocity.y -= boundaryForce;
      if (boid.position.z < -bounds) boid.velocity.z += boundaryForce;
      if (boid.position.z > bounds) boid.velocity.z -= boundaryForce;

      // Limit speed
      const speed = boid.velocity.length();
      if (speed > maxSpeed) {
        boid.velocity.multiplyScalar(maxSpeed / speed);
      }

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(dt * 60));

      // Update bird mesh
      const bird = birds[i];
      bird.position.copy(boid.position);

      // Rotate bird to face velocity direction
      if (speed > 0.1) {
        const direction = boid.velocity.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();

        matrix.lookAt(new THREE.Vector3(), direction, up);
        quaternion.setFromRotationMatrix(matrix);
        bird.quaternion.copy(quaternion);
      }
    }
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let lastTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Update boids simulation
      updateBoids(deltaTime);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 400;
      camera.position.z = Math.cos(time * 0.1) * 400;
      camera.position.y = Math.sin(time * 0.05) * 100 + 100;
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
    { title: 'three.js webgl - gpgpu - birds' },
    (a) => {
      a.window(
        { title: 'three.js webgl - gpgpu - birds', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGPGPUBirds(a, win, { width: WIDTH, height: HEIGHT });
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
