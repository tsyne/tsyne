/**
 * three.js webgl - gpgpu birds (procedural meshes)
 *
 * Port of: three/examples/webgl_gpgpu_birds_gltf.html
 *
 * Tests:
 * - GPGPU-style bird simulation with detailed procedural birds
 * - Animated wing flapping
 * - Flocking behavior with detailed bird meshes
 *
 * Adaptations for Tsyne:
 * - Fully procedural bird meshes (no GLTF loading)
 * - CPU-based flocking simulation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGPGPUBirdsGLTFParams {
  width?: number;
  height?: number;
  birdCount?: number;
}

export interface WebGLGPGPUBirdsGLTFDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGPGPUBirdsGLTF(
  a: App,
  win: ITsyneWindow,
  params: WebGLGPGPUBirdsGLTFParams = {}
): Promise<WebGLGPGPUBirdsGLTFDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const birdCount = params.birdCount ?? 50;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 200, 2000);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(1, 1, 0.5);
  scene.add(dirLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create detailed procedural bird
  // ─────────────────────────────────────────────────────────────────────────

  function createBird(): THREE.Group {
    const bird = new THREE.Group();

    // Body - elongated sphere
    const bodyGeom = new THREE.CylinderGeometry(2, 1.5, 8, 8);
    bodyGeom.rotateZ(Math.PI / 2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    bird.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(1.8, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(-4.5, 0.5, 0);
    bird.add(head);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.5, 2, 4);
    beakGeom.rotateZ(Math.PI / 2);
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(-7, 0.3, 0);
    bird.add(beak);

    // Left wing (will be animated)
    const wingGeom = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0, 0, 0,
      -3, 0, 8,
      2, 0, 8,
      0, 0, 0,
      2, 0, 8,
      3, 0, 3,
    ]);
    wingGeom.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeom.computeVertexNormals();
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x555555, side: THREE.DoubleSide });

    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.name = 'leftWing';
    bird.add(leftWing);

    // Right wing
    const rightWingGeom = wingGeom.clone();
    const rightWingVerts = new Float32Array([
      0, 0, 0,
      -3, 0, -8,
      2, 0, -8,
      0, 0, 0,
      2, 0, -8,
      3, 0, -3,
    ]);
    rightWingGeom.setAttribute('position', new THREE.BufferAttribute(rightWingVerts, 3));
    rightWingGeom.computeVertexNormals();

    const rightWing = new THREE.Mesh(rightWingGeom, wingMat);
    rightWing.name = 'rightWing';
    bird.add(rightWing);

    // Tail
    const tailGeom = new THREE.BufferGeometry();
    const tailVerts = new Float32Array([
      3, 0, 0,
      6, 0.5, 2,
      6, 0.5, -2,
      3, 0, 0,
      7, 0, 0,
      6, 0.5, 2,
      3, 0, 0,
      7, 0, 0,
      6, 0.5, -2,
    ]);
    tailGeom.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    tailGeom.computeVertexNormals();
    const tailMat = new THREE.MeshLambertMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const tail = new THREE.Mesh(tailGeom, tailMat);
    bird.add(tail);

    return bird;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize birds
  // ─────────────────────────────────────────────────────────────────────────

  interface BirdData {
    mesh: THREE.Group;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    phase: number;
  }

  const birds: BirdData[] = [];
  const bounds = 600;

  for (let i = 0; i < birdCount; i++) {
    const bird = createBird();
    bird.scale.setScalar(2 + Math.random());

    const birdData: BirdData = {
      mesh: bird,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * bounds,
        (Math.random() - 0.5) * bounds,
        (Math.random() - 0.5) * bounds
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ),
      phase: Math.random() * Math.PI * 2,
    };

    birds.push(birdData);
    scene.add(bird);
  }

  // Boid parameters
  const separationDist = 50;
  const alignmentDist = 80;
  const cohesionDist = 100;
  const maxSpeed = 5;

  function updateBirds(time: number, deltaTime: number) {
    const dt = Math.min(deltaTime, 0.1);

    for (let i = 0; i < birds.length; i++) {
      const bird = birds[i];

      // Flocking forces
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let sepCount = 0, alignCount = 0, cohCount = 0;

      for (let j = 0; j < birds.length; j++) {
        if (i === j) continue;
        const other = birds[j];
        const dist = bird.position.distanceTo(other.position);

        if (dist < separationDist) {
          separation.add(bird.position.clone().sub(other.position).normalize().divideScalar(dist));
          sepCount++;
        }
        if (dist < alignmentDist) {
          alignment.add(other.velocity);
          alignCount++;
        }
        if (dist < cohesionDist) {
          cohesion.add(other.position);
          cohCount++;
        }
      }

      // Apply forces
      if (sepCount > 0) {
        separation.divideScalar(sepCount).normalize().multiplyScalar(0.08);
        bird.velocity.add(separation);
      }
      if (alignCount > 0) {
        alignment.divideScalar(alignCount).normalize().multiplyScalar(0.04);
        bird.velocity.add(alignment);
      }
      if (cohCount > 0) {
        cohesion.divideScalar(cohCount).sub(bird.position).normalize().multiplyScalar(0.02);
        bird.velocity.add(cohesion);
      }

      // Boundary avoidance
      const boundaryForce = 0.15;
      if (bird.position.x < -bounds) bird.velocity.x += boundaryForce;
      if (bird.position.x > bounds) bird.velocity.x -= boundaryForce;
      if (bird.position.y < -bounds) bird.velocity.y += boundaryForce;
      if (bird.position.y > bounds) bird.velocity.y -= boundaryForce;
      if (bird.position.z < -bounds) bird.velocity.z += boundaryForce;
      if (bird.position.z > bounds) bird.velocity.z -= boundaryForce;

      // Limit speed
      const speed = bird.velocity.length();
      if (speed > maxSpeed) bird.velocity.multiplyScalar(maxSpeed / speed);

      // Update position
      bird.position.add(bird.velocity.clone().multiplyScalar(dt * 60));
      bird.mesh.position.copy(bird.position);

      // Orient bird to velocity
      if (speed > 0.5) {
        const dir = bird.velocity.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const matrix = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, up);
        bird.mesh.quaternion.setFromRotationMatrix(matrix);
      }

      // Animate wings
      const wingFlap = Math.sin(time * 15 + bird.phase) * 0.6;
      const leftWing = bird.mesh.getObjectByName('leftWing') as THREE.Mesh;
      const rightWing = bird.mesh.getObjectByName('rightWing') as THREE.Mesh;
      if (leftWing) leftWing.rotation.x = wingFlap;
      if (rightWing) rightWing.rotation.x = -wingFlap;
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
  let lastTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Update birds
      updateBirds(time, deltaTime);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 600;
      camera.position.z = Math.cos(time * 0.1) * 600;
      camera.position.y = Math.sin(time * 0.05) * 200 + 200;
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
    { title: 'three.js webgl - gpgpu birds (procedural)' },
    (a) => {
      a.window(
        { title: 'three.js webgl - gpgpu birds (procedural)', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGPGPUBirdsGLTF(a, win, { width: WIDTH, height: HEIGHT });
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
