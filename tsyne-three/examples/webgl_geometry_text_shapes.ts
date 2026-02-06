/**
 * three.js webgl - geometry - text shapes
 *
 * Tests:
 * - Text as Shape geometry (no font loading)
 * - ExtrudeGeometry for 3D text
 * - Multiple letter shapes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTextShapesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTextShapesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryTextShapes(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryTextShapesParams = {}
): Promise<WebGLGeometryTextShapesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Letter shape definitions (simple block letters)
  // ─────────────────────────────────────────────────────────────────────────

  const createLetterT = (scale: number = 1): THREE.Shape => {
    const shape = new THREE.Shape();
    // T shape
    shape.moveTo(-15 * scale, 20 * scale);
    shape.lineTo(15 * scale, 20 * scale);
    shape.lineTo(15 * scale, 15 * scale);
    shape.lineTo(3 * scale, 15 * scale);
    shape.lineTo(3 * scale, -20 * scale);
    shape.lineTo(-3 * scale, -20 * scale);
    shape.lineTo(-3 * scale, 15 * scale);
    shape.lineTo(-15 * scale, 15 * scale);
    shape.closePath();
    return shape;
  };

  const createLetterS = (scale: number = 1): THREE.Shape => {
    const shape = new THREE.Shape();
    // S shape (simplified)
    shape.moveTo(12 * scale, 20 * scale);
    shape.lineTo(-10 * scale, 20 * scale);
    shape.lineTo(-12 * scale, 18 * scale);
    shape.lineTo(-12 * scale, 8 * scale);
    shape.lineTo(-10 * scale, 5 * scale);
    shape.lineTo(8 * scale, 5 * scale);
    shape.lineTo(10 * scale, 3 * scale);
    shape.lineTo(10 * scale, -15 * scale);
    shape.lineTo(8 * scale, -18 * scale);
    shape.lineTo(-12 * scale, -18 * scale);
    shape.lineTo(-12 * scale, -13 * scale);
    shape.lineTo(5 * scale, -13 * scale);
    shape.lineTo(5 * scale, -2 * scale);
    shape.lineTo(-7 * scale, -2 * scale);
    shape.lineTo(-7 * scale, 10 * scale);
    shape.lineTo(-7 * scale, 15 * scale);
    shape.lineTo(12 * scale, 15 * scale);
    shape.closePath();
    return shape;
  };

  const createLetterY = (scale: number = 1): THREE.Shape => {
    const shape = new THREE.Shape();
    // Y shape
    shape.moveTo(-15 * scale, 20 * scale);
    shape.lineTo(-10 * scale, 20 * scale);
    shape.lineTo(0 * scale, 5 * scale);
    shape.lineTo(10 * scale, 20 * scale);
    shape.lineTo(15 * scale, 20 * scale);
    shape.lineTo(3 * scale, 0 * scale);
    shape.lineTo(3 * scale, -20 * scale);
    shape.lineTo(-3 * scale, -20 * scale);
    shape.lineTo(-3 * scale, 0 * scale);
    shape.closePath();
    return shape;
  };

  const createLetterN = (scale: number = 1): THREE.Shape => {
    const shape = new THREE.Shape();
    // N shape
    shape.moveTo(-12 * scale, -20 * scale);
    shape.lineTo(-12 * scale, 20 * scale);
    shape.lineTo(-6 * scale, 20 * scale);
    shape.lineTo(-6 * scale, -5 * scale);
    shape.lineTo(6 * scale, 20 * scale);
    shape.lineTo(12 * scale, 20 * scale);
    shape.lineTo(12 * scale, -20 * scale);
    shape.lineTo(6 * scale, -20 * scale);
    shape.lineTo(6 * scale, 5 * scale);
    shape.lineTo(-6 * scale, -20 * scale);
    shape.closePath();
    return shape;
  };

  const createLetterE = (scale: number = 1): THREE.Shape => {
    const shape = new THREE.Shape();
    // E shape
    shape.moveTo(-10 * scale, -20 * scale);
    shape.lineTo(-10 * scale, 20 * scale);
    shape.lineTo(12 * scale, 20 * scale);
    shape.lineTo(12 * scale, 15 * scale);
    shape.lineTo(-4 * scale, 15 * scale);
    shape.lineTo(-4 * scale, 3 * scale);
    shape.lineTo(8 * scale, 3 * scale);
    shape.lineTo(8 * scale, -2 * scale);
    shape.lineTo(-4 * scale, -2 * scale);
    shape.lineTo(-4 * scale, -15 * scale);
    shape.lineTo(12 * scale, -15 * scale);
    shape.lineTo(12 * scale, -20 * scale);
    shape.closePath();
    return shape;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16213e);

  const meshes: THREE.Mesh[] = [];

  const extrudeSettings = {
    depth: 15,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 1,
    bevelSegments: 2,
  };

  const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xdcd6f7];
  const letters = [
    createLetterT(1.5),
    createLetterS(1.5),
    createLetterY(1.5),
    createLetterN(1.5),
    createLetterE(1.5),
  ];

  // Create "TSYNE" text
  for (let i = 0; i < letters.length; i++) {
    const geometry = new THREE.ExtrudeGeometry(letters[i], extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ color: colors[i], wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 70;
    mesh.position.z = -10;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Add flat versions below
  for (let i = 0; i < letters.length; i++) {
    const geometry = new THREE.ShapeGeometry(letters[i]);
    const material = new THREE.MeshBasicMaterial({
      color: colors[i],
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (i - 2) * 70;
    mesh.position.y = -100;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // Add outline versions
  for (let i = 0; i < letters.length; i++) {
    const points = letters[i].getPoints(30);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.LineLoop(geometry, material);
    line.position.x = (i - 2) * 70;
    line.position.y = 100;
    scene.add(line);
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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Animate extruded letters
      for (let i = 0; i < 5; i++) {
        meshes[i].rotation.y = Math.sin(time * 0.5 + i * 0.3) * 0.5;
        meshes[i].rotation.x = Math.sin(time * 0.3 + i * 0.2) * 0.2;
        meshes[i].position.z = -10 + Math.sin(time + i) * 20;
      }

      // Animate flat letters
      for (let i = 5; i < 10; i++) {
        meshes[i].rotation.z = time * 0.2 + (i - 5) * 0.5;
        meshes[i].scale.setScalar(1 + Math.sin(time * 2 + i) * 0.1);
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
    { title: 'three.js webgl - geometry - text shapes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - text shapes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryTextShapes(a, win, { width: WIDTH, height: HEIGHT });
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
