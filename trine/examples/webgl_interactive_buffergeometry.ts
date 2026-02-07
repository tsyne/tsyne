/**
 * three.js webgl - interactive buffergeometry
 *
 * Based on: https://threejs.org/examples/webgl_interactive_buffergeometry.html
 *
 * Tests:
 * - BufferGeometry with random triangles
 * - Raycasting on BufferGeometry
 * - Face highlighting on intersection
 * - Flat face normals computation
 * - Vertex colors based on position
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveBufferGeometryParams {
  width?: number;
  height?: number;
}

export interface WebGLInteractiveBufferGeometryDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractiveBufferGeometry(
  a: App,
  win: ITsyneWindow,
  params: WebGLInteractiveBufferGeometryParams = {}
): Promise<WebGLInteractiveBufferGeometryDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(27, width / height, 1, 3500);
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);

  // Lights
  scene.add(new THREE.AmbientLight(0x444444, 3));

  const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 4.5);
  light2.position.set(0, -1, 0);
  scene.add(light2);

  // Create random triangles
  const triangles = 2000; // Reduced from 5000 for performance
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(triangles * 3 * 3);
  const normals = new Float32Array(triangles * 3 * 3);
  const colors = new Float32Array(triangles * 3 * 3);

  const color = new THREE.Color();

  const n = 800,
    n2 = n / 2; // triangles spread in cube
  const d = 120,
    d2 = d / 2; // individual triangle size

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();

  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let i = 0; i < positions.length; i += 9) {
    // Random position for triangle center
    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    // Random offsets for triangle vertices
    const ax = x + Math.random() * d - d2;
    const ay = y + Math.random() * d - d2;
    const az = z + Math.random() * d - d2;

    const bx = x + Math.random() * d - d2;
    const by = y + Math.random() * d - d2;
    const bz = z + Math.random() * d - d2;

    const cx = x + Math.random() * d - d2;
    const cy = y + Math.random() * d - d2;
    const cz = z + Math.random() * d - d2;

    positions[i] = ax;
    positions[i + 1] = ay;
    positions[i + 2] = az;

    positions[i + 3] = bx;
    positions[i + 4] = by;
    positions[i + 5] = bz;

    positions[i + 6] = cx;
    positions[i + 7] = cy;
    positions[i + 8] = cz;

    // Flat face normals
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

    normals[i] = nx;
    normals[i + 1] = ny;
    normals[i + 2] = nz;

    normals[i + 3] = nx;
    normals[i + 4] = ny;
    normals[i + 5] = nz;

    normals[i + 6] = nx;
    normals[i + 7] = ny;
    normals[i + 8] = nz;

    // Colors based on position
    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz);

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;

    colors[i + 3] = color.r;
    colors[i + 4] = color.g;
    colors[i + 5] = color.b;

    colors[i + 6] = color.r;
    colors[i + 7] = color.g;
    colors[i + 8] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa,
    specular: 0xffffff,
    shininess: 250,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Highlight line for intersected face
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(4 * 3), 3)
  );

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });

  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.visible = false;
  scene.add(line);

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
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  // Simulated pointer for demo (since no real mouse input)
  let pointerX = 0;
  let pointerY = 0;
  let pointerAngle = 0;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate mesh
      mesh.rotation.x = time * 0.15;
      mesh.rotation.y = time * 0.25;

      // Simulate pointer movement
      pointerAngle += 0.02;
      pointerX = Math.sin(pointerAngle) * 0.5;
      pointerY = Math.cos(pointerAngle * 0.7) * 0.5;

      pointer.set(pointerX, pointerY);

      // Raycast
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const face = intersect.face;

        if (face) {
          const linePosition = line.geometry.attributes.position;
          const meshPosition = mesh.geometry.attributes.position;

          linePosition.copyAt(0, meshPosition, face.a);
          linePosition.copyAt(1, meshPosition, face.b);
          linePosition.copyAt(2, meshPosition, face.c);
          linePosition.copyAt(3, meshPosition, face.a);

          mesh.updateMatrix();
          line.geometry.applyMatrix4(mesh.matrix);
          line.visible = true;
        }
      } else {
        line.visible = false;
      }

      renderer.render(scene, camera);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - interactive buffergeometry' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - interactive buffergeometry',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveBufferGeometry(a, win, {
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
