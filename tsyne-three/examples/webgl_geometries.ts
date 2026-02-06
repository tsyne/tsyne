/**
 * three.js webgl - geometries
 *
 * Port of: three/examples/webgl_geometries.html
 *
 * Tests multiple geometry types with PointLight and MeshPhongMaterial:
 * - SphereGeometry, IcosahedronGeometry, OctahedronGeometry, TetrahedronGeometry
 * - PlaneGeometry, BoxGeometry, CircleGeometry, RingGeometry
 * - CylinderGeometry, LatheGeometry, TorusGeometry, TorusKnotGeometry
 * - CapsuleGeometry
 *
 * Adaptations for Tsyne:
 * - Removes texture loading (requires asset loading system)
 * - Removes ParametricGeometry (requires addon)
 * - Removes Stats
 * - Uses solid color material instead of textured
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometriesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometriesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometries(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometriesParams = {}
): Promise<WebGLGeometriesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.y = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xcccccc, 1.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 2.5, 0, 0);
  camera.add(pointLight);
  scene.add(camera);

  // Material - using solid color since we don't have texture loading yet
  const material = new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  // Alternative material with different color for variety
  const material2 = new THREE.MeshPhongMaterial({
    color: 0x892156,
    emissive: 0x350724,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  let object;

  // Row 1: Platonic-ish solids
  object = new THREE.Mesh(new THREE.SphereGeometry(75, 20, 10), material);
  object.position.set(-300, 0, 300);
  scene.add(object);

  object = new THREE.Mesh(new THREE.IcosahedronGeometry(75), material);
  object.position.set(-100, 0, 300);
  scene.add(object);

  object = new THREE.Mesh(new THREE.OctahedronGeometry(75), material);
  object.position.set(100, 0, 300);
  scene.add(object);

  object = new THREE.Mesh(new THREE.TetrahedronGeometry(75), material);
  object.position.set(300, 0, 300);
  scene.add(object);

  // Row 2: Flat and box shapes
  object = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 4, 4), material2);
  object.position.set(-300, 0, 100);
  scene.add(object);

  object = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100, 4, 4, 4), material2);
  object.position.set(-100, 0, 100);
  scene.add(object);

  object = new THREE.Mesh(new THREE.CircleGeometry(50, 20, 0, Math.PI * 2), material2);
  object.position.set(100, 0, 100);
  scene.add(object);

  object = new THREE.Mesh(new THREE.RingGeometry(10, 50, 20, 5, 0, Math.PI * 2), material2);
  object.position.set(300, 0, 100);
  scene.add(object);

  // Row 3: Rotational shapes
  object = new THREE.Mesh(new THREE.CylinderGeometry(25, 75, 100, 40, 5), material);
  object.position.set(-300, 0, -100);
  scene.add(object);

  // Lathe geometry - create a custom profile
  const lathePoints = [];
  for (let i = 0; i < 50; i++) {
    lathePoints.push(
      new THREE.Vector2(
        Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 50,
        (i - 5) * 2
      )
    );
  }
  object = new THREE.Mesh(new THREE.LatheGeometry(lathePoints, 20), material);
  object.position.set(-100, 0, -100);
  scene.add(object);

  object = new THREE.Mesh(new THREE.TorusGeometry(50, 20, 20, 20), material);
  object.position.set(100, 0, -100);
  scene.add(object);

  object = new THREE.Mesh(new THREE.TorusKnotGeometry(50, 10, 50, 20), material);
  object.position.set(300, 0, -100);
  scene.add(object);

  // Row 4: More shapes
  object = new THREE.Mesh(new THREE.CapsuleGeometry(20, 50), material2);
  object.position.set(-300, 0, -300);
  scene.add(object);

  object = new THREE.Mesh(new THREE.DodecahedronGeometry(75), material2);
  object.position.set(-100, 0, -300);
  scene.add(object);

  object = new THREE.Mesh(new THREE.ConeGeometry(50, 100, 20), material2);
  object.position.set(100, 0, -300);
  scene.add(object);

  // Extra torus with different params
  object = new THREE.Mesh(new THREE.TorusGeometry(50, 10, 16, 100), material2);
  object.position.set(300, 0, -300);
  scene.add(object);

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
      const timer = (Date.now() - startTime) * 0.0001;
      currentTime = (Date.now() - startTime);

      // Camera orbits around the scene
      camera.position.x = Math.cos(timer) * 800;
      camera.position.z = Math.sin(timer) * 800;
      camera.lookAt(scene.position);

      // Rotate all meshes
      scene.traverse((obj: any) => {
        if (obj.isMesh === true) {
          obj.rotation.x = timer * 5;
          obj.rotation.y = timer * 2.5;
        }
      });

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
    { title: 'three.js webgl - geometries' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometries', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometries(a, win, { width: WIDTH, height: HEIGHT });
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
