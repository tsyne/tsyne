/**
 * Minimal flicker test - steps of elimination
 *
 * Tests isolated features to find what causes flickering:
 * 1. Single mesh + DataTexture map (no BackSide, no multi-material)
 * 2. Single mesh + DataTexture map + BackSide
 * 3. Multi-material mesh (2 materials, different DataTextures)
 * 4. Multi-material mesh + BackSide (panorama cube scenario)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

export interface FlickerTestParams {
  width?: number;
  height?: number;
  testCase?: number; // 1-4
}

export interface FlickerTestDemo {
  stop: () => void;
  getTime: () => number;
}

function createDataTexture(THREE: any, r: number, g: number, b: number): any {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Solid color with a diagonal stripe pattern
      const stripe = ((x + y) % 16 < 4) ? 1.0 : 0.7;
      data[i] = Math.floor(r * stripe * 255);
      data[i + 1] = Math.floor(g * stripe * 255);
      data[i + 2] = Math.floor(b * stripe * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export async function buildFlickerTest(
  a: App,
  win: ITsyneWindow,
  params: FlickerTestParams = {}
): Promise<FlickerTestDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const testCase = params.testCase ?? 1;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 3;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  if (testCase === 1) {
    // TEST 1: Single mesh + DataTexture map (front face)
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: createDataTexture(THREE, 0, 1, 0), // green
    });
    scene.add(new THREE.Mesh(geo, mat));

  } else if (testCase === 5) {
    // TEST 5: Single mesh WITHOUT texture (solid color) — control test
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    scene.add(new THREE.Mesh(geo, mat));

  } else if (testCase === 6) {
    // TEST 6: Same as TC1 but NO animation — render once then stop
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: createDataTexture(THREE, 0, 1, 0), // green
    });
    scene.add(new THREE.Mesh(geo, mat));

  } else if (testCase === 2) {
    // TEST 2: Single mesh + DataTexture map + BackSide
    const geo = new THREE.BoxGeometry(10, 10, 10);
    const mat = new THREE.MeshBasicMaterial({
      map: createDataTexture(THREE, 0, 1, 0), // green
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(geo, mat));

  } else if (testCase === 3) {
    // TEST 3: Multi-material (2 separate meshes, different textures)
    const geo1 = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat1 = new THREE.MeshBasicMaterial({
      map: createDataTexture(THREE, 1, 0, 0), // red
    });
    const mesh1 = new THREE.Mesh(geo1, mat1);
    mesh1.position.x = -1.2;
    scene.add(mesh1);

    const geo2 = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat2 = new THREE.MeshBasicMaterial({
      map: createDataTexture(THREE, 0, 0, 1), // blue
    });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    mesh2.position.x = 1.2;
    scene.add(mesh2);

  } else if (testCase === 4) {
    // TEST 4: Multi-material array on single mesh (panorama cube pattern)
    const geo = new THREE.BoxGeometry(10, 10, 10);
    const materials = [
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 1, 0, 0), side: THREE.BackSide }), // red
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 0, 1, 0), side: THREE.BackSide }), // green
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 0, 0, 1), side: THREE.BackSide }), // blue
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 1, 1, 0), side: THREE.BackSide }), // yellow
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 1, 0, 1), side: THREE.BackSide }), // magenta
      new THREE.MeshBasicMaterial({ map: createDataTexture(THREE, 0, 1, 1), side: THREE.BackSide }), // cyan
    ];
    scene.add(new THREE.Mesh(geo, materials));
  }

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    // TC6: render once and stop (no animation)
    if (testCase === 6) {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }
      return;
    }

    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Slowly rotate camera for test cases 1-5
      if (testCase <= 3 || testCase === 5) {
        camera.position.x = Math.sin(time * 0.5) * 3;
        camera.position.z = Math.cos(time * 0.5) * 3;
        camera.lookAt(0, 0, 0);
      } else {
        // For test case 4 (inside skybox), rotate view
        const theta = THREE.MathUtils.degToRad(time * 30);
        const target = new THREE.Vector3(
          Math.sin(theta),
          0,
          Math.cos(theta)
        );
        camera.lookAt(target);
      }

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
    stop: () => { running = false; },
    getTime: () => currentTime,
  };
}

// Standalone runner
async function main() {
  const testCase = parseInt(process.argv[2] || '1', 10);
  console.log(`Running flicker test case ${testCase}`);

  const appInstance = app(
    resolveTransport(),
    { title: `Flicker Test ${testCase}` },
    (a) => {
      a.window(
        { title: `Flicker Test ${testCase}`, width: 800, height: 600 },
        (win) => {
          win.setContent(() => { a.label('Initializing...'); });
          win.show();
          setTimeout(async () => {
            await buildFlickerTest(a, win, { testCase });
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
