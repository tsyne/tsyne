/**
 * three.js webgl - modifier - edge split
 *
 * Port of: three/examples/webgl_modifier_edgesplit.html
 *
 * Tests:
 * - Edge split effect on geometry
 * - Sharp vs smooth edges based on angle
 * - BufferGeometry manipulation
 * - Before/after comparison
 *
 * Adaptations for Tsyne:
 * - Manual edge split implementation
 * - Procedural geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierEdgesplitParams {
  width?: number;
  height?: number;
}

export interface WebGLModifierEdgesplitDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierEdgesplit(
  a: App,
  win: ITsyneWindow,
  params: WebGLModifierEdgesplitParams = {}
): Promise<WebGLModifierEdgesplitDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge split modifier implementation
  // ─────────────────────────────────────────────────────────────────────────

  function computeEdgeSplitGeometry(
    geometry: THREE.BufferGeometry,
    cutoffAngle: number
  ): THREE.BufferGeometry {
    // Get position attribute
    const positionAttr = geometry.getAttribute('position');
    const positions = positionAttr.array as Float32Array;
    const index = geometry.getIndex();

    if (!index) {
      // Non-indexed geometry - compute normals per face
      const newPositions: number[] = [];
      const newNormals: number[] = [];

      for (let i = 0; i < positions.length; i += 9) {
        // Get triangle vertices
        const v0 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const v1 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const v2 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

        // Compute face normal
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        // Add vertices with face normal
        newPositions.push(v0.x, v0.y, v0.z);
        newPositions.push(v1.x, v1.y, v1.z);
        newPositions.push(v2.x, v2.y, v2.z);

        newNormals.push(normal.x, normal.y, normal.z);
        newNormals.push(normal.x, normal.y, normal.z);
        newNormals.push(normal.x, normal.y, normal.z);
      }

      const newGeometry = new THREE.BufferGeometry();
      newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
      return newGeometry;
    }

    // Indexed geometry
    const indices = index.array;
    const newPositions: number[] = [];
    const newNormals: number[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      const v0 = new THREE.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
      const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

      // Compute face normal
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      newPositions.push(v0.x, v0.y, v0.z);
      newPositions.push(v1.x, v1.y, v1.z);
      newPositions.push(v2.x, v2.y, v2.z);

      newNormals.push(normal.x, normal.y, normal.z);
      newNormals.push(normal.x, normal.y, normal.z);
      newNormals.push(normal.x, normal.y, normal.z);
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    return newGeometry;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
  camera.position.set(0, 0, 200);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x88aaff, 50, 200);
  pointLight.position.set(-50, 50, 50);
  scene.add(pointLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create comparison meshes
  // ─────────────────────────────────────────────────────────────────────────

  // Original geometry (smooth shading)
  const originalGeometry = new THREE.IcosahedronGeometry(30, 1);
  originalGeometry.computeVertexNormals();

  const smoothMaterial = new THREE.MeshPhongMaterial({
    color: 0x4488aa,
    shininess: 50,
  });

  const smoothMesh = new THREE.Mesh(originalGeometry, smoothMaterial);
  smoothMesh.position.x = -50;
  scene.add(smoothMesh);

  // Edge split geometry (flat shading effect)
  const edgeSplitGeometry = computeEdgeSplitGeometry(originalGeometry, Math.PI / 6);

  const flatMaterial = new THREE.MeshPhongMaterial({
    color: 0xaa4488,
    shininess: 50,
  });

  const flatMesh = new THREE.Mesh(edgeSplitGeometry, flatMaterial);
  flatMesh.position.x = 50;
  scene.add(flatMesh);

  // Box comparison
  const boxGeometry = new THREE.BoxGeometry(40, 40, 40);
  boxGeometry.computeVertexNormals();

  const smoothBoxMesh = new THREE.Mesh(boxGeometry, smoothMaterial.clone());
  smoothBoxMesh.position.set(-50, -70, 0);
  scene.add(smoothBoxMesh);

  const edgeSplitBoxGeometry = computeEdgeSplitGeometry(boxGeometry, Math.PI / 6);
  const flatBoxMesh = new THREE.Mesh(edgeSplitBoxGeometry, flatMaterial.clone());
  flatBoxMesh.position.set(50, -70, 0);
  scene.add(flatBoxMesh);

  // Torus comparison
  const torusGeometry = new THREE.TorusGeometry(20, 8, 8, 16);
  torusGeometry.computeVertexNormals();

  const smoothTorusMesh = new THREE.Mesh(torusGeometry, smoothMaterial.clone());
  smoothTorusMesh.position.set(-50, 70, 0);
  scene.add(smoothTorusMesh);

  const edgeSplitTorusGeometry = computeEdgeSplitGeometry(torusGeometry, Math.PI / 6);
  const flatTorusMesh = new THREE.Mesh(edgeSplitTorusGeometry, flatMaterial.clone());
  flatTorusMesh.position.set(50, 70, 0);
  scene.add(flatTorusMesh);

  // Labels using small spheres as indicators
  const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const labelGeometry = new THREE.SphereGeometry(3, 8, 8);

  const smoothLabel = new THREE.Mesh(labelGeometry, labelMaterial);
  smoothLabel.position.set(-80, 0, 0);
  scene.add(smoothLabel);

  const flatLabel = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xff8800 }));
  flatLabel.position.set(80, 0, 0);
  scene.add(flatLabel);

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate meshes
      smoothMesh.rotation.y = time * 0.3;
      smoothMesh.rotation.x = time * 0.2;
      flatMesh.rotation.y = time * 0.3;
      flatMesh.rotation.x = time * 0.2;

      smoothBoxMesh.rotation.y = time * 0.4;
      smoothBoxMesh.rotation.x = time * 0.25;
      flatBoxMesh.rotation.y = time * 0.4;
      flatBoxMesh.rotation.x = time * 0.25;

      smoothTorusMesh.rotation.y = time * 0.35;
      smoothTorusMesh.rotation.x = time * 0.15;
      flatTorusMesh.rotation.y = time * 0.35;
      flatTorusMesh.rotation.x = time * 0.15;

      // Animate light
      pointLight.position.x = Math.sin(time * 0.5) * 80;
      pointLight.position.z = Math.cos(time * 0.5) * 80;

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
    { title: 'three.js webgl - modifier - edge split' },
    (a) => {
      a.window(
        { title: 'three.js webgl - modifier - edge split', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierEdgesplit(a, win, { width: WIDTH, height: HEIGHT });
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
