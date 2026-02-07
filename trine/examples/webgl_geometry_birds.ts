/**
 * three.js webgl - geometry - birds (procedural)
 *
 * Tests:
 * - Procedural bird-like shapes
 * - Flocking animation
 * - Dynamic geometry updates
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryBirdsParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryBirdsDemo {
  stop: () => void;
  getTime: () => number;
}

interface Bird {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  phase: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryBirds(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryBirdsParams = {}
): Promise<WebGLGeometryBirdsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create bird geometry
  // ─────────────────────────────────────────────────────────────────────────

  function createBirdGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Bird shape: body + two wings
    const vertices = new Float32Array([
      // Body (elongated triangle)
      0, 0, -15,    // nose
      -3, 0, 5,     // left back
      3, 0, 5,      // right back

      // Left wing
      0, 0, 0,      // wing root
      -20, 3, 0,    // wing tip up
      -15, 0, 5,    // wing back

      // Right wing
      0, 0, 0,      // wing root
      20, 3, 0,     // wing tip up
      15, 0, 5,     // wing back

      // Tail
      0, 0, 5,      // tail base
      -5, 2, 12,    // tail left
      5, 2, 12,     // tail right
    ]);

    const indices = [
      0, 1, 2,    // body
      3, 4, 5,    // left wing
      6, 7, 8,    // right wing
      9, 10, 11,  // tail
    ];

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const birds: Bird[] = [];
  const birdCount = 100;
  const bounds = 300;

  for (let i = 0; i < birdCount; i++) {
    const geometry = createBirdGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.55, 0.8, 0.5),
      wireframe: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Random position
    mesh.position.set(
      (Math.random() - 0.5) * bounds * 2,
      (Math.random() - 0.5) * bounds * 2,
      (Math.random() - 0.5) * bounds * 2
    );

    // Random velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    scene.add(mesh);
    birds.push({
      mesh,
      velocity,
      phase: Math.random() * Math.PI * 2,
    });
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

      for (const bird of birds) {
        // Simple flocking: steer towards center
        const toCenter = new THREE.Vector3()
          .copy(bird.mesh.position)
          .negate()
          .normalize()
          .multiplyScalar(0.01);

        bird.velocity.add(toCenter);

        // Add some randomness
        bird.velocity.x += (Math.random() - 0.5) * 0.1;
        bird.velocity.y += (Math.random() - 0.5) * 0.1;
        bird.velocity.z += (Math.random() - 0.5) * 0.1;

        // Limit speed
        const speed = bird.velocity.length();
        if (speed > 3) {
          bird.velocity.multiplyScalar(3 / speed);
        }

        // Update position
        bird.mesh.position.add(bird.velocity);

        // Wrap around bounds
        if (bird.mesh.position.x > bounds) bird.mesh.position.x = -bounds;
        if (bird.mesh.position.x < -bounds) bird.mesh.position.x = bounds;
        if (bird.mesh.position.y > bounds) bird.mesh.position.y = -bounds;
        if (bird.mesh.position.y < -bounds) bird.mesh.position.y = bounds;
        if (bird.mesh.position.z > bounds) bird.mesh.position.z = -bounds;
        if (bird.mesh.position.z < -bounds) bird.mesh.position.z = bounds;

        // Orient bird to face velocity direction
        if (bird.velocity.length() > 0.1) {
          const target = bird.mesh.position.clone().add(bird.velocity);
          bird.mesh.lookAt(target);
        }

        // Animate wings by modifying geometry
        const positions = bird.mesh.geometry.getAttribute('position');

        // Left wing tip (index 4)
        const wingFlap = Math.sin(time * 10 + bird.phase) * 8;
        positions.setY(4, 3 + wingFlap);

        // Right wing tip (index 7)
        positions.setY(7, 3 + wingFlap);

        positions.needsUpdate = true;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 600;
      camera.position.z = Math.cos(time * 0.1) * 600;
      camera.position.y = Math.sin(time * 0.05) * 200;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - geometry - birds' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - birds', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryBirds(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
