/**
 * three.js webgl - effects - stereo
 *
 * Port of: three/examples/webgl_effects_stereo.html
 *
 * Tests:
 * - Side-by-side stereo rendering
 * - VR-style dual viewport
 * - Stereo camera separation
 *
 * Adaptations for Tsyne:
 * - Custom stereo rendering implementation
 * - Procedural geometry scene
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLEffectsStereoParams {
  width?: number;
  height?: number;
  eyeSeparation?: number;
}

export interface WebGLEffectsStereoDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLEffectsStereo(
  a: App,
  win: ITsyneWindow,
  params: WebGLEffectsStereoParams = {}
): Promise<WebGLEffectsStereoDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const eyeSeparation = params.eyeSeparation ?? 0.6;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  // Use half width aspect ratio for each eye
  const camera = new THREE.PerspectiveCamera(60, (width / 2) / height, 0.1, 1000);
  camera.position.z = 50;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101020);

  // Create stereo cameras
  const cameraLeft = camera.clone();
  const cameraRight = camera.clone();

  // Lights
  const light1 = new THREE.PointLight(0xffffff, 2, 200);
  light1.position.set(50, 50, 50);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x8888ff, 1.5, 200);
  light2.position.set(-50, -50, 50);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0x333344);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create scene content at various depths
  // ─────────────────────────────────────────────────────────────────────────

  const objects: THREE.Object3D[] = [];

  // Create a tunnel of rings
  const ringGeometry = new THREE.TorusGeometry(20, 2, 16, 32);

  for (let i = 0; i < 20; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / 20, 0.8, 0.5),
      shininess: 80,
    });
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.position.z = -i * 30;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    objects.push(ring);
  }

  // Add floating cubes
  const cubeGeometry = new THREE.BoxGeometry(5, 5, 5);

  for (let i = 0; i < 30; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      shininess: 60,
    });
    const cube = new THREE.Mesh(cubeGeometry, material);

    cube.position.x = (Math.random() - 0.5) * 80;
    cube.position.y = (Math.random() - 0.5) * 80;
    cube.position.z = -Math.random() * 400;

    cube.rotation.x = Math.random() * Math.PI;
    cube.rotation.y = Math.random() * Math.PI;

    scene.add(cube);
    objects.push(cube);
  }

  // Central object - dodecahedron
  const dodecaGeometry = new THREE.DodecahedronGeometry(8, 0);
  const dodecaMaterial = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    emissive: 0x331100,
    shininess: 100,
  });
  const dodecahedron = new THREE.Mesh(dodecaGeometry, dodecaMaterial);
  dodecahedron.position.z = -100;
  scene.add(dodecahedron);
  objects.push(dodecahedron);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const halfWidth = Math.floor(width / 2);

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate rings
      for (let i = 0; i < 20; i++) {
        const ring = objects[i] as THREE.Mesh;
        ring.rotation.z = time * 0.5 + i * 0.2;
      }

      // Animate cubes
      for (let i = 20; i < 50; i++) {
        const cube = objects[i] as THREE.Mesh;
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.02;
        cube.position.z += 0.5;
        if (cube.position.z > 50) {
          cube.position.z = -400;
        }
      }

      // Animate dodecahedron
      dodecahedron.rotation.x = time * 0.3;
      dodecahedron.rotation.y = time * 0.5;

      // Camera movement (forward through tunnel)
      const cameraZ = 50 - (time * 10) % 600;
      camera.position.z = cameraZ;
      camera.position.x = Math.sin(time * 0.5) * 10;
      camera.position.y = Math.cos(time * 0.3) * 10;
      camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 100);

      // Update stereo cameras
      const halfSeparation = eyeSeparation / 2;

      // Get camera's right vector
      const rightVec = new THREE.Vector3();
      camera.getWorldDirection(rightVec);
      rightVec.cross(camera.up).normalize();

      // Left camera
      cameraLeft.position.copy(camera.position);
      cameraLeft.position.add(rightVec.clone().multiplyScalar(-halfSeparation));
      cameraLeft.quaternion.copy(camera.quaternion);

      // Right camera
      cameraRight.position.copy(camera.position);
      cameraRight.position.add(rightVec.clone().multiplyScalar(halfSeparation));
      cameraRight.quaternion.copy(camera.quaternion);

      renderer.clear();

      // Render left eye (left half of screen)
      renderer.setViewport(0, 0, halfWidth, height);
      renderer.setScissor(0, 0, halfWidth, height);
      renderer.setScissorTest(true);
      renderer.render(scene, cameraLeft);

      // Render right eye (right half of screen)
      renderer.setViewport(halfWidth, 0, halfWidth, height);
      renderer.setScissor(halfWidth, 0, halfWidth, height);
      renderer.render(scene, cameraRight);

      renderer.setScissorTest(false);

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
    { title: 'three.js webgl - effects - stereo' },
    (a) => {
      a.window(
        { title: 'three.js webgl - effects - stereo', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLEffectsStereo(a, win, { width: WIDTH, height: HEIGHT });
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
