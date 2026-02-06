/**
 * three.js webgl - geometry - dynamic
 *
 * Tests:
 * - Dynamic geometry modification
 * - Real-time vertex position updates
 * - Wave/ripple effects on geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryDynamicParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryDynamicDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryDynamic(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryDynamicParams = {}
): Promise<WebGLGeometryDynamicDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 200, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  // Create a plane with many vertices for wave effect
  const planeGeometry = new THREE.PlaneGeometry(300, 300, 60, 60);
  planeGeometry.rotateX(-Math.PI / 2);

  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x4ecdc4,
    wireframe: true,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  scene.add(plane);

  // Store original Y positions
  const planePositions = planeGeometry.getAttribute('position');
  const planeOriginalY = new Float32Array(planePositions.count);
  for (let i = 0; i < planePositions.count; i++) {
    planeOriginalY[i] = planePositions.getY(i);
  }

  // Create a sphere with dynamic vertices
  const sphereGeometry = new THREE.SphereGeometry(50, 32, 24);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b6b,
    wireframe: true,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.y = 100;
  scene.add(sphere);

  // Store original positions for sphere
  const spherePositions = sphereGeometry.getAttribute('position');
  const sphereOriginal = new Float32Array(spherePositions.count * 3);
  for (let i = 0; i < spherePositions.count; i++) {
    sphereOriginal[i * 3] = spherePositions.getX(i);
    sphereOriginal[i * 3 + 1] = spherePositions.getY(i);
    sphereOriginal[i * 3 + 2] = spherePositions.getZ(i);
  }

  // Create a torus with dynamic vertices
  const torusGeometry = new THREE.TorusGeometry(40, 15, 24, 48);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe66d,
    wireframe: true,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(-120, 100, 0);
  scene.add(torus);

  // Store original positions for torus
  const torusPositions = torusGeometry.getAttribute('position');
  const torusOriginal = new Float32Array(torusPositions.count * 3);
  for (let i = 0; i < torusPositions.count; i++) {
    torusOriginal[i * 3] = torusPositions.getX(i);
    torusOriginal[i * 3 + 1] = torusPositions.getY(i);
    torusOriginal[i * 3 + 2] = torusPositions.getZ(i);
  }

  // Create a box with dynamic vertices
  const boxGeometry = new THREE.BoxGeometry(60, 60, 60, 10, 10, 10);
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8e6cf,
    wireframe: true,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(120, 100, 0);
  scene.add(box);

  // Store original positions for box
  const boxPositions = boxGeometry.getAttribute('position');
  const boxOriginal = new Float32Array(boxPositions.count * 3);
  for (let i = 0; i < boxPositions.count; i++) {
    boxOriginal[i * 3] = boxPositions.getX(i);
    boxOriginal[i * 3 + 1] = boxPositions.getY(i);
    boxOriginal[i * 3 + 2] = boxPositions.getZ(i);
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

      // Animate plane with ripple waves
      for (let i = 0; i < planePositions.count; i++) {
        const x = planePositions.getX(i);
        const z = planePositions.getZ(i);
        const distance = Math.sqrt(x * x + z * z);
        const y = Math.sin(distance * 0.05 - time * 3) * 15;
        planePositions.setY(i, y);
      }
      planePositions.needsUpdate = true;

      // Animate sphere with noise-like displacement
      for (let i = 0; i < spherePositions.count; i++) {
        const ox = sphereOriginal[i * 3];
        const oy = sphereOriginal[i * 3 + 1];
        const oz = sphereOriginal[i * 3 + 2];

        const noise = Math.sin(ox * 0.1 + time * 2) *
                     Math.cos(oy * 0.1 + time * 1.5) *
                     Math.sin(oz * 0.1 + time * 1.8) * 10;

        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const scale = 1 + noise / len;

        spherePositions.setXYZ(i, ox * scale, oy * scale, oz * scale);
      }
      spherePositions.needsUpdate = true;

      // Animate torus with twist
      for (let i = 0; i < torusPositions.count; i++) {
        const ox = torusOriginal[i * 3];
        const oy = torusOriginal[i * 3 + 1];
        const oz = torusOriginal[i * 3 + 2];

        const angle = Math.atan2(oz, ox);
        const twist = Math.sin(angle * 3 + time * 2) * 5;

        torusPositions.setXYZ(i, ox, oy + twist, oz);
      }
      torusPositions.needsUpdate = true;

      // Animate box with bulge
      for (let i = 0; i < boxPositions.count; i++) {
        const ox = boxOriginal[i * 3];
        const oy = boxOriginal[i * 3 + 1];
        const oz = boxOriginal[i * 3 + 2];

        const bulge = 1 + Math.sin(time * 3) * 0.1 *
                     Math.sin(ox * 0.1) * Math.sin(oy * 0.1) * Math.sin(oz * 0.1);

        boxPositions.setXYZ(i, ox * bulge, oy * bulge, oz * bulge);
      }
      boxPositions.needsUpdate = true;

      // Rotate objects
      sphere.rotation.y = time * 0.3;
      torus.rotation.x = time * 0.4;
      torus.rotation.y = time * 0.2;
      box.rotation.x = time * 0.2;
      box.rotation.y = time * 0.3;

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
    { title: 'three.js webgl - geometry - dynamic' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - dynamic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryDynamic(a, win, { width: WIDTH, height: HEIGHT });
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
