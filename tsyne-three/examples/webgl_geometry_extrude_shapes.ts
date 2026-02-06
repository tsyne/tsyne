/**
 * three.js webgl - geometry - extrude shapes
 *
 * Tests:
 * - ExtrudeGeometry with various 2D shapes
 * - Bevel settings
 * - Extrude depth
 * - Multiple extruded shapes
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryExtrudeShapesParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryExtrudeShapesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryExtrudeShapes(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryExtrudeShapesParams = {}
): Promise<WebGLGeometryExtrudeShapesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  const meshes: THREE.Mesh[] = [];

  // Heart shape
  const heartShape = new THREE.Shape();
  const x = 0, y = 0;
  heartShape.moveTo(x + 5, y + 5);
  heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
  heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
  heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
  heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
  heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
  heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

  const heartExtrudeSettings = {
    depth: 8,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 1,
    bevelThickness: 1,
  };

  const heartGeometry = new THREE.ExtrudeGeometry(heartShape, heartExtrudeSettings);
  const heartMaterial = new THREE.MeshBasicMaterial({ color: 0xff0066, wireframe: true });
  const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
  heartMesh.position.set(-180, 100, 0);
  heartMesh.scale.set(3, 3, 3);
  scene.add(heartMesh);
  meshes.push(heartMesh);

  // Star shape
  const starShape = new THREE.Shape();
  const outerRadius = 20;
  const innerRadius = 10;
  const points = 5;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) {
      starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    } else {
      starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }
  starShape.closePath();

  const starExtrudeSettings = {
    depth: 15,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 2,
    bevelThickness: 2,
  };

  const starGeometry = new THREE.ExtrudeGeometry(starShape, starExtrudeSettings);
  const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  starMesh.position.set(0, 100, 0);
  starMesh.scale.set(2, 2, 2);
  scene.add(starMesh);
  meshes.push(starMesh);

  // Arrow shape
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 30);
  arrowShape.lineTo(15, 10);
  arrowShape.lineTo(7, 10);
  arrowShape.lineTo(7, -20);
  arrowShape.lineTo(-7, -20);
  arrowShape.lineTo(-7, 10);
  arrowShape.lineTo(-15, 10);
  arrowShape.closePath();

  const arrowExtrudeSettings = {
    depth: 10,
    bevelEnabled: false,
  };

  const arrowGeometry = new THREE.ExtrudeGeometry(arrowShape, arrowExtrudeSettings);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true });
  const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrowMesh.position.set(150, 100, 0);
  arrowMesh.scale.set(2, 2, 2);
  scene.add(arrowMesh);
  meshes.push(arrowMesh);

  // Hexagon shape
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    if (i === 0) {
      hexShape.moveTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
    } else {
      hexShape.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
    }
  }
  hexShape.closePath();

  const hexExtrudeSettings = {
    depth: 20,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 3,
    bevelThickness: 3,
  };

  const hexGeometry = new THREE.ExtrudeGeometry(hexShape, hexExtrudeSettings);
  const hexMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff, wireframe: true });
  const hexMesh = new THREE.Mesh(hexGeometry, hexMaterial);
  hexMesh.position.set(-150, -80, 0);
  hexMesh.scale.set(2, 2, 2);
  scene.add(hexMesh);
  meshes.push(hexMesh);

  // Rounded rectangle shape
  const roundedRectShape = new THREE.Shape();
  const rw = 40, rh = 25, rr = 5;
  roundedRectShape.moveTo(-rw / 2 + rr, -rh / 2);
  roundedRectShape.lineTo(rw / 2 - rr, -rh / 2);
  roundedRectShape.quadraticCurveTo(rw / 2, -rh / 2, rw / 2, -rh / 2 + rr);
  roundedRectShape.lineTo(rw / 2, rh / 2 - rr);
  roundedRectShape.quadraticCurveTo(rw / 2, rh / 2, rw / 2 - rr, rh / 2);
  roundedRectShape.lineTo(-rw / 2 + rr, rh / 2);
  roundedRectShape.quadraticCurveTo(-rw / 2, rh / 2, -rw / 2, rh / 2 - rr);
  roundedRectShape.lineTo(-rw / 2, -rh / 2 + rr);
  roundedRectShape.quadraticCurveTo(-rw / 2, -rh / 2, -rw / 2 + rr, -rh / 2);

  const rrExtrudeSettings = {
    depth: 12,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 2,
    bevelThickness: 1,
  };

  const rrGeometry = new THREE.ExtrudeGeometry(roundedRectShape, rrExtrudeSettings);
  const rrMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600, wireframe: true });
  const rrMesh = new THREE.Mesh(rrGeometry, rrMaterial);
  rrMesh.position.set(0, -80, 0);
  rrMesh.scale.set(2, 2, 2);
  scene.add(rrMesh);
  meshes.push(rrMesh);

  // Cross shape
  const crossShape = new THREE.Shape();
  const cw = 8;
  crossShape.moveTo(-cw, -cw * 3);
  crossShape.lineTo(cw, -cw * 3);
  crossShape.lineTo(cw, -cw);
  crossShape.lineTo(cw * 3, -cw);
  crossShape.lineTo(cw * 3, cw);
  crossShape.lineTo(cw, cw);
  crossShape.lineTo(cw, cw * 3);
  crossShape.lineTo(-cw, cw * 3);
  crossShape.lineTo(-cw, cw);
  crossShape.lineTo(-cw * 3, cw);
  crossShape.lineTo(-cw * 3, -cw);
  crossShape.lineTo(-cw, -cw);
  crossShape.closePath();

  const crossExtrudeSettings = {
    depth: 8,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 1,
    bevelThickness: 1,
  };

  const crossGeometry = new THREE.ExtrudeGeometry(crossShape, crossExtrudeSettings);
  const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
  const crossMesh = new THREE.Mesh(crossGeometry, crossMaterial);
  crossMesh.position.set(150, -80, 0);
  crossMesh.scale.set(2, 2, 2);
  scene.add(crossMesh);
  meshes.push(crossMesh);

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
        meshes[i].rotation.y = time * 0.5;
        meshes[i].rotation.x = Math.sin(time * 0.3 + i) * 0.3;
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
    { title: 'three.js webgl - geometry - extrude shapes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - extrude shapes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryExtrudeShapes(a, win, { width: WIDTH, height: HEIGHT });
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
