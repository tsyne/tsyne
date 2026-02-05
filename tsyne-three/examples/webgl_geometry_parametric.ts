/**
 * three.js webgl - geometry - parametric surfaces
 *
 * Tests:
 * - ParametricGeometry with custom functions
 * - Klein bottle, Mobius strip, etc.
 * - Mathematical surface visualization
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryParametricParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryParametricDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryParametric(
  a: App,
  win: Window,
  params: WebGLGeometryParametricParams = {}
): Promise<WebGLGeometryParametricDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Parametric surface functions
  // ─────────────────────────────────────────────────────────────────────────

  // Klein Bottle
  const klein = (u: number, v: number, target: THREE.Vector3) => {
    u *= Math.PI;
    v *= 2 * Math.PI;

    u = u * 2;
    let x, z;

    if (u < Math.PI) {
      x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
      z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
    } else {
      x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
      z = -8 * Math.sin(u);
    }

    const y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);

    target.set(x * 5, y * 5, z * 5);
  };

  // Mobius Strip
  const mobius = (u: number, v: number, target: THREE.Vector3) => {
    u = u * Math.PI * 2;
    v = v * 2 - 1;

    const a = 2;
    const x = Math.cos(u) * (a + v * Math.cos(u / 2));
    const y = Math.sin(u) * (a + v * Math.cos(u / 2));
    const z = v * Math.sin(u / 2);

    target.set(x * 20, y * 20, z * 20);
  };

  // Torus
  const torus = (u: number, v: number, target: THREE.Vector3) => {
    u *= Math.PI * 2;
    v *= Math.PI * 2;

    const R = 30;
    const r = 10;

    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const y = (R + r * Math.cos(v)) * Math.sin(u);
    const z = r * Math.sin(v);

    target.set(x, y, z);
  };

  // Helicoid
  const helicoid = (u: number, v: number, target: THREE.Vector3) => {
    u = u * 4 - 2;
    v = v * Math.PI * 4;

    const x = u * Math.cos(v);
    const y = u * Math.sin(v);
    const z = v * 2;

    target.set(x * 15, z * 3, y * 15);
  };

  // Catenoid
  const catenoid = (u: number, v: number, target: THREE.Vector3) => {
    u = u * 2 - 1;
    v = v * Math.PI * 2;

    const a = 1;
    const c = 10;

    const x = c * Math.cosh(u / c) * Math.cos(v);
    const y = c * Math.cosh(u / c) * Math.sin(v);
    const z = u * c;

    target.set(x * 3, z * 3, y * 3);
  };

  // Enneper Surface
  const enneper = (u: number, v: number, target: THREE.Vector3) => {
    u = u * 2 - 1;
    v = v * 2 - 1;

    const x = u - u * u * u / 3 + u * v * v;
    const y = v - v * v * v / 3 + v * u * u;
    const z = u * u - v * v;

    target.set(x * 30, z * 15, y * 30);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const meshes: THREE.Mesh[] = [];

  // Klein Bottle
  const kleinGeometry = new ParametricGeometry(klein, 25, 25);
  const kleinMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true });
  const kleinMesh = new THREE.Mesh(kleinGeometry, kleinMaterial);
  kleinMesh.position.set(-150, 80, 0);
  kleinMesh.scale.set(0.8, 0.8, 0.8);
  scene.add(kleinMesh);
  meshes.push(kleinMesh);

  // Mobius Strip
  const mobiusGeometry = new ParametricGeometry(mobius, 30, 10);
  const mobiusMaterial = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true });
  const mobiusMesh = new THREE.Mesh(mobiusGeometry, mobiusMaterial);
  mobiusMesh.position.set(0, 80, 0);
  scene.add(mobiusMesh);
  meshes.push(mobiusMesh);

  // Torus
  const torusGeometry = new ParametricGeometry(torus, 30, 20);
  const torusMaterial = new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true });
  const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
  torusMesh.position.set(150, 80, 0);
  scene.add(torusMesh);
  meshes.push(torusMesh);

  // Helicoid
  const helicoidGeometry = new ParametricGeometry(helicoid, 20, 40);
  const helicoidMaterial = new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true });
  const helicoidMesh = new THREE.Mesh(helicoidGeometry, helicoidMaterial);
  helicoidMesh.position.set(-150, -70, 0);
  scene.add(helicoidMesh);
  meshes.push(helicoidMesh);

  // Catenoid
  const catenoidGeometry = new ParametricGeometry(catenoid, 20, 30);
  const catenoidMaterial = new THREE.MeshBasicMaterial({ color: 0xdcd6f7, wireframe: true });
  const catenoidMesh = new THREE.Mesh(catenoidGeometry, catenoidMaterial);
  catenoidMesh.position.set(0, -70, 0);
  scene.add(catenoidMesh);
  meshes.push(catenoidMesh);

  // Enneper Surface
  const enneperGeometry = new ParametricGeometry(enneper, 30, 30);
  const enneperMaterial = new THREE.MeshBasicMaterial({ color: 0xf38181, wireframe: true });
  const enneperMesh = new THREE.Mesh(enneperGeometry, enneperMaterial);
  enneperMesh.position.set(150, -70, 0);
  scene.add(enneperMesh);
  meshes.push(enneperMesh);

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

      // Rotate all meshes
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].rotation.x = time * 0.3 + i * 0.5;
        meshes[i].rotation.y = time * 0.4 + i * 0.3;
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
    { title: 'three.js webgl - geometry - parametric surfaces' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - parametric surfaces', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryParametric(a, win, { width: WIDTH, height: HEIGHT });
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
