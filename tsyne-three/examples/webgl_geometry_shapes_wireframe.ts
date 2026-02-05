/**
 * three.js webgl - geometry - shapes (wireframe)
 *
 * Based on: three/examples/webgl_geometry_shapes.html
 *
 * Tests:
 * - Shape geometry creation
 * - ShapeGeometry
 * - Various 2D shapes (heart, fish, arc, etc.)
 * - MeshBasicMaterial wireframe
 *
 * Adaptations for Tsyne:
 * - Uses MeshBasicMaterial wireframe (MeshPhongMaterial lighting doesn't work yet)
 * - Removes texture loading
 * - Removes ExtrudeGeometry (requires working depth buffer)
 * - Removes pointer interaction
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryShapesWireframeParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryShapesWireframeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryShapesWireframe(
  a: App,
  win: Window,
  params: WebGLGeometryShapesWireframeParams = {}
): Promise<WebGLGeometryShapesWireframeDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(0, 150, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const group = new THREE.Group();
  group.position.y = 50;
  scene.add(group);

  function addShape(shape: THREE.Shape, color: number, x: number, y: number, z: number, s: number) {
    // Wireframe mesh
    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: color, wireframe: true })
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(s, s, s);
    group.add(mesh);

    // Solid outline from shape points
    shape.autoClose = true;
    const points = shape.getPoints();
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: color })
    );
    line.position.set(x, y, z + 20);
    line.scale.set(s, s, s);
    group.add(line);
  }

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

  addShape(heartShape, 0xff0000, -150, 100, 0, 1);

  // Triangle shape
  const triangleShape = new THREE.Shape()
    .moveTo(80, 20)
    .lineTo(40, 80)
    .lineTo(120, 80)
    .lineTo(80, 20);

  addShape(triangleShape, 0x8080f0, -50, 0, 0, 1);

  // Square shape
  const sqLength = 80;
  const squareShape = new THREE.Shape()
    .moveTo(0, 0)
    .lineTo(0, sqLength)
    .lineTo(sqLength, sqLength)
    .lineTo(sqLength, 0)
    .lineTo(0, 0);

  addShape(squareShape, 0x00ff00, 100, 0, 0, 1);

  // Fish shape
  const fishShape = new THREE.Shape()
    .moveTo(0, 0)
    .quadraticCurveTo(50, -80, 90, -10)
    .quadraticCurveTo(100, -10, 115, -40)
    .quadraticCurveTo(115, 0, 115, 40)
    .quadraticCurveTo(100, 10, 90, 10)
    .quadraticCurveTo(50, 80, 0, 0);

  addShape(fishShape, 0x404040, -150, -100, 0, 0.8);

  // Circle shape (approximated with quadratics)
  const circleRadius = 40;
  const circleShape = new THREE.Shape()
    .moveTo(0, circleRadius)
    .quadraticCurveTo(circleRadius, circleRadius, circleRadius, 0)
    .quadraticCurveTo(circleRadius, -circleRadius, 0, -circleRadius)
    .quadraticCurveTo(-circleRadius, -circleRadius, -circleRadius, 0)
    .quadraticCurveTo(-circleRadius, circleRadius, 0, circleRadius);

  addShape(circleShape, 0x00ffff, 0, -100, 0, 1);

  // Arc with hole (donut)
  const arcShape = new THREE.Shape()
    .moveTo(50, 10)
    .absarc(10, 10, 40, 0, Math.PI * 2, false);

  const holePath = new THREE.Path()
    .moveTo(20, 10)
    .absarc(10, 10, 10, 0, Math.PI * 2, true);

  arcShape.holes.push(holePath);

  addShape(arcShape, 0xff00ff, 100, -100, 0, 1);

  // Rounded rectangle
  const roundedRectShape = new THREE.Shape();
  const rrX = 0, rrY = 0, rrWidth = 50, rrHeight = 50, rrRadius = 10;
  roundedRectShape.moveTo(rrX, rrY + rrRadius);
  roundedRectShape.lineTo(rrX, rrY + rrHeight - rrRadius);
  roundedRectShape.quadraticCurveTo(rrX, rrY + rrHeight, rrX + rrRadius, rrY + rrHeight);
  roundedRectShape.lineTo(rrX + rrWidth - rrRadius, rrY + rrHeight);
  roundedRectShape.quadraticCurveTo(rrX + rrWidth, rrY + rrHeight, rrX + rrWidth, rrY + rrHeight - rrRadius);
  roundedRectShape.lineTo(rrX + rrWidth, rrY + rrRadius);
  roundedRectShape.quadraticCurveTo(rrX + rrWidth, rrY, rrX + rrWidth - rrRadius, rrY);
  roundedRectShape.lineTo(rrX + rrRadius, rrY);
  roundedRectShape.quadraticCurveTo(rrX, rrY, rrX, rrY + rrRadius);

  addShape(roundedRectShape, 0xffff00, 50, 100, 0, 1);

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

      // Rotate the group
      group.rotation.y = time * 0.3;

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
    { title: 'three.js webgl - geometry - shapes (wireframe)' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - shapes (wireframe)', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryShapesWireframe(a, win, { width: WIDTH, height: HEIGHT });
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
