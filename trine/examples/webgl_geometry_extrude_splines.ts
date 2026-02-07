/**
 * three.js webgl - geometry extrude splines
 *
 * Tests:
 * - ExtrudeGeometry with spline paths
 * - CatmullRomCurve3 for smooth splines
 * - Shape extrusion along curves
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryExtrudeSplinesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryExtrudeSplinesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryExtrudeSplines(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryExtrudeSplinesParams = {}
): Promise<WebGLGeometryExtrudeSplinesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.set(0, 100, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x112233);

  // Create a spline curve
  const splinePoints = [
    new THREE.Vector3(-150, 0, 150),
    new THREE.Vector3(-50, 50, 50),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(50, -50, -50),
    new THREE.Vector3(150, 0, -150),
  ];

  const spline = new THREE.CatmullRomCurve3(splinePoints);
  spline.curveType = 'catmullrom';
  spline.closed = false;

  // Visualize the spline
  const splineGeometry = new THREE.BufferGeometry().setFromPoints(spline.getPoints(100));
  const splineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const splineLine = new THREE.Line(splineGeometry, splineMaterial);
  scene.add(splineLine);

  // Create a shape to extrude along the spline
  const circleShape = new THREE.Shape();
  const circleRadius = 10;
  circleShape.absarc(0, 0, circleRadius, 0, Math.PI * 2, false);

  // Extrude settings
  const extrudeSettings = {
    steps: 100,
    bevelEnabled: false,
    extrudePath: spline,
  };

  const extrudeGeometry = new THREE.ExtrudeGeometry(circleShape, extrudeSettings);
  const extrudeMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true });
  const extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudeMaterial);
  scene.add(extrudeMesh);

  // Create a second spline - helix
  const helixPoints = [];
  const helixTurns = 3;
  const helixHeight = 200;
  const helixRadius = 80;
  
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const angle = t * Math.PI * 2 * helixTurns;
    helixPoints.push(new THREE.Vector3(
      Math.cos(angle) * helixRadius,
      t * helixHeight - helixHeight / 2,
      Math.sin(angle) * helixRadius
    ));
  }

  const helixSpline = new THREE.CatmullRomCurve3(helixPoints);

  // Star shape for helix extrusion
  const starShape = new THREE.Shape();
  const starOuter = 8;
  const starInner = 4;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? starOuter : starInner;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) {
      starShape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    } else {
      starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
  }
  starShape.closePath();

  const helixSettings = {
    steps: 120,
    bevelEnabled: false,
    extrudePath: helixSpline,
  };

  const helixGeometry = new THREE.ExtrudeGeometry(starShape, helixSettings);
  const helixMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600, wireframe: true });
  const helixMesh = new THREE.Mesh(helixGeometry, helixMaterial);
  helixMesh.position.set(200, 0, 0);
  scene.add(helixMesh);

  // Third spline - figure-8
  const figure8Points = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    figure8Points.push(new THREE.Vector3(
      Math.sin(t) * 100,
      Math.sin(t * 2) * 50,
      Math.cos(t) * 50
    ));
  }

  const figure8Spline = new THREE.CatmullRomCurve3(figure8Points);
  figure8Spline.closed = true;

  // Square shape for figure-8
  const squareShape = new THREE.Shape();
  squareShape.moveTo(-5, -5);
  squareShape.lineTo(5, -5);
  squareShape.lineTo(5, 5);
  squareShape.lineTo(-5, 5);
  squareShape.closePath();

  const figure8Settings = {
    steps: 128,
    bevelEnabled: false,
    extrudePath: figure8Spline,
  };

  const figure8Geometry = new THREE.ExtrudeGeometry(squareShape, figure8Settings);
  const figure8Material = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true });
  const figure8Mesh = new THREE.Mesh(figure8Geometry, figure8Material);
  figure8Mesh.position.set(-200, 0, 0);
  scene.add(figure8Mesh);

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

      // Rotate meshes
      extrudeMesh.rotation.y = time * 0.3;
      helixMesh.rotation.y = time * 0.4;
      figure8Mesh.rotation.y = time * 0.2;
      figure8Mesh.rotation.x = time * 0.1;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 500;
      camera.position.z = Math.cos(time * 0.2) * 500;
      camera.position.y = Math.sin(time * 0.15) * 150 + 100;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - geometry extrude splines' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry extrude splines', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryExtrudeSplines(a, win, { width: WIDTH, height: HEIGHT });
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
