/**
 * three.js webgl - curve modifier
 *
 * Port of: three/examples/webgl_modifier_curve.html
 *
 * Tests:
 * - Geometry deformation along a curve
 * - CatmullRomCurve3 paths
 * - Mesh deformation
 *
 * Adaptations for Tsyne:
 * - Uses procedural curve-based deformation
 * - Simplified curve modifier implementation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierCurveParams {
  width?: number;
  height?: number;
}

export interface WebGLModifierCurveDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierCurve(
  a: App,
  win: ITsyneWindow,
  params: WebGLModifierCurveParams = {}
): Promise<WebGLModifierCurveDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 200, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040));

  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0x8888ff, 0.5);
  light2.position.set(-1, 0.5, -1);
  scene.add(light2);

  // Create a curve path
  const curvePoints: THREE.Vector3[] = [];
  const numCurvePoints = 10;

  for (let i = 0; i < numCurvePoints; i++) {
    const t = i / (numCurvePoints - 1);
    const x = (t - 0.5) * 400;
    const y = Math.sin(t * Math.PI * 2) * 80;
    const z = Math.cos(t * Math.PI * 1.5) * 60;
    curvePoints.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  curve.curveType = 'catmullrom';
  curve.tension = 0.5;

  // Visualize the curve
  const curveGeometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(100)
  );
  const curveMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const curveLine = new THREE.Line(curveGeometry, curveMaterial);
  scene.add(curveLine);

  // Create boxes along the curve (simple curve modifier visualization)
  const boxGeometry = new THREE.BoxGeometry(20, 20, 20);
  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff88 });

  const curveBoxes: THREE.Mesh[] = [];
  const numBoxes = 30;

  for (let i = 0; i < numBoxes; i++) {
    const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());
    scene.add(box);
    curveBoxes.push(box);
  }

  // Create a tube geometry following the curve
  const tubeGeometry = new THREE.TubeGeometry(curve, 100, 8, 8, false);
  const tubeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4488,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(tubeMesh);

  // Create a second animated curve
  const curve2Points: THREE.Vector3[] = [];
  for (let i = 0; i < numCurvePoints; i++) {
    const t = i / (numCurvePoints - 1);
    const x = (t - 0.5) * 300;
    const y = -100 + Math.sin(t * Math.PI * 3) * 40;
    const z = Math.cos(t * Math.PI * 2) * 80;
    curve2Points.push(new THREE.Vector3(x, y, z));
  }

  const curve2 = new THREE.CatmullRomCurve3(curve2Points);

  const curve2Geometry = new THREE.BufferGeometry().setFromPoints(
    curve2.getPoints(100)
  );
  const curve2Line = new THREE.Line(
    curve2Geometry,
    new THREE.LineBasicMaterial({ color: 0x88ff00 })
  );
  scene.add(curve2Line);

  // Spheres along second curve
  const sphereGeometry = new THREE.SphereGeometry(10, 16, 8);
  const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x88aaff });

  const curveSpheres: THREE.Mesh[] = [];
  for (let i = 0; i < 20; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
    scene.add(sphere);
    curveSpheres.push(sphere);
  }

  // Add floor
  const floorGeometry = new THREE.PlaneGeometry(800, 800);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -150;
  scene.add(floor);

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

      // Animate boxes along curve
      curveBoxes.forEach((box, i) => {
        const t = ((i / numBoxes) + time * 0.1) % 1;
        const position = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);

        box.position.copy(position);
        box.lookAt(position.clone().add(tangent));
        box.rotation.z = time + i * 0.1;

        // Animate color
        const mat = box.material as THREE.MeshPhongMaterial;
        mat.color.setHSL((t + time * 0.1) % 1, 0.8, 0.5);
      });

      // Animate spheres along second curve
      curveSpheres.forEach((sphere, i) => {
        const t = ((i / curveSpheres.length) + time * 0.15) % 1;
        const position = curve2.getPointAt(t);
        sphere.position.copy(position);

        // Pulse size
        const scale = 0.8 + 0.4 * Math.sin(time * 3 + i);
        sphere.scale.setScalar(scale);
      });

      // Animate first curve points
      for (let i = 0; i < curvePoints.length; i++) {
        curvePoints[i].y = Math.sin(time + i * 0.5) * 80;
      }

      // Update curve and geometry
      curve.points = curvePoints;
      const newCurvePoints = curve.getPoints(100);
      curveGeometry.setFromPoints(newCurvePoints);

      // Update tube
      tubeMesh.geometry.dispose();
      tubeMesh.geometry = new THREE.TubeGeometry(curve, 100, 8, 8, false);

      // Camera animation
      camera.position.x = Math.sin(time * 0.2) * 300;
      camera.position.z = 400 + Math.cos(time * 0.2) * 200;
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
    { title: 'three.js webgl - curve modifier' },
    (a) => {
      a.window(
        { title: 'three.js webgl - curve modifier', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierCurve(a, win, { width: WIDTH, height: HEIGHT });
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
