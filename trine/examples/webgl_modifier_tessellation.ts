/**
 * three.js webgl - modifier tessellation
 *
 * Port of: three/examples/webgl_modifier_tessellation.html
 *
 * Tests:
 * - Tessellation concept
 * - Animated exploding/imploding geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierTessellationParams {
  width?: number;
  height?: number;
}

export interface WebGLModifierTessellationDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierTessellation(
  a: App,
  win: ITsyneWindow,
  params: WebGLModifierTessellationParams = {}
): Promise<WebGLModifierTessellationDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.z = 300;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xff4444, 2, 500);
  pointLight1.position.set(100, 100, 100);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x4444ff, 2, 500);
  pointLight2.position.set(-100, -100, 100);
  scene.add(pointLight2);

  // Create tessellated geometry (simulated with individual faces)
  const baseGeometry = new THREE.IcosahedronGeometry(80, 2);
  const positions = baseGeometry.attributes.position;
  const faceCount = positions.count / 3;

  // Create individual triangles for "tessellation" effect
  const triangles: any[] = [];
  const triangleGroup = new THREE.Group();

  for (let i = 0; i < faceCount; i++) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(9);

    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      vertices[j * 3] = positions.getX(idx);
      vertices[j * 3 + 1] = positions.getY(idx);
      vertices[j * 3 + 2] = positions.getZ(idx);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const hue = (i / faceCount) * 0.3;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.5),
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Calculate center of triangle for explosion direction
    const cx = (vertices[0] + vertices[3] + vertices[6]) / 3;
    const cy = (vertices[1] + vertices[4] + vertices[7]) / 3;
    const cz = (vertices[2] + vertices[5] + vertices[8]) / 3;

    (mesh as any).explosionDir = new THREE.Vector3(cx, cy, cz).normalize();
    (mesh as any).originalPosition = new THREE.Vector3(0, 0, 0);
    (mesh as any).rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );

    triangleGroup.add(mesh);
    triangles.push(mesh);
  }

  scene.add(triangleGroup);

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

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Calculate explosion factor (pulsing between 0 and 1)
      const explosionFactor = (Math.sin(time * 0.8) + 1) * 0.5 * 50;

      // Update triangle positions
      triangles.forEach((mesh) => {
        const dir = (mesh as any).explosionDir;
        mesh.position.x = dir.x * explosionFactor;
        mesh.position.y = dir.y * explosionFactor;
        mesh.position.z = dir.z * explosionFactor;

        const rotSpeed = (mesh as any).rotationSpeed;
        mesh.rotation.x += rotSpeed.x * explosionFactor * 0.02;
        mesh.rotation.y += rotSpeed.y * explosionFactor * 0.02;
        mesh.rotation.z += rotSpeed.z * explosionFactor * 0.02;
      });

      // Rotate the whole group
      triangleGroup.rotation.y = time * 0.3;

      renderer.render(scene, camera);

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
    { title: 'three.js webgl - modifier tessellation' },
    (a) => {
      a.window(
        { title: 'three.js webgl - modifier tessellation', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierTessellation(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
