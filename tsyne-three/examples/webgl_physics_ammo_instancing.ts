/**
 * three.js webgl - physics ammo instancing
 *
 * Port of: three/examples/webgl_physics_ammo_instancing.html
 *
 * Tests:
 * - Instanced mesh with physics
 * - Many falling objects
 * - Simple collision simulation
 * - Performance with physics + instancing
 *
 * Adaptations for Tsyne:
 * - Simple Verlet physics instead of Ammo.js
 * - Ground plane collision
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoInstancingParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLPhysicsAmmoInstancingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoInstancing(
  a: App,
  win: Window,
  params: WebGLPhysicsAmmoInstancingParams = {}
): Promise<WebGLPhysicsAmmoInstancingDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 500;

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 30, 50);
  camera.lookAt(0, 10, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);
  scene.fog = new THREE.Fog(0x222233, 50, 200);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 30, 10);
  scene.add(directionalLight);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x333344 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Physics bodies for instanced mesh
  // ─────────────────────────────────────────────────────────────────────────

  interface PhysicsBody {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    angularVelocity: THREE.Vector3;
    radius: number;
    grounded: boolean;
  }

  const bodies: PhysicsBody[] = [];
  const gravity = -0.02;
  const bounciness = 0.4;
  const groundFriction = 0.95;

  // Create instanced mesh
  const geometry = new THREE.SphereGeometry(0.5, 16, 8);
  const material = new THREE.MeshPhongMaterial({ color: 0x4488ff });
  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Initialize physics bodies
  for (let i = 0; i < instanceCount; i++) {
    const body: PhysicsBody = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        20 + Math.random() * 50, // Start high up
        (Math.random() - 0.5) * 40
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        0,
        (Math.random() - 0.5) * 0.2
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      radius: 0.5,
      grounded: false,
    };
    bodies.push(body);

    // Set initial color (varied by height)
    color.setHSL(Math.random(), 0.7, 0.5);
    mesh.setColorAt(i, color);
  }
  mesh.instanceColor!.needsUpdate = true;

  // Update instanced mesh from physics bodies
  function updateMesh() {
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      dummy.position.copy(body.position);
      dummy.rotation.copy(body.rotation);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Physics simulation
  function simulatePhysics() {
    for (const body of bodies) {
      if (!body.grounded) {
        // Apply gravity
        body.velocity.y += gravity;

        // Update position
        body.position.add(body.velocity);

        // Update rotation
        body.rotation.x += body.angularVelocity.x;
        body.rotation.y += body.angularVelocity.y;
        body.rotation.z += body.angularVelocity.z;

        // Ground collision
        if (body.position.y < body.radius) {
          body.position.y = body.radius;
          body.velocity.y = -body.velocity.y * bounciness;
          body.velocity.x *= groundFriction;
          body.velocity.z *= groundFriction;
          body.angularVelocity.multiplyScalar(0.9);

          // Stop if moving slowly
          if (Math.abs(body.velocity.y) < 0.01) {
            body.grounded = true;
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
          }
        }

        // Wall boundaries
        const wallBound = 90;
        if (Math.abs(body.position.x) > wallBound) {
          body.position.x = Math.sign(body.position.x) * wallBound;
          body.velocity.x *= -bounciness;
        }
        if (Math.abs(body.position.z) > wallBound) {
          body.position.z = Math.sign(body.position.z) * wallBound;
          body.velocity.z *= -bounciness;
        }
      }
    }

    updateMesh();
  }

  // Create walls
  const wallMaterial = new THREE.MeshPhongMaterial({
    color: 0x444455,
    transparent: true,
    opacity: 0.5,
  });

  const wallGeometry = new THREE.BoxGeometry(200, 40, 2);

  const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
  wall1.position.set(0, 20, -100);
  scene.add(wall1);

  const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
  wall2.position.set(0, 20, 100);
  scene.add(wall2);

  const wall3 = new THREE.Mesh(wallGeometry.clone().rotateY(Math.PI / 2), wallMaterial);
  wall3.position.set(-100, 20, 0);
  scene.add(wall3);

  const wall4 = new THREE.Mesh(wallGeometry.clone().rotateY(Math.PI / 2), wallMaterial);
  wall4.position.set(100, 20, 0);
  scene.add(wall4);

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

      // Run physics simulation
      simulatePhysics();

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 60;
      camera.position.z = Math.cos(time * 0.15) * 60;
      camera.position.y = 30 + Math.sin(time * 0.1) * 10;
      camera.lookAt(0, 10, 0);

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
    { title: 'three.js webgl - physics ammo instancing' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo instancing', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoInstancing(a, win, { width: WIDTH, height: HEIGHT });
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
