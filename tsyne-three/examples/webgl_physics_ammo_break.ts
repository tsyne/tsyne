/**
 * three.js webgl - physics ammo break
 *
 * Port of: three/examples/webgl_physics_ammo_break.html
 *
 * Tests:
 * - Simulated breaking/fracturing effect
 * - Multiple fragment generation
 * - Simple physics approximation
 * - Dynamic mesh creation
 *
 * Adaptations for Tsyne:
 * - No Ammo.js, uses simple physics simulation
 * - Procedural fracture generation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoBreakParams {
  width?: number;
  height?: number;
}

export interface WebGLPhysicsAmmoBreakDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoBreak(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsAmmoBreakParams = {}
): Promise<WebGLPhysicsAmmoBreakDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 15, 30);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Fragment physics simulation
  // ─────────────────────────────────────────────────────────────────────────

  interface Fragment {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    grounded: boolean;
  }

  const fragments: Fragment[] = [];
  const gravity = -0.015;

  function createRandomFragment(position: THREE.Vector3, baseVelocity: THREE.Vector3, color: number): Fragment {
    // Create random convex shape
    const size = 0.5 + Math.random() * 1;
    const geometryTypes = [
      () => new THREE.TetrahedronGeometry(size),
      () => new THREE.BoxGeometry(size, size * 0.7, size * 0.8),
      () => new THREE.OctahedronGeometry(size * 0.7),
    ];

    const geometry = geometryTypes[Math.floor(Math.random() * geometryTypes.length)]();
    const material = new THREE.MeshPhongMaterial({
      color,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(mesh);

    return {
      mesh,
      velocity: baseVelocity.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.2,
          (Math.random() - 0.5) * 0.3
        )
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      grounded: false,
    };
  }

  function breakObject(position: THREE.Vector3, color: number) {
    const fragmentCount = 8 + Math.floor(Math.random() * 8);
    const baseVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      0.2,
      (Math.random() - 0.5) * 0.1
    );

    for (let i = 0; i < fragmentCount; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      fragments.push(createRandomFragment(position.clone().add(offset), baseVelocity, color));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create breakable objects
  // ─────────────────────────────────────────────────────────────────────────

  interface BreakableObject {
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    color: number;
    broken: boolean;
    breakTime: number | null;
  }

  const breakableObjects: BreakableObject[] = [];

  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];

  // Create grid of breakable boxes
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      const geometry = new THREE.BoxGeometry(3, 3, 3);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshPhongMaterial({ color });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x * 4, 1.5, z * 4);

      scene.add(mesh);

      breakableObjects.push({
        mesh,
        position: mesh.position.clone(),
        color,
        broken: false,
        breakTime: null,
      });
    }
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
  let lastBreakTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Break objects periodically
      if (currentTime - lastBreakTime > 500) {
        // Find an unbroken object
        const unbroken = breakableObjects.filter((o) => !o.broken);
        if (unbroken.length > 0) {
          const obj = unbroken[Math.floor(Math.random() * unbroken.length)];
          obj.broken = true;
          obj.breakTime = currentTime;
          scene.remove(obj.mesh);
          breakObject(obj.position, obj.color);
          lastBreakTime = currentTime;
        }
      }

      // Update fragment physics
      for (const fragment of fragments) {
        if (!fragment.grounded) {
          // Apply gravity
          fragment.velocity.y += gravity;

          // Update position
          fragment.mesh.position.add(fragment.velocity);

          // Update rotation
          fragment.mesh.rotation.x += fragment.angularVelocity.x;
          fragment.mesh.rotation.y += fragment.angularVelocity.y;
          fragment.mesh.rotation.z += fragment.angularVelocity.z;

          // Ground collision
          if (fragment.mesh.position.y < 0.5) {
            fragment.mesh.position.y = 0.5;
            fragment.velocity.y = -fragment.velocity.y * 0.3;
            fragment.velocity.x *= 0.8;
            fragment.velocity.z *= 0.8;
            fragment.angularVelocity.multiplyScalar(0.8);

            // Stop if moving slowly
            if (Math.abs(fragment.velocity.y) < 0.01) {
              fragment.grounded = true;
              fragment.velocity.set(0, 0, 0);
              fragment.angularVelocity.set(0, 0, 0);
            }
          }
        }
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 35;
      camera.position.z = Math.cos(time * 0.2) * 35;
      camera.lookAt(0, 3, 0);

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
    { title: 'three.js webgl - physics ammo break' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo break', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoBreak(a, win, { width: WIDTH, height: HEIGHT });
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
