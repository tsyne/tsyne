/**
 * three.js webgl - geometry - normals helper
 *
 * Tests:
 * - VertexNormalsHelper for visualizing normals
 * - Normal computation on various geometries
 * - Face vs vertex normals
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryNormalsParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryNormalsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryNormals(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryNormalsParams = {}
): Promise<WebGLGeometryNormalsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 100, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  const meshes: THREE.Mesh[] = [];
  const helpers: VertexNormalsHelper[] = [];

  // Box with normals
  const boxGeometry = new THREE.BoxGeometry(50, 50, 50);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(-120, 50, 0);
  scene.add(box);
  meshes.push(box);

  const boxHelper = new VertexNormalsHelper(box, 10, 0xff0000);
  scene.add(boxHelper);
  helpers.push(boxHelper);

  // Sphere with smooth normals
  const sphereGeometry = new THREE.SphereGeometry(35, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 50, 0);
  scene.add(sphere);
  meshes.push(sphere);

  const sphereHelper = new VertexNormalsHelper(sphere, 8, 0x00ff00);
  scene.add(sphereHelper);
  helpers.push(sphereHelper);

  // Torus with normals
  const torusGeometry = new THREE.TorusGeometry(30, 12, 16, 32);
  const torusMaterial = new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(120, 50, 0);
  scene.add(torus);
  meshes.push(torus);

  const torusHelper = new VertexNormalsHelper(torus, 6, 0x0088ff);
  scene.add(torusHelper);
  helpers.push(torusHelper);

  // Cone with sharp edges
  const coneGeometry = new THREE.ConeGeometry(30, 60, 8);
  const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.set(-120, -60, 0);
  scene.add(cone);
  meshes.push(cone);

  const coneHelper = new VertexNormalsHelper(cone, 10, 0xff00ff);
  scene.add(coneHelper);
  helpers.push(coneHelper);

  // Cylinder
  const cylinderGeometry = new THREE.CylinderGeometry(25, 25, 60, 16);
  const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xdcd6f7, wireframe: true });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.set(0, -60, 0);
  scene.add(cylinder);
  meshes.push(cylinder);

  const cylinderHelper = new VertexNormalsHelper(cylinder, 8, 0xffff00);
  scene.add(cylinderHelper);
  helpers.push(cylinderHelper);

  // Icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(35, 0);
  const icoMaterial = new THREE.MeshBasicMaterial({ color: 0xf38181, wireframe: true });
  const ico = new THREE.Mesh(icoGeometry, icoMaterial);
  ico.position.set(120, -60, 0);
  scene.add(ico);
  meshes.push(ico);

  const icoHelper = new VertexNormalsHelper(ico, 10, 0x00ffff);
  scene.add(icoHelper);
  helpers.push(icoHelper);

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

      // Rotate all meshes
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].rotation.x = time * 0.3 + i * 0.5;
        meshes[i].rotation.y = time * 0.4 + i * 0.3;
      }

      // Update helpers
      for (const helper of helpers) {
        helper.update();
      }

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
    { title: 'three.js webgl - geometry - normals helper' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - normals helper', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryNormals(a, win, { width: WIDTH, height: HEIGHT });
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
