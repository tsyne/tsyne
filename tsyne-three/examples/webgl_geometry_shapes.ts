/**
 * three.js webgl - geometry shapes
 *
 * Tests:
 * - ShapeGeometry for 2D shapes extruded to 3D
 * - Path-based shape creation
 * - Multiple shapes with different profiles
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryShapesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryShapesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryShapes(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryShapesParams = {}
): Promise<WebGLGeometryShapesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222244);

  // Create various shapes
  const shapes: THREE.Mesh[] = [];

  // Heart shape
  const heartShape = new THREE.Shape();
  const x = 0, y = 0;
  heartShape.moveTo(x + 25, y + 25);
  heartShape.bezierCurveTo(x + 25, y + 25, x + 20, y, x, y);
  heartShape.bezierCurveTo(x - 30, y, x - 30, y + 35, x - 30, y + 35);
  heartShape.bezierCurveTo(x - 30, y + 55, x - 10, y + 77, x + 25, y + 95);
  heartShape.bezierCurveTo(x + 60, y + 77, x + 80, y + 55, x + 80, y + 35);
  heartShape.bezierCurveTo(x + 80, y + 35, x + 80, y, x + 50, y);
  heartShape.bezierCurveTo(x + 35, y, x + 25, y + 25, x + 25, y + 25);

  const heartGeometry = new THREE.ShapeGeometry(heartShape);
  const heartMaterial = new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true });
  const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
  heartMesh.position.set(-200, 50, 0);
  heartMesh.scale.set(0.8, 0.8, 0.8);
  scene.add(heartMesh);
  shapes.push(heartMesh);

  // Star shape
  const starShape = new THREE.Shape();
  const outerRadius = 50;
  const innerRadius = 25;
  const numPoints = 5;

  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) {
      starShape.moveTo(px, py);
    } else {
      starShape.lineTo(px, py);
    }
  }
  starShape.closePath();

  const starGeometry = new THREE.ShapeGeometry(starShape);
  const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true });
  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  starMesh.position.set(0, 50, 0);
  scene.add(starMesh);
  shapes.push(starMesh);

  // Rounded rectangle
  const roundedRectShape = new THREE.Shape();
  const rectWidth = 80, rectHeight = 60, radius = 15;
  roundedRectShape.moveTo(-rectWidth / 2 + radius, -rectHeight / 2);
  roundedRectShape.lineTo(rectWidth / 2 - radius, -rectHeight / 2);
  roundedRectShape.quadraticCurveTo(rectWidth / 2, -rectHeight / 2, rectWidth / 2, -rectHeight / 2 + radius);
  roundedRectShape.lineTo(rectWidth / 2, rectHeight / 2 - radius);
  roundedRectShape.quadraticCurveTo(rectWidth / 2, rectHeight / 2, rectWidth / 2 - radius, rectHeight / 2);
  roundedRectShape.lineTo(-rectWidth / 2 + radius, rectHeight / 2);
  roundedRectShape.quadraticCurveTo(-rectWidth / 2, rectHeight / 2, -rectWidth / 2, rectHeight / 2 - radius);
  roundedRectShape.lineTo(-rectWidth / 2, -rectHeight / 2 + radius);
  roundedRectShape.quadraticCurveTo(-rectWidth / 2, -rectHeight / 2, -rectWidth / 2 + radius, -rectHeight / 2);

  const roundedRectGeometry = new THREE.ShapeGeometry(roundedRectShape);
  const roundedRectMaterial = new THREE.MeshBasicMaterial({ color: 0x00ccff, wireframe: true });
  const roundedRectMesh = new THREE.Mesh(roundedRectGeometry, roundedRectMaterial);
  roundedRectMesh.position.set(200, 50, 0);
  scene.add(roundedRectMesh);
  shapes.push(roundedRectMesh);

  // Arrow shape
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 40);
  arrowShape.lineTo(30, 0);
  arrowShape.lineTo(15, 0);
  arrowShape.lineTo(15, -40);
  arrowShape.lineTo(-15, -40);
  arrowShape.lineTo(-15, 0);
  arrowShape.lineTo(-30, 0);
  arrowShape.closePath();

  const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true });
  const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrowMesh.position.set(-100, -80, 0);
  scene.add(arrowMesh);
  shapes.push(arrowMesh);

  // Fish shape
  const fishShape = new THREE.Shape();
  fishShape.moveTo(60, 0);
  fishShape.quadraticCurveTo(40, 30, 0, 20);
  fishShape.quadraticCurveTo(-30, 15, -40, 0);
  fishShape.lineTo(-60, 20);
  fishShape.lineTo(-60, -20);
  fishShape.lineTo(-40, 0);
  fishShape.quadraticCurveTo(-30, -15, 0, -20);
  fishShape.quadraticCurveTo(40, -30, 60, 0);

  const fishGeometry = new THREE.ShapeGeometry(fishShape);
  const fishMaterial = new THREE.MeshBasicMaterial({ color: 0xff9933, wireframe: true });
  const fishMesh = new THREE.Mesh(fishGeometry, fishMaterial);
  fishMesh.position.set(100, -80, 0);
  scene.add(fishMesh);
  shapes.push(fishMesh);

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

      // Rotate shapes
      for (let i = 0; i < shapes.length; i++) {
        shapes[i].rotation.z = Math.sin(time + i) * 0.3;
        shapes[i].rotation.y = time * 0.5;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 400;
      camera.position.z = Math.cos(time * 0.3) * 400;
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
    { title: 'three.js webgl - geometry shapes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry shapes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryShapes(a, win, { width: WIDTH, height: HEIGHT });
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
