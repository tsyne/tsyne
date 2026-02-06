/**
 * three.js webgl - physics ammo volume
 *
 * Port of: three/examples/webgl_physics_ammo_volume.html
 *
 * Tests:
 * - Soft body physics simulation
 * - Volume preservation
 * - Deformable meshes
 * - Pressure-based physics
 *
 * Adaptations for Tsyne:
 * - Simple pressure simulation
 * - Vertex displacement for soft body effect
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoVolumeParams {
  width?: number;
  height?: number;
}

export interface WebGLPhysicsAmmoVolumeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoVolume(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsAmmoVolumeParams = {}
): Promise<WebGLPhysicsAmmoVolumeDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 15, 25);
  camera.lookAt(0, 5, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Soft body simulation
  // ─────────────────────────────────────────────────────────────────────────

  interface SoftBody {
    mesh: THREE.Mesh;
    originalPositions: Float32Array;
    velocities: Float32Array;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    radius: number;
    pressure: number;
    squish: number;
  }

  const softBodies: SoftBody[] = [];
  const gravity = -0.015;
  const bounceDecay = 0.5;
  const damping = 0.95;

  function createSoftBody(position: THREE.Vector3, radius: number, color: number): SoftBody {
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 50,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    scene.add(mesh);

    const positionAttr = geometry.getAttribute('position');
    const originalPositions = new Float32Array(positionAttr.array);
    const velocities = new Float32Array(positionAttr.count * 3);

    return {
      mesh,
      originalPositions,
      velocities,
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      radius,
      pressure: 1,
      squish: 0,
    };
  }

  // Create soft bodies
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
  for (let i = 0; i < 5; i++) {
    const pos = new THREE.Vector3(
      (i - 2) * 5,
      10 + i * 3,
      0
    );
    softBodies.push(createSoftBody(pos, 2, colors[i]));
  }

  function simulateSoftBody(body: SoftBody, time: number) {
    // Apply gravity
    body.velocity.y += gravity;
    body.velocity.multiplyScalar(damping);

    // Update position
    body.position.add(body.velocity);

    // Ground collision
    const groundY = body.radius;
    if (body.position.y < groundY) {
      body.position.y = groundY;

      // Calculate squish based on impact velocity
      const impactVelocity = Math.abs(body.velocity.y);
      body.squish = Math.min(0.5, impactVelocity * 5);

      body.velocity.y = -body.velocity.y * bounceDecay;
    } else {
      // Gradually restore shape
      body.squish *= 0.9;
    }

    // Update mesh position
    body.mesh.position.copy(body.position);

    // Deform mesh based on squish
    const positionAttr = body.mesh.geometry.getAttribute('position');

    for (let i = 0; i < positionAttr.count; i++) {
      const ox = body.originalPositions[i * 3];
      const oy = body.originalPositions[i * 3 + 1];
      const oz = body.originalPositions[i * 3 + 2];

      // Apply squish deformation
      const squishY = 1 - body.squish;
      const squishXZ = 1 + body.squish * 0.5;

      // Add some wobble based on time
      const wobble = Math.sin(time * 5 + i * 0.1) * body.squish * 0.1;

      positionAttr.setXYZ(
        i,
        ox * squishXZ + wobble,
        oy * squishY,
        oz * squishXZ + wobble
      );
    }

    positionAttr.needsUpdate = true;
    body.mesh.geometry.computeVertexNormals();
  }

  // Add some obstacles
  const boxGeometry = new THREE.BoxGeometry(4, 2, 4);
  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });

  const box1 = new THREE.Mesh(boxGeometry, boxMaterial);
  box1.position.set(-8, 1, 0);
  scene.add(box1);

  const box2 = new THREE.Mesh(boxGeometry, boxMaterial);
  box2.position.set(8, 1, 0);
  scene.add(box2);

  // Ramp
  const rampGeometry = new THREE.BoxGeometry(8, 0.5, 6);
  const ramp = new THREE.Mesh(rampGeometry, boxMaterial);
  ramp.position.set(0, 2, -8);
  ramp.rotation.x = 0.2;
  scene.add(ramp);

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

      // Simulate all soft bodies
      for (const body of softBodies) {
        simulateSoftBody(body, time);
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 25;
      camera.position.z = Math.cos(time * 0.15) * 25;
      camera.lookAt(0, 5, 0);

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
    { title: 'three.js webgl - physics ammo volume' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo volume', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoVolume(a, win, { width: WIDTH, height: HEIGHT });
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
