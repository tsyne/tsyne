/**
 * three.js webgl - buffergeometry
 *
 * Port of the canonical three.js example: three/examples/webgl_buffergeometry.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Removes Stats (fps counter) as it requires DOM
 * - Removes fog (simplify for initial port)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryParams {
  width?: number;
  height?: number;
  triangles?: number;
}

export interface WebGLBufferGeometryDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL BufferGeometry demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height, triangles)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLBufferGeometry(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryParams = {}
): Promise<WebGLBufferGeometryDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const triangleCount = params.triangles ?? 160000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(27, width / height, 1, 3500);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  // Note: fog removed for simplicity

  // Lights
  scene.add(new THREE.AmbientLight(0xcccccc));

  const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 4.5);
  light2.position.set(0, -1, 0);
  scene.add(light2);

  // Generate triangle geometry
  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  const color = new THREE.Color();

  const n = 800,
    n2 = n / 2; // triangles spread in the cube
  const d = 12,
    d2 = d / 2; // individual triangle size

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();

  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let i = 0; i < triangleCount; i++) {
    // positions
    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    const ax = x + Math.random() * d - d2;
    const ay = y + Math.random() * d - d2;
    const az = z + Math.random() * d - d2;

    const bx = x + Math.random() * d - d2;
    const by = y + Math.random() * d - d2;
    const bz = z + Math.random() * d - d2;

    const cx = x + Math.random() * d - d2;
    const cy = y + Math.random() * d - d2;
    const cz = z + Math.random() * d - d2;

    positions.push(ax, ay, az);
    positions.push(bx, by, bz);
    positions.push(cx, cy, cz);

    // flat face normals
    pA.set(ax, ay, az);
    pB.set(bx, by, bz);
    pC.set(cx, cy, cz);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);

    cb.normalize();

    const nx = cb.x;
    const ny = cb.y;
    const nz = cb.z;

    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);

    // colors
    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz);

    const alpha = Math.random();

    colors.push(color.r, color.g, color.b, alpha);
    colors.push(color.r, color.g, color.b, alpha);
    colors.push(color.r, color.g, color.b, alpha);
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));

  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhongMaterial({
    color: 0xd5d5d5,
    specular: 0xffffff,
    shininess: 250,
    side: THREE.DoubleSide,
    vertexColors: true,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1); // No window.devicePixelRatio in Node
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;

      mesh.rotation.x = time * 0.25;
      mesh.rotation.y = time * 0.5;

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
    { title: 'three.js webgl - buffergeometry' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLBufferGeometry(a, win, { width: WIDTH, height: HEIGHT });
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
