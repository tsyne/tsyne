/**
 * three.js webgl - geometry - wireframe generator
 *
 * Tests:
 * - WireframeGeometry for full wireframe
 * - Comparison with EdgesGeometry
 * - Different geometry types
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryWireframeGenParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryWireframeGenDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryWireframeGen(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryWireframeGenParams = {}
): Promise<WebGLGeometryWireframeGenDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 600);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d0d);

  const groups: THREE.Group[] = [];

  // Create pairs: WireframeGeometry (left) vs EdgesGeometry (right)
  const geometries = [
    { geo: new THREE.BoxGeometry(50, 50, 50), name: 'Box' },
    { geo: new THREE.SphereGeometry(30, 12, 8), name: 'Sphere' },
    { geo: new THREE.ConeGeometry(25, 50, 8), name: 'Cone' },
    { geo: new THREE.TorusGeometry(25, 10, 8, 16), name: 'Torus' },
  ];

  const yPositions = [120, 40, -40, -120];

  for (let i = 0; i < geometries.length; i++) {
    const group = new THREE.Group();
    group.position.y = yPositions[i];

    // WireframeGeometry - shows all triangles
    const wireframe = new THREE.WireframeGeometry(geometries[i].geo);
    const wireframeLine = new THREE.LineSegments(
      wireframe,
      new THREE.LineBasicMaterial({ color: 0x00ffff })
    );
    wireframeLine.position.x = -100;
    group.add(wireframeLine);

    // EdgesGeometry - shows only sharp edges
    const edges = new THREE.EdgesGeometry(geometries[i].geo, 15);
    const edgesLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xff00ff })
    );
    edgesLine.position.x = 100;
    group.add(edgesLine);

    scene.add(group);
    groups.push(group);
  }

  // Add a complex shape to show the difference more clearly
  const knotGeometry = new THREE.TorusKnotGeometry(40, 12, 48, 8);

  const knotGroup = new THREE.Group();
  knotGroup.position.set(0, 0, -100);

  const knotWireframe = new THREE.WireframeGeometry(knotGeometry);
  const knotWireframeLine = new THREE.LineSegments(
    knotWireframe,
    new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true })
  );
  knotWireframeLine.position.x = -120;
  knotGroup.add(knotWireframeLine);

  const knotEdges = new THREE.EdgesGeometry(knotGeometry, 20);
  const knotEdgesLine = new THREE.LineSegments(
    knotEdges,
    new THREE.LineBasicMaterial({ color: 0xffff00 })
  );
  knotEdgesLine.position.x = 120;
  knotGroup.add(knotEdgesLine);

  scene.add(knotGroup);
  groups.push(knotGroup);

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

      // Rotate all groups
      for (let i = 0; i < groups.length; i++) {
        // Rotate each child in the group
        groups[i].children.forEach((child) => {
          child.rotation.x = time * 0.3;
          child.rotation.y = time * 0.4;
        });
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
    { title: 'three.js webgl - geometry - wireframe generator' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - wireframe generator', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryWireframeGen(a, win, { width: WIDTH, height: HEIGHT });
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
