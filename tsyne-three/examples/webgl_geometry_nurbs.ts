/**
 * three.js webgl - geometry - NURBS curves
 *
 * Tests:
 * - NURBSCurve for smooth curves
 * - Control point visualization
 * - Tube geometry from NURBS
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryNurbsParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryNurbsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryNurbs(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryNurbsParams = {}
): Promise<WebGLGeometryNurbsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 100, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Create NURBS curve 1
  const degree1 = 3;
  const knots1 = [0, 0, 0, 0, 1, 2, 3, 4, 4, 4, 4];
  const controlPoints1 = [
    new THREE.Vector4(-100, 0, 0, 1),
    new THREE.Vector4(-50, 50, 50, 1),
    new THREE.Vector4(0, 0, 100, 1),
    new THREE.Vector4(50, -50, 50, 1),
    new THREE.Vector4(100, 0, 0, 1),
    new THREE.Vector4(50, 50, -50, 1),
    new THREE.Vector4(0, 0, -100, 1),
  ];

  const nurbsCurve1 = new NURBSCurve(degree1, knots1, controlPoints1);
  const curvePoints1 = nurbsCurve1.getPoints(100);
  const curveGeometry1 = new THREE.BufferGeometry().setFromPoints(curvePoints1);
  const curveMaterial1 = new THREE.LineBasicMaterial({ color: 0xff6b6b });
  const curveLine1 = new THREE.Line(curveGeometry1, curveMaterial1);
  curveLine1.position.y = 50;
  scene.add(curveLine1);

  // Visualize control points for curve 1
  const pointGeometry = new THREE.SphereGeometry(3, 16, 12);
  const controlPointMeshes1: THREE.Mesh[] = [];

  for (const cp of controlPoints1) {
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.set(cp.x, cp.y + 50, cp.z);
    scene.add(pointMesh);
    controlPointMeshes1.push(pointMesh);
  }

  // Control point lines for curve 1
  const controlLine1Points: THREE.Vector3[] = controlPoints1.map(
    (cp) => new THREE.Vector3(cp.x, cp.y + 50, cp.z)
  );
  const controlLineGeometry1 = new THREE.BufferGeometry().setFromPoints(controlLine1Points);
  const controlLineMaterial1 = new THREE.LineBasicMaterial({ color: 0x444444 });
  const controlLine1 = new THREE.Line(controlLineGeometry1, controlLineMaterial1);
  scene.add(controlLine1);

  // Create NURBS curve 2 with different weights
  const degree2 = 3;
  const knots2 = [0, 0, 0, 0, 1, 1, 1, 1];
  const controlPoints2 = [
    new THREE.Vector4(-80, 0, 0, 1),
    new THREE.Vector4(-40, 80, 0, 0.5), // Lower weight = curve pulls less
    new THREE.Vector4(40, 80, 0, 2),    // Higher weight = curve pulls more
    new THREE.Vector4(80, 0, 0, 1),
  ];

  const nurbsCurve2 = new NURBSCurve(degree2, knots2, controlPoints2);
  const curvePoints2 = nurbsCurve2.getPoints(100);
  const curveGeometry2 = new THREE.BufferGeometry().setFromPoints(curvePoints2);
  const curveMaterial2 = new THREE.LineBasicMaterial({ color: 0x4ecdc4 });
  const curveLine2 = new THREE.Line(curveGeometry2, curveMaterial2);
  curveLine2.position.y = -50;
  scene.add(curveLine2);

  // Control points for curve 2
  const controlPointMeshes2: THREE.Mesh[] = [];
  for (const cp of controlPoints2) {
    const size = 2 + cp.w * 2; // Size based on weight
    const pointGeo = new THREE.SphereGeometry(size, 16, 12);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const pointMesh = new THREE.Mesh(pointGeo, pointMaterial);
    pointMesh.position.set(cp.x, cp.y - 50, cp.z);
    scene.add(pointMesh);
    controlPointMeshes2.push(pointMesh);
  }

  // Create tube from NURBS curve
  const degree3 = 3;
  const knots3 = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1];
  const controlPoints3 = [
    new THREE.Vector4(-100, -100, 50, 1),
    new THREE.Vector4(-50, -100, 100, 1),
    new THREE.Vector4(0, -100, 50, 1),
    new THREE.Vector4(50, -100, 0, 1),
    new THREE.Vector4(100, -100, 50, 1),
    new THREE.Vector4(50, -100, 100, 1),
    new THREE.Vector4(0, -100, 150, 1),
  ];

  const nurbsCurve3 = new NURBSCurve(degree3, knots3, controlPoints3);
  const tubeGeometry = new THREE.TubeGeometry(nurbsCurve3, 100, 5, 8, false);
  const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true });
  const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(tubeMesh);

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

      // Rotate curves
      curveLine1.rotation.y = time * 0.2;
      controlLine1.rotation.y = time * 0.2;
      for (const pm of controlPointMeshes1) {
        // Rotate around Y axis
        const x = pm.position.x;
        const z = pm.position.z;
        const cos = Math.cos(time * 0.2);
        const sin = Math.sin(time * 0.2);
        pm.position.x = controlPoints1[controlPointMeshes1.indexOf(pm)].x;
        pm.position.z = controlPoints1[controlPointMeshes1.indexOf(pm)].z;
      }

      curveLine2.rotation.y = -time * 0.15;
      tubeMesh.rotation.y = time * 0.1;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - geometry - NURBS curves' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - NURBS curves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryNurbs(a, win, { width: WIDTH, height: HEIGHT });
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
