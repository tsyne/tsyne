/**
 * three.js webgl - geometry - colors - lookup table
 *
 * Tests:
 * - Lut (lookup table) for color mapping
 * - Scalar field visualization
 * - Color gradients based on data values
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { Lut } from 'three/examples/jsm/math/Lut.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryColorsLookupTableParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryColorsLookupTableDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryColorsLookupTable(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryColorsLookupTableParams = {}
): Promise<WebGLGeometryColorsLookupTableDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 200, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Create lookup tables with different color maps
  const lutRainbow = new Lut('rainbow', 512);
  const lutCooltowarm = new Lut('cooltowarm', 512);
  const lutBlackbody = new Lut('blackbody', 512);

  lutRainbow.setMin(0);
  lutRainbow.setMax(1);
  lutCooltowarm.setMin(0);
  lutCooltowarm.setMax(1);
  lutBlackbody.setMin(0);
  lutBlackbody.setMax(1);

  // Create plane with scalar field coloring
  const planeGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
  planeGeometry.rotateX(-Math.PI / 2);

  const planePositions = planeGeometry.getAttribute('position');
  const planeColors = new Float32Array(planePositions.count * 3);

  // Compute scalar values and colors
  for (let i = 0; i < planePositions.count; i++) {
    const x = planePositions.getX(i);
    const z = planePositions.getZ(i);

    // Scalar field: distance from center, normalized
    const distance = Math.sqrt(x * x + z * z);
    const scalar = distance / 141; // 141 ≈ sqrt(100^2 + 100^2)

    const color = lutRainbow.getColor(scalar);
    planeColors[i * 3] = color.r;
    planeColors[i * 3 + 1] = color.g;
    planeColors[i * 3 + 2] = color.b;

    // Also displace Y based on scalar
    planePositions.setY(i, Math.sin(distance * 0.1) * 20);
  }

  planeGeometry.setAttribute('color', new THREE.BufferAttribute(planeColors, 3));
  planeGeometry.computeVertexNormals();

  const planeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.y = -50;
  scene.add(plane);

  // Create sphere with cool-to-warm coloring based on Y position
  const sphereGeometry = new THREE.SphereGeometry(40, 32, 24);
  const spherePositions = sphereGeometry.getAttribute('position');
  const sphereColors = new Float32Array(spherePositions.count * 3);

  for (let i = 0; i < spherePositions.count; i++) {
    const y = spherePositions.getY(i);
    const scalar = (y + 40) / 80; // Normalize Y from [-40, 40] to [0, 1]

    const color = lutCooltowarm.getColor(scalar);
    sphereColors[i * 3] = color.r;
    sphereColors[i * 3 + 1] = color.g;
    sphereColors[i * 3 + 2] = color.b;
  }

  sphereGeometry.setAttribute('color', new THREE.BufferAttribute(sphereColors, 3));

  const sphereMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(-100, 50, 0);
  scene.add(sphere);

  // Create torus with blackbody coloring based on angle
  const torusGeometry = new THREE.TorusGeometry(35, 15, 24, 48);
  const torusPositions = torusGeometry.getAttribute('position');
  const torusColors = new Float32Array(torusPositions.count * 3);

  for (let i = 0; i < torusPositions.count; i++) {
    const x = torusPositions.getX(i);
    const z = torusPositions.getZ(i);
    const angle = Math.atan2(z, x);
    const scalar = (angle + Math.PI) / (Math.PI * 2); // Normalize angle to [0, 1]

    const color = lutBlackbody.getColor(scalar);
    torusColors[i * 3] = color.r;
    torusColors[i * 3 + 1] = color.g;
    torusColors[i * 3 + 2] = color.b;
  }

  torusGeometry.setAttribute('color', new THREE.BufferAttribute(torusColors, 3));

  const torusMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(100, 50, 0);
  scene.add(torus);

  // Create knot with rainbow coloring based on vertex index
  const knotGeometry = new THREE.TorusKnotGeometry(25, 8, 100, 16);
  const knotPositions = knotGeometry.getAttribute('position');
  const knotColors = new Float32Array(knotPositions.count * 3);

  for (let i = 0; i < knotPositions.count; i++) {
    const scalar = i / knotPositions.count;
    const color = lutRainbow.getColor(scalar);
    knotColors[i * 3] = color.r;
    knotColors[i * 3 + 1] = color.g;
    knotColors[i * 3 + 2] = color.b;
  }

  knotGeometry.setAttribute('color', new THREE.BufferAttribute(knotColors, 3));

  const knotMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
  const knot = new THREE.Mesh(knotGeometry, knotMaterial);
  knot.position.set(0, 100, 0);
  scene.add(knot);

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

      // Rotate objects
      sphere.rotation.y = time * 0.3;
      torus.rotation.x = time * 0.4;
      torus.rotation.y = time * 0.2;
      knot.rotation.x = time * 0.3;
      knot.rotation.y = time * 0.4;

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
    { title: 'three.js webgl - geometry - colors - lookup table' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - colors - lookup table', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryColorsLookupTable(a, win, { width: WIDTH, height: HEIGHT });
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
