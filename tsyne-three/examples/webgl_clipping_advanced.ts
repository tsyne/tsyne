/**
 * three.js webgl - clipping planes - advanced
 *
 * Based on: https://threejs.org/examples/webgl_clipping_advanced.html
 *
 * Tests:
 * - Complex clipping volume (tetrahedron)
 * - Local and global clipping planes
 * - Clipping plane transforms
 * - Instanced mesh with clipping
 * - Animated bouncing clipping volume
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLClippingAdvancedParams {
  width?: number;
  height?: number;
}

export interface WebGLClippingAdvancedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLClippingAdvanced(
  a: App,
  win: ITsyneWindow,
  params: WebGLClippingAdvancedParams = {}
): Promise<WebGLClippingAdvancedDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────────────────

  function planesFromMesh(
    vertices: THREE.Vector3[],
    indices: number[]
  ): THREE.Plane[] {
    const n = indices.length / 3;
    const result: THREE.Plane[] = new Array(n);

    for (let i = 0, j = 0; i < n; ++i, j += 3) {
      const a = vertices[indices[j]];
      const b = vertices[indices[j + 1]];
      const c = vertices[indices[j + 2]];

      result[i] = new THREE.Plane().setFromCoplanarPoints(a, b, c);
    }

    return result;
  }

  function createPlanes(n: number): THREE.Plane[] {
    const result: THREE.Plane[] = new Array(n);
    for (let i = 0; i !== n; ++i) {
      result[i] = new THREE.Plane();
    }
    return result;
  }

  function assignTransformedPlanes(
    planesOut: THREE.Plane[],
    planesIn: THREE.Plane[],
    matrix: THREE.Matrix4
  ) {
    for (let i = 0, n = planesIn.length; i !== n; ++i) {
      planesOut[i].copy(planesIn[i]).applyMatrix4(matrix);
    }
  }

  function cylindricalPlanes(n: number, innerRadius: number): THREE.Plane[] {
    const result = createPlanes(n);

    for (let i = 0; i !== n; ++i) {
      const plane = result[i];
      const angle = (i * Math.PI * 2) / n;

      plane.normal.set(Math.cos(angle), 0, Math.sin(angle));
      plane.constant = innerRadius;
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  // Regular tetrahedron vertices for clipping volume
  const Vertices = [
    new THREE.Vector3(+1, 0, +Math.SQRT1_2),
    new THREE.Vector3(-1, 0, +Math.SQRT1_2),
    new THREE.Vector3(0, +1, -Math.SQRT1_2),
    new THREE.Vector3(0, -1, -Math.SQRT1_2),
  ];

  const Indices = [0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2];

  const Planes = planesFromMesh(Vertices, Indices);
  const GlobalClippingPlanes = cylindricalPlanes(5, 2.5);
  const Empty: THREE.Plane[] = Object.freeze([]) as unknown as THREE.Plane[];

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.25, 16);
  camera.position.set(0, 1.5, 3);

  const scene = new THREE.Scene();

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff));

  const spotLight = new THREE.SpotLight(0xffffff, 60);
  spotLight.angle = Math.PI / 5;
  spotLight.penumbra = 0.2;
  spotLight.position.set(2, 3, 3);
  scene.add(spotLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(0, 2, 0);
  scene.add(dirLight);

  // Material with clipping planes
  const clipMaterial = new THREE.MeshPhongMaterial({
    color: 0xee0a10,
    shininess: 100,
    side: THREE.DoubleSide,
    clippingPlanes: createPlanes(Planes.length),
  });

  // Instanced mesh of boxes
  const count = 5 * 5 * 5;
  const boxGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const object = new THREE.InstancedMesh(boxGeometry, clipMaterial, count);

  let i = 0;
  const matrix = new THREE.Matrix4();

  for (let z = -2; z <= 2; ++z) {
    for (let y = -2; y <= 2; ++y) {
      for (let x = -2; x <= 2; ++x) {
        matrix.setPosition(x / 5, y / 5, z / 5);
        object.setMatrixAt(i++, matrix);
      }
    }
  }

  scene.add(object);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(3, 3, 1, 1);
  const groundMaterial = new THREE.MeshPhongMaterial({
    color: 0xa0adaf,
    shininess: 10,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.multiplyScalar(3);
  scene.add(ground);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.localClippingEnabled = true;

  // Global clipping planes
  const globalClippingPlanes = createPlanes(GlobalClippingPlanes.length);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const transform = new THREE.Matrix4();
  const tmpMatrix = new THREE.Matrix4();

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      object.position.y = 1;
      object.rotation.x = time * 0.5;
      object.rotation.y = time * 0.2;

      object.updateMatrix();
      transform.copy(object.matrix);

      const bouncy = Math.cos(time * 0.5) * 0.5 + 0.7;
      transform.multiply(tmpMatrix.makeScale(bouncy, bouncy, bouncy));

      assignTransformedPlanes(
        clipMaterial.clippingPlanes as THREE.Plane[],
        Planes,
        transform
      );

      transform.makeRotationY(time * 0.1);
      assignTransformedPlanes(globalClippingPlanes, GlobalClippingPlanes, transform);

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
    { title: 'three.js webgl - clipping planes - advanced' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - clipping planes - advanced',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLClippingAdvanced(a, win, {
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
