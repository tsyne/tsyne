/**
 * three.js webgl - geometry - tube
 *
 * Tests:
 * - TubeGeometry
 * - CatmullRomCurve3
 * - Various curve types (closed, open)
 * - MeshBasicMaterial wireframe
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTubeParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTubeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryTube(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryTubeParams = {}
): Promise<WebGLGeometryTubeDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const meshes: THREE.Mesh[] = [];

  // Helix curve
  const helixPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    helixPoints.push(
      new THREE.Vector3(
        Math.cos(t * Math.PI * 6) * 30,
        t * 100 - 50,
        Math.sin(t * Math.PI * 6) * 30
      )
    );
  }
  const helixCurve = new THREE.CatmullRomCurve3(helixPoints);
  const helixGeometry = new THREE.TubeGeometry(helixCurve, 100, 3, 8, false);
  const helixMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const helixMesh = new THREE.Mesh(helixGeometry, helixMaterial);
  helixMesh.position.set(-150, 0, 0);
  scene.add(helixMesh);
  meshes.push(helixMesh);

  // Trefoil knot curve
  const trefoilPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * Math.PI * 2;
    trefoilPoints.push(
      new THREE.Vector3(
        Math.sin(t) + 2 * Math.sin(2 * t),
        Math.cos(t) - 2 * Math.cos(2 * t),
        -Math.sin(3 * t)
      ).multiplyScalar(20)
    );
  }
  const trefoilCurve = new THREE.CatmullRomCurve3(trefoilPoints);
  trefoilCurve.closed = true;
  const trefoilGeometry = new THREE.TubeGeometry(trefoilCurve, 100, 4, 8, true);
  const trefoilMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const trefoilMesh = new THREE.Mesh(trefoilGeometry, trefoilMaterial);
  trefoilMesh.position.set(0, 0, 0);
  scene.add(trefoilMesh);
  meshes.push(trefoilMesh);

  // Figure-8 curve
  const figure8Points: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * Math.PI * 2;
    figure8Points.push(
      new THREE.Vector3(
        Math.sin(t) * 40,
        Math.sin(t) * Math.cos(t) * 40,
        Math.cos(t) * 20
      )
    );
  }
  const figure8Curve = new THREE.CatmullRomCurve3(figure8Points);
  figure8Curve.closed = true;
  const figure8Geometry = new THREE.TubeGeometry(figure8Curve, 100, 3, 8, true);
  const figure8Material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
  const figure8Mesh = new THREE.Mesh(figure8Geometry, figure8Material);
  figure8Mesh.position.set(150, 0, 0);
  scene.add(figure8Mesh);
  meshes.push(figure8Mesh);

  // Wavy line
  const wavyPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    wavyPoints.push(
      new THREE.Vector3(
        t * 200 - 100,
        Math.sin(t * Math.PI * 4) * 20,
        Math.cos(t * Math.PI * 4) * 20
      )
    );
  }
  const wavyCurve = new THREE.CatmullRomCurve3(wavyPoints);
  const wavyGeometry = new THREE.TubeGeometry(wavyCurve, 100, 5, 8, false);
  const wavyMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
  const wavyMesh = new THREE.Mesh(wavyGeometry, wavyMaterial);
  wavyMesh.position.set(0, -120, 0);
  scene.add(wavyMesh);
  meshes.push(wavyMesh);

  // Circular ring
  const ringPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * Math.PI * 2;
    ringPoints.push(
      new THREE.Vector3(Math.cos(t) * 50, 0, Math.sin(t) * 50)
    );
  }
  const ringCurve = new THREE.CatmullRomCurve3(ringPoints);
  ringCurve.closed = true;
  const ringGeometry = new THREE.TubeGeometry(ringCurve, 64, 8, 8, true);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.position.set(0, 120, 0);
  scene.add(ringMesh);
  meshes.push(ringMesh);

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
        meshes[i].rotation.y = time * (0.2 + i * 0.05);
        meshes[i].rotation.x = time * 0.1;
      }

      // Orbit camera
      camera.position.x = Math.cos(time * 0.2) * 500;
      camera.position.z = Math.sin(time * 0.2) * 500;
      camera.position.y = Math.sin(time * 0.1) * 100;
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
    { title: 'three.js webgl - geometry - tube' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - tube', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryTube(a, win, { width: WIDTH, height: HEIGHT });
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
