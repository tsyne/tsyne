/**
 * three.js webgl - geometry - edges
 *
 * Tests:
 * - EdgesGeometry for edge detection
 * - Threshold angle for edge detection
 * - LineSegments with edges
 * - Multiple geometries with edges
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryEdgesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryEdgesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryEdges(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryEdgesParams = {}
): Promise<WebGLGeometryEdgesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const objects: THREE.Object3D[] = [];

  // Box with edges
  const boxGeometry = new THREE.BoxGeometry(60, 60, 60);
  const boxEdges = new THREE.EdgesGeometry(boxGeometry, 1);
  const boxLine = new THREE.LineSegments(
    boxEdges,
    new THREE.LineBasicMaterial({ color: 0xff6b6b })
  );
  boxLine.position.set(-150, 100, 0);
  scene.add(boxLine);
  objects.push(boxLine);

  // Sphere with edges (low threshold shows more edges)
  const sphereGeometry = new THREE.SphereGeometry(40, 16, 12);
  const sphereEdges = new THREE.EdgesGeometry(sphereGeometry, 1);
  const sphereLine = new THREE.LineSegments(
    sphereEdges,
    new THREE.LineBasicMaterial({ color: 0x4ecdc4 })
  );
  sphereLine.position.set(0, 100, 0);
  scene.add(sphereLine);
  objects.push(sphereLine);

  // Cylinder with edges
  const cylinderGeometry = new THREE.CylinderGeometry(30, 30, 80, 16);
  const cylinderEdges = new THREE.EdgesGeometry(cylinderGeometry, 15);
  const cylinderLine = new THREE.LineSegments(
    cylinderEdges,
    new THREE.LineBasicMaterial({ color: 0xffe66d })
  );
  cylinderLine.position.set(150, 100, 0);
  scene.add(cylinderLine);
  objects.push(cylinderLine);

  // Torus with edges
  const torusGeometry = new THREE.TorusGeometry(35, 15, 12, 24);
  const torusEdges = new THREE.EdgesGeometry(torusGeometry, 5);
  const torusLine = new THREE.LineSegments(
    torusEdges,
    new THREE.LineBasicMaterial({ color: 0xa8e6cf })
  );
  torusLine.position.set(-150, -50, 0);
  scene.add(torusLine);
  objects.push(torusLine);

  // TorusKnot with edges
  const knotGeometry = new THREE.TorusKnotGeometry(30, 8, 64, 8);
  const knotEdges = new THREE.EdgesGeometry(knotGeometry, 10);
  const knotLine = new THREE.LineSegments(
    knotEdges,
    new THREE.LineBasicMaterial({ color: 0xdcd6f7 })
  );
  knotLine.position.set(0, -50, 0);
  scene.add(knotLine);
  objects.push(knotLine);

  // Icosahedron with edges
  const icoGeometry = new THREE.IcosahedronGeometry(45, 0);
  const icoEdges = new THREE.EdgesGeometry(icoGeometry, 1);
  const icoLine = new THREE.LineSegments(
    icoEdges,
    new THREE.LineBasicMaterial({ color: 0xf38181 })
  );
  icoLine.position.set(150, -50, 0);
  scene.add(icoLine);
  objects.push(icoLine);

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

      // Rotate all objects
      for (let i = 0; i < objects.length; i++) {
        objects[i].rotation.x = time * 0.3 + i * 0.5;
        objects[i].rotation.y = time * 0.4 + i * 0.3;
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
    { title: 'three.js webgl - geometry - edges' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - edges', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryEdges(a, win, { width: WIDTH, height: HEIGHT });
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
