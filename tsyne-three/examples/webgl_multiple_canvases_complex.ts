/**
 * three.js webgl - multiple canvases complex
 *
 * Port of: three/examples/webgl_multiple_canvases_complex.html
 *
 * Tests:
 * - Multiple viewports with different scenes
 * - Complex layout arrangement
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleCanvasesComplexParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleCanvasesComplexDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleCanvasesComplex(
  a: App,
  win: Window,
  params: WebGLMultipleCanvasesComplexParams = {}
): Promise<WebGLMultipleCanvasesComplexDemo> {
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
  // Create multiple scenes
  // ─────────────────────────────────────────────────────────────────────────

  function createScene(bgColor: number, objectType: string, objectColor: number) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    let mesh: any;
    const material = new THREE.MeshPhongMaterial({ color: objectColor, flatShading: true });

    switch (objectType) {
      case 'box':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), material);
        break;
      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(25, 16, 12), material);
        break;
      case 'torus':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(20, 8, 8, 16), material);
        break;
      case 'cone':
        mesh = new THREE.Mesh(new THREE.ConeGeometry(25, 50, 16), material);
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 50, 16), material);
        break;
      case 'knot':
        mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(20, 6, 64, 8), material);
        break;
      default:
        mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), material);
    }

    scene.add(mesh);
    return { scene, mesh };
  }

  // Create different scenes
  const scenes = [
    createScene(0x330000, 'box', 0xff6600),
    createScene(0x003300, 'sphere', 0x00ff66),
    createScene(0x000033, 'torus', 0x6666ff),
    createScene(0x333300, 'cone', 0xffff00),
    createScene(0x330033, 'cylinder', 0xff00ff),
    createScene(0x003333, 'knot', 0x00ffff),
  ];

  // Create cameras
  const cameras: any[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
    camera.position.z = 100;
    cameras.push(camera);
  }

  // Define viewport layout (complex arrangement)
  const viewports = [
    { x: 0, y: 0, w: 0.5, h: 0.5 },           // Top-left (large)
    { x: 0.5, y: 0, w: 0.25, h: 0.25 },       // Top-right small
    { x: 0.75, y: 0, w: 0.25, h: 0.25 },      // Top-right small 2
    { x: 0.5, y: 0.25, w: 0.5, h: 0.25 },     // Middle-right wide
    { x: 0, y: 0.5, w: 0.33, h: 0.5 },        // Bottom-left
    { x: 0.33, y: 0.5, w: 0.67, h: 0.5 },     // Bottom-right (wide)
  ];

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setScissorTest(true);

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

      // Animate each scene's mesh
      scenes.forEach(({ mesh }, i) => {
        mesh.rotation.y = time * (0.5 + i * 0.1);
        mesh.rotation.x = time * (0.3 + i * 0.05);
      });

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render each viewport
      viewports.forEach((vp, i) => {
        const left = Math.floor(vp.x * width);
        const bottom = Math.floor((1 - vp.y - vp.h) * height);
        const w = Math.floor(vp.w * width);
        const h = Math.floor(vp.h * height);

        // Update camera aspect
        cameras[i].aspect = w / h;
        cameras[i].updateProjectionMatrix();

        renderer.setScissor(left, bottom, w, h);
        renderer.setViewport(left, bottom, w, h);
        renderer.render(scenes[i].scene, cameras[i]);
      });

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
    { title: 'three.js webgl - multiple canvases complex' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple canvases complex', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleCanvasesComplex(a, win, { width: WIDTH, height: HEIGHT });
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
