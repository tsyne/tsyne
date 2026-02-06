/**
 * three.js webgl - physics ammo cloth
 *
 * Port of: three/examples/webgl_physics_ammo_cloth.html
 *
 * Tests:
 * - Cloth simulation using mass-spring model
 * - Dynamic mesh deformation
 * - Wind forces
 * - Pinned vertices
 *
 * Adaptations for Tsyne:
 * - Simple Verlet integration cloth simulation
 * - No Ammo.js physics engine
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoClothParams {
  width?: number;
  height?: number;
}

export interface WebGLPhysicsAmmoClothDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoCloth(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsAmmoClothParams = {}
): Promise<WebGLPhysicsAmmoClothDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 10, 25);
  camera.lookAt(0, 5, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 }); // Forest green
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Cloth simulation
  // ─────────────────────────────────────────────────────────────────────────

  const clothWidth = 10;
  const clothHeight = 10;
  const segmentsX = 25;
  const segmentsY = 25;

  // Cloth particle system
  interface ClothParticle {
    position: THREE.Vector3;
    previousPosition: THREE.Vector3;
    pinned: boolean;
    mass: number;
  }

  const particles: ClothParticle[][] = [];
  const restDistanceX = clothWidth / segmentsX;
  const restDistanceY = clothHeight / segmentsY;

  // Initialize particles
  for (let y = 0; y <= segmentsY; y++) {
    const row: ClothParticle[] = [];
    for (let x = 0; x <= segmentsX; x++) {
      const position = new THREE.Vector3(
        (x - segmentsX / 2) * restDistanceX,
        15 - y * restDistanceY,
        0
      );
      row.push({
        position: position.clone(),
        previousPosition: position.clone(),
        pinned: y === 0, // Pin top row
        mass: 1,
      });
    }
    particles.push(row);
  }

  // Create cloth geometry
  const clothGeometry = new THREE.PlaneGeometry(clothWidth, clothHeight, segmentsX, segmentsY);
  const clothMaterial = new THREE.MeshPhongMaterial({
    color: 0xaa2222,
    side: THREE.DoubleSide,
  });
  const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
  scene.add(clothMesh);

  // Constraint satisfaction
  function satisfyConstraint(p1: ClothParticle, p2: ClothParticle, restDistance: number) {
    const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
    const currentDistance = diff.length();
    const correction = diff.multiplyScalar((currentDistance - restDistance) / currentDistance);

    if (!p1.pinned && !p2.pinned) {
      p1.position.add(correction.clone().multiplyScalar(0.5));
      p2.position.sub(correction.clone().multiplyScalar(0.5));
    } else if (!p1.pinned) {
      p1.position.add(correction);
    } else if (!p2.pinned) {
      p2.position.sub(correction);
    }
  }

  // Physics constants
  const gravity = new THREE.Vector3(0, -0.01, 0);
  const damping = 0.99;
  const windStrength = 0.003;

  function simulateCloth(time: number) {
    // Wind force
    const wind = new THREE.Vector3(
      Math.sin(time * 0.5) * windStrength,
      0,
      Math.cos(time * 0.3) * windStrength * 0.5
    );

    // Verlet integration
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        const particle = particles[y][x];
        if (!particle.pinned) {
          const velocity = particle.position.clone().sub(particle.previousPosition).multiplyScalar(damping);
          particle.previousPosition.copy(particle.position);
          particle.position.add(velocity);
          particle.position.add(gravity);
          particle.position.add(wind);
        }
      }
    }

    // Constraint satisfaction (multiple iterations for stability)
    for (let iteration = 0; iteration < 15; iteration++) {
      // Horizontal constraints
      for (let y = 0; y <= segmentsY; y++) {
        for (let x = 0; x < segmentsX; x++) {
          satisfyConstraint(particles[y][x], particles[y][x + 1], restDistanceX);
        }
      }

      // Vertical constraints
      for (let y = 0; y < segmentsY; y++) {
        for (let x = 0; x <= segmentsX; x++) {
          satisfyConstraint(particles[y][x], particles[y + 1][x], restDistanceY);
        }
      }
    }

    // Update mesh geometry
    const positions = clothGeometry.getAttribute('position');
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        const index = y * (segmentsX + 1) + x;
        const particle = particles[y][x];
        positions.setXYZ(index, particle.position.x, particle.position.y, particle.position.z);
      }
    }
    positions.needsUpdate = true;
    clothGeometry.computeVertexNormals();
  }

  // Add a pole
  const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 16);
  const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });

  const poleLeft = new THREE.Mesh(poleGeometry, poleMaterial);
  poleLeft.position.set(-clothWidth / 2, 8, 0);
  scene.add(poleLeft);

  const poleRight = new THREE.Mesh(poleGeometry, poleMaterial);
  poleRight.position.set(clothWidth / 2, 8, 0);
  scene.add(poleRight);

  // Cross bar
  const crossBarGeometry = new THREE.CylinderGeometry(0.15, 0.15, clothWidth + 1);
  const crossBar = new THREE.Mesh(crossBarGeometry, poleMaterial);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.position.set(0, 15, 0);
  scene.add(crossBar);

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

      // Simulate cloth physics
      simulateCloth(time);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 25;
      camera.position.z = Math.cos(time * 0.15) * 25;
      camera.lookAt(0, 8, 0);

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
    { title: 'three.js webgl - physics ammo cloth' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo cloth', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoCloth(a, win, { width: WIDTH, height: HEIGHT });
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
