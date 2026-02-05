/**
 * three.js webgl - geometry - lathe
 *
 * Tests:
 * - LatheGeometry
 * - Procedural profile curve generation
 * - MeshBasicMaterial wireframe
 *
 * Creates vase-like shapes using lathe geometry.
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryLatheParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryLatheDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryLathe(
  a: App,
  win: Window,
  params: WebGLGeometryLatheParams = {}
): Promise<WebGLGeometryLatheDemo> {
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
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(0, 0, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Profile curves for different lathe shapes
  function createVaseProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const y = t * 100 - 50;
      // Vase shape: narrow at top and bottom, wide in middle
      const r = 10 + Math.sin(t * Math.PI) * 25 + Math.sin(t * Math.PI * 3) * 5;
      points.push(new THREE.Vector2(r, y));
    }
    return points;
  }

  function createGobletProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < 25; i++) {
      const t = i / 24;
      const y = t * 80 - 40;
      let r: number;
      if (t < 0.2) {
        // Base
        r = 20 - t * 50;
      } else if (t < 0.3) {
        // Stem bottom
        r = 10;
      } else if (t < 0.7) {
        // Stem
        r = 5;
      } else {
        // Cup
        r = 5 + (t - 0.7) * 100;
      }
      points.push(new THREE.Vector2(r, y));
    }
    return points;
  }

  function createBellProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const y = t * 60 - 30;
      // Bell shape: exponential curve
      const r = 5 + Math.pow(t, 2) * 35;
      points.push(new THREE.Vector2(r, y));
    }
    return points;
  }

  function createSphereProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const angle = t * Math.PI;
      const r = Math.sin(angle) * 30;
      const y = Math.cos(angle) * 30;
      points.push(new THREE.Vector2(Math.max(r, 0.1), y));
    }
    return points;
  }

  const profiles = [
    { points: createVaseProfile(), color: 0xff4444, position: new THREE.Vector3(-100, 0, 0) },
    { points: createGobletProfile(), color: 0x44ff44, position: new THREE.Vector3(0, 0, 0) },
    { points: createBellProfile(), color: 0x4444ff, position: new THREE.Vector3(100, 0, 0) },
    { points: createSphereProfile(), color: 0xffff44, position: new THREE.Vector3(-50, -80, 50) },
  ];

  const meshes: THREE.Mesh[] = [];

  for (const profile of profiles) {
    const geometry = new THREE.LatheGeometry(profile.points, 24);
    const material = new THREE.MeshBasicMaterial({
      color: profile.color,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(profile.position);
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Add a partial lathe (not full 360 degrees)
  const partialPoints = createVaseProfile();
  const partialGeometry = new THREE.LatheGeometry(partialPoints, 24, 0, Math.PI);
  const partialMaterial = new THREE.MeshBasicMaterial({
    color: 0xff44ff,
    wireframe: true,
    side: THREE.DoubleSide,
  });
  const partialMesh = new THREE.Mesh(partialGeometry, partialMaterial);
  partialMesh.position.set(50, -80, 50);
  scene.add(partialMesh);
  meshes.push(partialMesh);

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
        meshes[i].rotation.y = time * (0.3 + i * 0.1);
        meshes[i].rotation.x = Math.sin(time * 0.5) * 0.2;
      }

      // Orbit camera
      camera.position.x = Math.cos(time * 0.2) * 300;
      camera.position.z = Math.sin(time * 0.2) * 300;
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
    { title: 'three.js webgl - geometry - lathe' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - lathe', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryLathe(a, win, { width: WIDTH, height: HEIGHT });
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
