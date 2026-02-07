/**
 * three.js webgl - interactive - voxel painter
 *
 * Port of: three/examples/webgl_interactive_voxelpainter.html
 *
 * Tests:
 * - BoxGeometry
 * - MeshLambertMaterial with texture map
 * - MeshBasicMaterial with transparency
 * - GridHelper
 * - PlaneGeometry
 * - AmbientLight + DirectionalLight
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend
 * - Mouse interaction is replaced with pre-placed voxels in an
 *   interesting pattern (stairs + small structure)
 * - Rollover ghost cube is positioned visibly on the grid
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveVoxelpainterParams {
  width?: number;
  height?: number;
}

export interface WebGLInteractiveVoxelpainterDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Interactive Voxelpainter demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLInteractiveVoxelpainter(
  a: App,
  win: ITsyneWindow,
  params: WebGLInteractiveVoxelpainterParams = {}
): Promise<WebGLInteractiveVoxelpainterDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.set(500, 800, 1300);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Roll-over helper (ghost cube)
  const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
  const rollOverMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true,
  });
  const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  // Position the ghost cube visibly on the grid
  rollOverMesh.position.set(175, 25, 75);
  scene.add(rollOverMesh);

  // Cubes - load the square-outline-textured texture
  const texturePath = path.resolve(
    __dirname,
    '../../three/examples/textures/square-outline-textured.png'
  );
  console.log('[webgl_interactive_voxelpainter] Loading texture from:', texturePath);

  const map = await loadTexture(THREE, texturePath);
  map.colorSpace = THREE.SRGBColorSpace;

  const cubeGeo = new THREE.BoxGeometry(50, 50, 50);
  const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, map: map });

  // Grid
  const gridHelper = new THREE.GridHelper(1000, 20);
  scene.add(gridHelper);

  // Ground plane (invisible, used for raycasting in the original)
  const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
  planeGeometry.rotateX(-Math.PI / 2);
  const plane = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(plane);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x606060, 3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Pre-place voxels in an interesting pattern
  // Since we cannot use mouse interaction, we build a small structure:
  // - A staircase
  // - A small wall/tower
  // ─────────────────────────────────────────────────────────────────────────

  function placeVoxel(x: number, y: number, z: number): void {
    const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
    // Snap to grid: position is center of 50x50x50 cube
    voxel.position.set(x * 50 + 25, y * 50 + 25, z * 50 + 25);
    scene.add(voxel);
  }

  // Staircase (ascending in +x direction)
  for (let step = 0; step < 6; step++) {
    // Each step is one cube wide, placed at increasing height
    for (let depth = 0; depth < 2; depth++) {
      placeVoxel(step - 3, step, depth - 4);
    }
  }

  // Small wall behind the stairs
  for (let wx = -3; wx <= 2; wx++) {
    for (let wy = 0; wy < 4; wy++) {
      placeVoxel(wx, wy, -5);
    }
  }

  // Tower on the right side
  for (let ty = 0; ty < 7; ty++) {
    placeVoxel(4, ty, -3);
    placeVoxel(4, ty, -2);
    placeVoxel(5, ty, -3);
    placeVoxel(5, ty, -2);
  }

  // Floor platform in front
  for (let fx = -4; fx <= 3; fx++) {
    for (let fz = -1; fz <= 2; fz++) {
      placeVoxel(fx, 0, fz);
    }
  }

  // A few accent cubes on top of the platform
  placeVoxel(-2, 1, 0);
  placeVoxel(-2, 1, 1);
  placeVoxel(-1, 1, 0);
  placeVoxel(-1, 1, 1);
  placeVoxel(-2, 2, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop (static scene, but we keep rendering for screenshots)
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;

  const animate = async () => {
    while (running) {
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
    { title: 'three.js webgl - interactive - voxel painter' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - interactive - voxel painter',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveVoxelpainter(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
