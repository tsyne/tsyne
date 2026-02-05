/**
 * three.js webgl - materials variations lambert
 *
 * Port of: three/examples/webgl_materials_variations_lambert.html
 *
 * Tests:
 * - MeshLambertMaterial variations
 * - Emissive, reflectivity, flatShading
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsVariationsLambertParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsVariationsLambertDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsVariationsLambert(
  a: App,
  win: Window,
  params: WebGLMaterialsVariationsLambertParams = {}
): Promise<WebGLMaterialsVariationsLambertDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff4444, 1, 500);
  pointLight.position.set(-100, 100, 100);
  scene.add(pointLight);

  const geometry = new THREE.SphereGeometry(50, 32, 16);
  const meshes: any[] = [];

  // Row 1: Different colors with Lambert
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshLambertMaterial({ color: colors[i] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 150;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 2: Different emissive colors
  const emissiveColors = [0x330000, 0x003300, 0x000033, 0x333300, 0x330033];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshLambertMaterial({
      color: 0x888888,
      emissive: emissiveColors[i],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = 0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Row 3: Flat shading and opacity variations
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(i / 5, 0.8, 0.5),
      flatShading: i % 2 === 0,
      transparent: i > 2,
      opacity: i > 2 ? 0.6 : 1.0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 120;
    mesh.position.y = -150;
    scene.add(mesh);
    meshes.push(mesh);
  }

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate point light
      pointLight.position.x = Math.sin(time) * 200;
      pointLight.position.z = Math.cos(time) * 200;

      meshes.forEach((mesh) => {
        mesh.rotation.y = time * 0.3;
        mesh.rotation.x = time * 0.15;
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
    { title: 'three.js webgl - materials variations lambert' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials variations lambert', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsVariationsLambert(a, win, { width: WIDTH, height: HEIGHT });
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
