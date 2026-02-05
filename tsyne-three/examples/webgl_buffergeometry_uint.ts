/**
 * three.js webgl - buffergeometry uint
 *
 * Port of: three/examples/webgl_buffergeometry_uint.html
 *
 * Tests:
 * - Int16BufferAttribute for normals (normalized)
 * - Uint8BufferAttribute for colors (normalized)
 * - MeshPhongMaterial with vertexColors
 * - Large triangle count (500k triangles)
 * - Fog
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

export interface WebGLBufferGeometryUintParams {
  width?: number;
  height?: number;
  triangleCount?: number;
}

export interface WebGLBufferGeometryUintDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometryUint(
  a: App,
  win: Window,
  params: WebGLBufferGeometryUintParams = {}
): Promise<WebGLBufferGeometryUintDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const triangleCount = params.triangleCount ?? 50000; // Reduced from 500k for performance

  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, { width, height, windowId });

  const camera = new THREE.PerspectiveCamera(27, width / height, 1, 3500);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);

  scene.add(new THREE.AmbientLight(0xcccccc));

  const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 4.5);
  light2.position.set(0, -1, 0);
  scene.add(light2);

  // Create geometry with typed buffer attributes
  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  const color = new THREE.Color();
  const n = 800, n2 = n / 2;
  const d = 12, d2 = d / 2;

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let i = 0; i < triangleCount; i++) {
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

    // Compute flat face normal
    pA.set(ax, ay, az);
    pB.set(bx, by, bz);
    pC.set(cx, cy, cz);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);
    cb.normalize();

    // Store as Int16 (will be normalized)
    const nx = cb.x * 32767;
    const ny = cb.y * 32767;
    const nz = cb.z * 32767;

    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);

    // Colors based on position
    const vx = (x / n) + 0.5;
    const vy = (y / n) + 0.5;
    const vz = (z / n) + 0.5;

    color.setRGB(vx, vy, vz);

    colors.push(color.r * 255, color.g * 255, color.b * 255);
    colors.push(color.r * 255, color.g * 255, color.b * 255);
    colors.push(color.r * 255, color.g * 255, color.b * 255);
  }

  const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
  const normalAttribute = new THREE.Int16BufferAttribute(normals, 3);
  const colorAttribute = new THREE.Uint8BufferAttribute(colors, 3);

  normalAttribute.normalized = true;
  colorAttribute.normalized = true;

  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('normal', normalAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhongMaterial({
    color: 0xd5d5d5,
    specular: 0xffffff,
    shininess: 250,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      mesh.rotation.x = time * 0.25;
      mesh.rotation.y = time * 0.5;

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  animate();

  return {
    stop: () => { running = false; },
    getTime: () => currentTime,
  };
}

async function main() {
  const WIDTH = 800, HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - buffergeometry uint' },
    (a) => {
      a.window({ title: 'three.js webgl - buffergeometry uint', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometryUint(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
