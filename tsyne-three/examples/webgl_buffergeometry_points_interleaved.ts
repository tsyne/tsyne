/**
 * three.js webgl - buffergeometry points interleaved
 *
 * Port of: three/examples/webgl_buffergeometry_points_interleaved.html
 *
 * Tests:
 * - InterleavedBuffer for packed vertex data
 * - InterleavedBufferAttribute for position and color
 * - Mixed Float32 and Uint8 data in single buffer
 * - PointsMaterial with vertexColors
 * - Large particle count
 * - Fog
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

export interface WebGLBufferGeometryPointsInterleavedParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLBufferGeometryPointsInterleavedDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometryPointsInterleaved(
  a: App,
  win: Window,
  params: WebGLBufferGeometryPointsInterleavedParams = {}
): Promise<WebGLBufferGeometryPointsInterleavedDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const particleCount = params.particleCount ?? 100000; // Reduced from 500k

  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, { width, height, windowId });

  const camera = new THREE.PerspectiveCamera(27, width / height, 5, 3500);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);

  const geometry = new THREE.BufferGeometry();

  // Create a generic buffer of binary data (16 bytes per particle)
  // Layout: [x, y, z (12 bytes as float32)] [r, g, b, a (4 bytes as uint8)]
  const arrayBuffer = new ArrayBuffer(particleCount * 16);

  const interleavedFloat32Buffer = new Float32Array(arrayBuffer);
  const interleavedUint8Buffer = new Uint8Array(arrayBuffer);

  const color = new THREE.Color();
  const n = 1000, n2 = n / 2;

  for (let i = 0; i < interleavedFloat32Buffer.length; i += 4) {
    // Position (first 12 bytes)
    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    interleavedFloat32Buffer[i + 0] = x;
    interleavedFloat32Buffer[i + 1] = y;
    interleavedFloat32Buffer[i + 2] = z;

    // Color (last 4 bytes) - stored in the 4th float's bytes
    const vx = (x / n) + 0.5;
    const vy = (y / n) + 0.5;
    const vz = (z / n) + 0.5;

    color.setRGB(vx, vy, vz);

    const j = (i + 3) * 4;
    interleavedUint8Buffer[j + 0] = color.r * 255;
    interleavedUint8Buffer[j + 1] = color.g * 255;
    interleavedUint8Buffer[j + 2] = color.b * 255;
    interleavedUint8Buffer[j + 3] = 0;
  }

  const interleavedBuffer32 = new THREE.InterleavedBuffer(interleavedFloat32Buffer, 4);
  const interleavedBuffer8 = new THREE.InterleavedBuffer(interleavedUint8Buffer, 16);

  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleavedBuffer32, 3, 0, false));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(interleavedBuffer8, 3, 12, true));

  const material = new THREE.PointsMaterial({ size: 15, vertexColors: true });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

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

      points.rotation.x = time * 0.25;
      points.rotation.y = time * 0.5;

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
    { title: 'three.js webgl - buffergeometry points interleaved' },
    (a) => {
      a.window({ title: 'three.js webgl - buffergeometry points interleaved', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometryPointsInterleaved(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
