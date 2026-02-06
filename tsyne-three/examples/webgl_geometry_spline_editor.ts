/**
 * three.js webgl - geometry - spline curves
 *
 * Tests:
 * - CatmullRomCurve3 with different curve types
 * - Curve visualization with TubeGeometry
 * - Control point visualization
 * - Animated curve modification
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometrySplineEditorParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometrySplineEditorDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometrySplineEditor(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometrySplineEditorParams = {}
): Promise<WebGLGeometrySplineEditorDemo> {
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
  scene.background = new THREE.Color(0x1a1a2e);

  // Control points for the spline
  const controlPoints: THREE.Vector3[] = [
    new THREE.Vector3(-100, 0, 100),
    new THREE.Vector3(-50, 50, 50),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(50, -50, -50),
    new THREE.Vector3(100, 0, -100),
    new THREE.Vector3(50, 50, -50),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-50, -50, 50),
  ];

  // Visualize control points
  const pointGeometry = new THREE.SphereGeometry(5, 16, 12);
  const pointMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < controlPoints.length; i++) {
    const pointMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / controlPoints.length, 1, 0.5),
    });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.copy(controlPoints[i]);
    scene.add(pointMesh);
    pointMeshes.push(pointMesh);
  }

  // Connect control points with lines
  const linePoints: THREE.Vector3[] = [];
  for (const p of controlPoints) {
    linePoints.push(p.clone());
  }
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
  const controlLine = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(controlLine);

  // Create three different curve types
  const curveTypes: ('centripetal' | 'chordal' | 'catmullrom')[] = ['centripetal', 'chordal', 'catmullrom'];
  const curveColors = [0xff6b6b, 0x4ecdc4, 0xffe66d];
  const tubeMeshes: THREE.Mesh[] = [];

  for (let c = 0; c < curveTypes.length; c++) {
    const curve = new THREE.CatmullRomCurve3(controlPoints, true, curveTypes[c]);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 2, 8, true);
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: curveColors[c],
      wireframe: true,
    });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tubeMesh.position.y = (c - 1) * 60;
    scene.add(tubeMesh);
    tubeMeshes.push(tubeMesh);
  }

  // Add curve labels using simple geometry
  const labelPositions = [
    new THREE.Vector3(-150, 60, 0),
    new THREE.Vector3(-150, 0, 0),
    new THREE.Vector3(-150, -60, 0),
  ];

  for (let i = 0; i < 3; i++) {
    const labelGeometry = new THREE.BoxGeometry(40, 10, 2);
    const labelMaterial = new THREE.MeshBasicMaterial({ color: curveColors[i] });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.copy(labelPositions[i]);
    scene.add(label);
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

  // Store original positions for animation
  const originalPositions = controlPoints.map((p) => p.clone());

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Animate control points
      for (let i = 0; i < controlPoints.length; i++) {
        const orig = originalPositions[i];
        controlPoints[i].x = orig.x + Math.sin(time + i) * 20;
        controlPoints[i].y = orig.y + Math.cos(time * 0.7 + i) * 20;
        controlPoints[i].z = orig.z + Math.sin(time * 0.5 + i) * 20;

        pointMeshes[i].position.copy(controlPoints[i]);
      }

      // Update control line
      const linePositions = controlLine.geometry.getAttribute('position');
      for (let i = 0; i < controlPoints.length; i++) {
        linePositions.setXYZ(i, controlPoints[i].x, controlPoints[i].y, controlPoints[i].z);
      }
      linePositions.needsUpdate = true;

      // Recreate tube geometries with updated curves
      for (let c = 0; c < curveTypes.length; c++) {
        const curve = new THREE.CatmullRomCurve3(controlPoints, true, curveTypes[c]);
        const newGeometry = new THREE.TubeGeometry(curve, 100, 2, 8, true);
        tubeMeshes[c].geometry.dispose();
        tubeMeshes[c].geometry = newGeometry;
      }

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
    { title: 'three.js webgl - geometry - spline curves' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - spline curves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometrySplineEditor(a, win, { width: WIDTH, height: HEIGHT });
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
