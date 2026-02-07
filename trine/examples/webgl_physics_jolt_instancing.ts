/**
 * three.js webgl - physics jolt instancing
 *
 * Port of: three/examples/webgl_physics_jolt_instancing.html
 *
 * Tests:
 * - Physics simulation with instanced rendering
 * - Many rigid bodies with collisions
 * - Stacking and interactions
 * - Performance under load
 *
 * Adaptations for Tsyne:
 * - Simple rigid body simulation (no Jolt physics)
 * - Basic collision detection between spheres
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsJoltInstancingParams {
  width?: number;
  height?: number;
  bodyCount?: number;
}

export interface WebGLPhysicsJoltInstancingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsJoltInstancing(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsJoltInstancingParams = {}
): Promise<WebGLPhysicsJoltInstancingDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const bodyCount = params.bodyCount ?? 300;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 30, 50);
  camera.lookAt(0, 10, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222244);
  scene.fog = new THREE.Fog(0x222244, 50, 200);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 30, 10);
  scene.add(directionalLight);

  // Ground plane with walls
  const groundGeometry = new THREE.PlaneGeometry(60, 60);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x333355 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Walls
  const wallMaterial = new THREE.MeshPhongMaterial({
    color: 0x444466,
    transparent: true,
    opacity: 0.3,
  });
  const wallGeometry = new THREE.BoxGeometry(60, 20, 1);

  const walls = [
    { pos: [0, 10, -30], rot: [0, 0, 0] },
    { pos: [0, 10, 30], rot: [0, 0, 0] },
    { pos: [-30, 10, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [30, 10, 0], rot: [0, Math.PI / 2, 0] },
  ];

  for (const w of walls) {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
    wall.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
    scene.add(wall);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Physics bodies
  // ─────────────────────────────────────────────────────────────────────────

  interface RigidBody {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    radius: number;
    mass: number;
  }

  const bodies: RigidBody[] = [];
  const gravity = -0.02;
  const bounciness = 0.6;
  const friction = 0.99;
  const wallBounds = 28;

  // Create instanced mesh
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 8);
  const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const instancedMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, bodyCount);
  scene.add(instancedMesh);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Initialize bodies
  for (let i = 0; i < bodyCount; i++) {
    const radius = 0.5 + Math.random() * 0.5;
    const body: RigidBody = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        5 + Math.random() * 40,
        (Math.random() - 0.5) * 40
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      ),
      radius,
      mass: radius * radius * radius,
    };
    bodies.push(body);

    // Set color based on size
    color.setHSL(radius / 1.5, 0.7, 0.5);
    instancedMesh.setColorAt(i, color);
  }
  instancedMesh.instanceColor!.needsUpdate = true;

  // Simple sphere-sphere collision
  function resolveCollision(b1: RigidBody, b2: RigidBody) {
    const diff = new THREE.Vector3().subVectors(b2.position, b1.position);
    const dist = diff.length();
    const minDist = b1.radius + b2.radius;

    if (dist < minDist && dist > 0) {
      // Separate bodies
      const overlap = minDist - dist;
      const normal = diff.normalize();
      const totalMass = b1.mass + b2.mass;

      b1.position.sub(normal.clone().multiplyScalar(overlap * (b2.mass / totalMass)));
      b2.position.add(normal.clone().multiplyScalar(overlap * (b1.mass / totalMass)));

      // Calculate relative velocity
      const relVel = new THREE.Vector3().subVectors(b1.velocity, b2.velocity);
      const velAlongNormal = relVel.dot(normal);

      // Don't resolve if moving apart
      if (velAlongNormal > 0) return;

      // Calculate impulse
      const restitution = bounciness;
      const impulse = -(1 + restitution) * velAlongNormal / (1 / b1.mass + 1 / b2.mass);

      // Apply impulse
      const impulseVec = normal.clone().multiplyScalar(impulse);
      b1.velocity.add(impulseVec.clone().multiplyScalar(1 / b1.mass));
      b2.velocity.sub(impulseVec.clone().multiplyScalar(1 / b2.mass));
    }
  }

  function updatePhysics() {
    // Apply gravity and update positions
    for (const body of bodies) {
      body.velocity.y += gravity;
      body.velocity.multiplyScalar(friction);
      body.position.add(body.velocity);

      // Ground collision
      if (body.position.y < body.radius) {
        body.position.y = body.radius;
        body.velocity.y = -body.velocity.y * bounciness;
      }

      // Wall collisions
      if (body.position.x < -wallBounds + body.radius) {
        body.position.x = -wallBounds + body.radius;
        body.velocity.x = -body.velocity.x * bounciness;
      }
      if (body.position.x > wallBounds - body.radius) {
        body.position.x = wallBounds - body.radius;
        body.velocity.x = -body.velocity.x * bounciness;
      }
      if (body.position.z < -wallBounds + body.radius) {
        body.position.z = -wallBounds + body.radius;
        body.velocity.z = -body.velocity.z * bounciness;
      }
      if (body.position.z > wallBounds - body.radius) {
        body.position.z = wallBounds - body.radius;
        body.velocity.z = -body.velocity.z * bounciness;
      }
    }

    // Simple collision detection (O(n^2) - just for demo)
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        resolveCollision(bodies[i], bodies[j]);
      }
    }

    // Update instance matrices
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      dummy.position.copy(body.position);
      dummy.scale.setScalar(body.radius);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
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

      // Update physics
      updatePhysics();

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 60;
      camera.position.z = Math.cos(time * 0.1) * 60;
      camera.position.y = 30 + Math.sin(time * 0.05) * 10;
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
    { title: 'three.js webgl - physics jolt instancing' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics jolt instancing', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsJoltInstancing(a, win, { width: WIDTH, height: HEIGHT });
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
