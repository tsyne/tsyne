/**
 * three.js webgl - instancing (single box), interleaved buffers
 *
 * Port of the three.js example: three/examples/webgl_buffergeometry_instancing_interleaved.html
 *
 * Demonstrates:
 * - InterleavedBuffer for efficient vertex data storage (positions + UVs)
 * - InterleavedBufferAttribute for accessing interleaved data
 * - InstancedMesh with 5000 instances
 * - Per-instance matrix updates with quaternion rotation
 * - Texture mapping with MeshBasicMaterial
 *
 * NOTE: This example currently has rendering issues due to incomplete InterleavedBuffer
 * support in the Tsyne bridge. The glVertexAttribPointer handler in handlers_gl.go
 * does not extract or forward stride/offset parameters, which are essential for
 * interleaved buffer layouts. When this is fixed, the example should work correctly.
 *
 * TODO: Add stride/offset support to glVertexAttribPointer in core/bridge/handlers_gl.go
 * and shader_painter.go.txt to properly handle interleaved vertex attributes.
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryInstancingInterleavedParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryInstancingInterleavedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL BufferGeometry Instancing Interleaved demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLBufferGeometryInstancingInterleaved(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryInstancingInterleavedParams = {}
): Promise<WebGLBufferGeometryInstancingInterleavedDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const instances = 5000;
  let lastTime = 0;

  const moveQ = new THREE.Quaternion(0.5, 0.5, 0.5, 0.0).normalize();
  const tmpQ = new THREE.Quaternion();
  const tmpM = new THREE.Matrix4();
  const currentM = new THREE.Matrix4();

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  // Camera at origin (0,0,0) - inside the cloud of boxes like the original

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry with InterleavedBuffer
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.InstancedBufferGeometry();

  // Per mesh data x,y,z,w,u,v,s,t for 4-element alignment
  // Only use x,y,z and u,v; but x, y, z, nx, ny, nz, u, v would be a good layout
  const vertexBuffer = new THREE.InterleavedBuffer(
    new Float32Array([
      // Front
      -1, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 1, 0, 1, 0, 0, 0,
      -1, -1, 1, 0, 0, 1, 0, 0,
      1, -1, 1, 0, 1, 1, 0, 0,
      // Back
      1, 1, -1, 0, 1, 0, 0, 0,
      -1, 1, -1, 0, 0, 0, 0, 0,
      1, -1, -1, 0, 1, 1, 0, 0,
      -1, -1, -1, 0, 0, 1, 0, 0,
      // Left
      -1, 1, -1, 0, 1, 1, 0, 0,
      -1, 1, 1, 0, 1, 0, 0, 0,
      -1, -1, -1, 0, 0, 1, 0, 0,
      -1, -1, 1, 0, 0, 0, 0, 0,
      // Right
      1, 1, 1, 0, 1, 0, 0, 0,
      1, 1, -1, 0, 1, 1, 0, 0,
      1, -1, 1, 0, 0, 0, 0, 0,
      1, -1, -1, 0, 0, 1, 0, 0,
      // Top
      -1, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 1, 0, 1, 0, 0, 0,
      -1, 1, -1, 0, 0, 1, 0, 0,
      1, 1, -1, 0, 1, 1, 0, 0,
      // Bottom
      1, -1, 1, 0, 1, 0, 0, 0,
      -1, -1, 1, 0, 0, 0, 0, 0,
      1, -1, -1, 0, 1, 1, 0, 0,
      -1, -1, -1, 0, 0, 1, 0, 0,
    ]),
    8
  );

  // Use vertexBuffer, starting at offset 0, 3 items in position attribute
  const positions = new THREE.InterleavedBufferAttribute(vertexBuffer, 3, 0);
  geometry.setAttribute('position', positions);

  // Use vertexBuffer, starting at offset 4, 2 items in uv attribute
  const uvs = new THREE.InterleavedBufferAttribute(vertexBuffer, 2, 4);
  geometry.setAttribute('uv', uvs);

  const indices = new Uint16Array([
    0, 2, 1,
    2, 3, 1,
    4, 6, 5,
    6, 7, 5,
    8, 10, 9,
    10, 11, 9,
    12, 14, 13,
    14, 15, 13,
    16, 17, 18,
    18, 17, 19,
    20, 21, 22,
    22, 21, 23,
  ]);

  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  // ─────────────────────────────────────────────────────────────────────────
  // Material with texture
  // ─────────────────────────────────────────────────────────────────────────

  const texturePath = path.resolve(__dirname, '../../three/examples/textures/crate.gif');
  console.log('[webgl_buffergeometry_instancing_interleaved] Loading texture from:', texturePath);

  const texture = await loadTexture(THREE, texturePath);

  const material = new THREE.MeshBasicMaterial();
  material.map = texture;

  // ─────────────────────────────────────────────────────────────────────────
  // Per-instance data
  // ─────────────────────────────────────────────────────────────────────────

  const matrix = new THREE.Matrix4();
  const offset = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  let x: number, y: number, z: number, w: number;

  const mesh = new THREE.InstancedMesh(geometry, material, instances);

  for (let i = 0; i < instances; i++) {
    // offsets
    x = Math.random() * 100 - 50;
    y = Math.random() * 100 - 50;
    z = Math.random() * 100 - 50;

    offset.set(x, y, z).normalize();
    offset.multiplyScalar(5); // move out at least 5 units from center in current direction
    offset.set(x + offset.x, y + offset.y, z + offset.z);

    // orientations
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
    w = Math.random() * 2 - 1;

    orientation.set(x, y, z, w).normalize();

    matrix.compose(offset, orientation, scale);

    mesh.setMatrixAt(i, matrix);
  }

  scene.add(mesh);

  console.log('[instancing_interleaved] Mesh added to scene:', {
    instances: mesh.count,
    hasIndex: !!geometry.index,
    indexCount: geometry.index?.count,
    attributeKeys: Object.keys(geometry.attributes),
  });

  const renderer = new THREE.WebGLRenderer();
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
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = Date.now() - startTime;
      currentTime = time;

      mesh.rotation.y = time * 0.00005;

      const delta = (time - lastTime) / 5000;
      tmpQ.set(moveQ.x * delta, moveQ.y * delta, moveQ.z * delta, 1).normalize();
      tmpM.makeRotationFromQuaternion(tmpQ);

      for (let i = 0, il = instances; i < il; i++) {
        mesh.getMatrixAt(i, currentM);
        currentM.multiply(tmpM);
        mesh.setMatrixAt(i, currentM);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      lastTime = time;

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
    { title: 'three.js webgl - instancing interleaved' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing interleaved', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLBufferGeometryInstancingInterleaved(a, win, { width: WIDTH, height: HEIGHT });
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
