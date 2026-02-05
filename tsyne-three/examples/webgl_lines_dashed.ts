/**
 * three.js webgl - dashed lines
 *
 * Port of: three/examples/webgl_lines_dashed.html
 *
 * Tests:
 * - LineDashedMaterial
 * - computeLineDistances()
 * - LineSegments with dashed material
 *
 * Adaptations for Tsyne:
 * - Removes external GeometryUtils.hilbert3D
 * - Uses procedural spiral and box geometry
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesDashedParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesDashedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesDashed(
  a: App,
  win: Window,
  params: WebGLLinesDashedParams = {}
): Promise<WebGLLinesDashedDemo> {
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

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 200);
  camera.position.z = 150;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const objects: THREE.Object3D[] = [];

  // Create a spiral with dashed lines
  const spiralPoints: THREE.Vector3[] = [];
  const turns = 5;
  const pointsPerTurn = 50;
  const radius = 30;
  const height2 = 60;

  for (let i = 0; i <= turns * pointsPerTurn; i++) {
    const t = i / pointsPerTurn;
    const angle = t * Math.PI * 2;
    spiralPoints.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      (t / turns) * height2 - height2 / 2,
      Math.sin(angle) * radius
    ));
  }

  const geometrySpiral = new THREE.BufferGeometry().setFromPoints(spiralPoints);
  const lineDashed = new THREE.Line(
    geometrySpiral,
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 2, gapSize: 1 })
  );
  lineDashed.computeLineDistances();
  objects.push(lineDashed);
  scene.add(lineDashed);

  // Create a box wireframe with dashed lines
  function createBoxGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const positions = [
      // Bottom face
      -hw, -hh, -hd, -hw, -hh, hd,
      -hw, -hh, hd, hw, -hh, hd,
      hw, -hh, hd, hw, -hh, -hd,
      hw, -hh, -hd, -hw, -hh, -hd,
      // Top face
      -hw, hh, -hd, -hw, hh, hd,
      -hw, hh, hd, hw, hh, hd,
      hw, hh, hd, hw, hh, -hd,
      hw, hh, -hd, -hw, hh, -hd,
      // Vertical edges
      -hw, -hh, -hd, -hw, hh, -hd,
      hw, -hh, -hd, hw, hh, -hd,
      hw, -hh, hd, hw, hh, hd,
      -hw, -hh, hd, -hw, hh, hd,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  const geometryBox = createBoxGeometry(50, 50, 50);
  const lineSegments = new THREE.LineSegments(
    geometryBox,
    new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 3, gapSize: 1 })
  );
  lineSegments.computeLineDistances();
  objects.push(lineSegments);
  scene.add(lineSegments);

  // Add a second spiral offset
  const spiral2 = lineDashed.clone();
  spiral2.rotation.y = Math.PI;
  (spiral2.material as THREE.LineDashedMaterial).color.setHex(0x00ffff);
  objects.push(spiral2);
  scene.add(spiral2);

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

      // Rotate all objects
      objects.forEach((object) => {
        object.rotation.x = 0.25 * time;
        object.rotation.y = 0.25 * time;
      });

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
    { title: 'three.js webgl - dashed lines' },
    (a) => {
      a.window(
        { title: 'three.js webgl - dashed lines', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesDashed(a, win, { width: WIDTH, height: HEIGHT });
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
