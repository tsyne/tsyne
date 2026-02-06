/**
 * three.js webgl - geometry - CSG-like operations
 *
 * Tests:
 * - Simulated boolean operations visualization
 * - Intersection/union/difference concepts
 * - Multiple overlapping geometries
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryCsgParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryCsgDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryCsg(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryCsgParams = {}
): Promise<WebGLGeometryCsgDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const groups: THREE.Group[] = [];

  // Group 1: Union visualization (overlapping shapes)
  const unionGroup = new THREE.Group();
  unionGroup.position.set(-150, 50, 0);

  const unionBox = new THREE.Mesh(
    new THREE.BoxGeometry(50, 50, 50),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true, transparent: true, opacity: 0.8 })
  );
  unionGroup.add(unionBox);

  const unionSphere = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true, transparent: true, opacity: 0.8 })
  );
  unionSphere.position.set(25, 0, 0);
  unionGroup.add(unionSphere);

  scene.add(unionGroup);
  groups.push(unionGroup);

  // Group 2: Intersection visualization
  const intersectGroup = new THREE.Group();
  intersectGroup.position.set(0, 50, 0);

  const intersectCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(25, 25, 60, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true, transparent: true, opacity: 0.8 })
  );
  intersectGroup.add(intersectCylinder);

  const intersectBox = new THREE.Mesh(
    new THREE.BoxGeometry(45, 45, 45),
    new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true, transparent: true, opacity: 0.8 })
  );
  intersectGroup.add(intersectBox);

  // Add highlight for intersection region
  const intersectHighlight = new THREE.Mesh(
    new THREE.BoxGeometry(35, 35, 35),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  intersectGroup.add(intersectHighlight);

  scene.add(intersectGroup);
  groups.push(intersectGroup);

  // Group 3: Difference visualization (box with holes)
  const differenceGroup = new THREE.Group();
  differenceGroup.position.set(150, 50, 0);

  const diffBox = new THREE.Mesh(
    new THREE.BoxGeometry(60, 60, 60),
    new THREE.MeshBasicMaterial({ color: 0xdcd6f7, wireframe: true })
  );
  differenceGroup.add(diffBox);

  // Cylinders representing holes
  const holeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const holeGeometry = new THREE.CylinderGeometry(12, 12, 80, 16);

  const holeX = new THREE.Mesh(holeGeometry, holeMaterial);
  holeX.rotation.z = Math.PI / 2;
  differenceGroup.add(holeX);

  const holeY = new THREE.Mesh(holeGeometry.clone(), holeMaterial);
  differenceGroup.add(holeY);

  const holeZ = new THREE.Mesh(holeGeometry.clone(), holeMaterial);
  holeZ.rotation.x = Math.PI / 2;
  differenceGroup.add(holeZ);

  scene.add(differenceGroup);
  groups.push(differenceGroup);

  // Group 4: Complex multi-shape intersection
  const complexGroup = new THREE.Group();
  complexGroup.position.set(-150, -70, 0);

  const shapes = [
    { geo: new THREE.TorusGeometry(30, 10, 16, 32), color: 0xff6b6b },
    { geo: new THREE.TorusGeometry(30, 10, 16, 32), color: 0x4ecdc4 },
    { geo: new THREE.TorusGeometry(30, 10, 16, 32), color: 0xffe66d },
  ];

  shapes.forEach((shape, i) => {
    const mesh = new THREE.Mesh(
      shape.geo,
      new THREE.MeshBasicMaterial({ color: shape.color, wireframe: true, transparent: true, opacity: 0.7 })
    );
    mesh.rotation.x = (i * Math.PI) / 3;
    complexGroup.add(mesh);
  });

  scene.add(complexGroup);
  groups.push(complexGroup);

  // Group 5: Nested spheres
  const nestedGroup = new THREE.Group();
  nestedGroup.position.set(0, -70, 0);

  for (let i = 0; i < 5; i++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(40 - i * 8, 24, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i / 5, 1, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      })
    );
    nestedGroup.add(sphere);
  }

  scene.add(nestedGroup);
  groups.push(nestedGroup);

  // Group 6: Interlocking rings
  const ringsGroup = new THREE.Group();
  ringsGroup.position.set(150, -70, 0);

  const ringColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(25, 5, 16, 32),
      new THREE.MeshBasicMaterial({ color: ringColors[i], wireframe: true })
    );
    ring.position.x = i * 15 - 30;
    ring.rotation.y = (i % 2) * Math.PI / 2;
    ringsGroup.add(ring);
  }

  scene.add(ringsGroup);
  groups.push(ringsGroup);

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
        groups[i].rotation.y = time * 0.3 + i * 0.5;
      }

      // Animate union sphere position
      unionSphere.position.x = 25 + Math.sin(time) * 15;

      // Animate nested spheres
      nestedGroup.children.forEach((child, i) => {
        child.rotation.x = time * 0.2 * (i + 1);
        child.rotation.y = time * 0.3 * (i + 1);
      });

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
    { title: 'three.js webgl - geometry - CSG concepts' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - CSG concepts', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryCsg(a, win, { width: WIDTH, height: HEIGHT });
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
