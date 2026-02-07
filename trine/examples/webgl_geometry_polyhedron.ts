/**
 * three.js webgl - geometry - polyhedron
 *
 * Tests:
 * - All polyhedron geometry types
 * - Icosahedron, Octahedron, Tetrahedron, Dodecahedron
 * - Different detail levels
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryPolyhedronParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryPolyhedronDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryPolyhedron(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryPolyhedronParams = {}
): Promise<WebGLGeometryPolyhedronDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  const meshes: THREE.Mesh[] = [];

  // Row 1: Base polyhedra (detail = 0)
  // Tetrahedron
  const tetraGeo = new THREE.TetrahedronGeometry(40, 0);
  const tetraMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true });
  const tetra = new THREE.Mesh(tetraGeo, tetraMat);
  tetra.position.set(-180, 100, 0);
  scene.add(tetra);
  meshes.push(tetra);

  // Octahedron
  const octaGeo = new THREE.OctahedronGeometry(40, 0);
  const octaMat = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true });
  const octa = new THREE.Mesh(octaGeo, octaMat);
  octa.position.set(-60, 100, 0);
  scene.add(octa);
  meshes.push(octa);

  // Icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(40, 0);
  const icoMat = new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  ico.position.set(60, 100, 0);
  scene.add(ico);
  meshes.push(ico);

  // Dodecahedron
  const dodecaGeo = new THREE.DodecahedronGeometry(40, 0);
  const dodecaMat = new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true });
  const dodeca = new THREE.Mesh(dodecaGeo, dodecaMat);
  dodeca.position.set(180, 100, 0);
  scene.add(dodeca);
  meshes.push(dodeca);

  // Row 2: Detail level 1
  const tetraGeo1 = new THREE.TetrahedronGeometry(40, 1);
  const tetra1 = new THREE.Mesh(tetraGeo1, new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true }));
  tetra1.position.set(-180, 0, 0);
  scene.add(tetra1);
  meshes.push(tetra1);

  const octaGeo1 = new THREE.OctahedronGeometry(40, 1);
  const octa1 = new THREE.Mesh(octaGeo1, new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true }));
  octa1.position.set(-60, 0, 0);
  scene.add(octa1);
  meshes.push(octa1);

  const icoGeo1 = new THREE.IcosahedronGeometry(40, 1);
  const ico1 = new THREE.Mesh(icoGeo1, new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true }));
  ico1.position.set(60, 0, 0);
  scene.add(ico1);
  meshes.push(ico1);

  const dodecaGeo1 = new THREE.DodecahedronGeometry(40, 1);
  const dodeca1 = new THREE.Mesh(dodecaGeo1, new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true }));
  dodeca1.position.set(180, 0, 0);
  scene.add(dodeca1);
  meshes.push(dodeca1);

  // Row 3: Detail level 2
  const tetraGeo2 = new THREE.TetrahedronGeometry(40, 2);
  const tetra2 = new THREE.Mesh(tetraGeo2, new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true }));
  tetra2.position.set(-180, -100, 0);
  scene.add(tetra2);
  meshes.push(tetra2);

  const octaGeo2 = new THREE.OctahedronGeometry(40, 2);
  const octa2 = new THREE.Mesh(octaGeo2, new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true }));
  octa2.position.set(-60, -100, 0);
  scene.add(octa2);
  meshes.push(octa2);

  const icoGeo2 = new THREE.IcosahedronGeometry(40, 2);
  const ico2 = new THREE.Mesh(icoGeo2, new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true }));
  ico2.position.set(60, -100, 0);
  scene.add(ico2);
  meshes.push(ico2);

  const dodecaGeo2 = new THREE.DodecahedronGeometry(40, 2);
  const dodeca2 = new THREE.Mesh(dodecaGeo2, new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true }));
  dodeca2.position.set(180, -100, 0);
  scene.add(dodeca2);
  meshes.push(dodeca2);

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
        meshes[i].rotation.x = time * 0.3;
        meshes[i].rotation.y = time * 0.4 + i * 0.2;
      }

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
    { title: 'three.js webgl - geometry - polyhedron' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - polyhedron', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryPolyhedron(a, win, { width: WIDTH, height: HEIGHT });
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
