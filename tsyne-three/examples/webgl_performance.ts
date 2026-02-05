/**
 * three.js webgl - performance
 *
 * Port of: three/examples/webgl_performance.html
 *
 * Tests:
 * - High object count rendering
 * - Instanced rendering performance
 * - Frame rate under load
 * - Memory management
 *
 * Adaptations for Tsyne:
 * - Procedural geometry
 * - Configurable object count
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPerformanceParams {
  width?: number;
  height?: number;
  objectCount?: number;
}

export interface WebGLPerformanceDemo {
  stop: () => void;
  getTime: () => number;
  getFrameCount: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPerformance(
  a: App,
  win: Window,
  params: WebGLPerformanceParams = {}
): Promise<WebGLPerformanceDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const objectCount = params.objectCount ?? 2000;

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
  camera.position.z = 1500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 1500, 5000);

  // ─────────────────────────────────────────────────────────────────────────
  // Create many objects using instanced mesh for performance
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.BoxGeometry(20, 20, 20);
  const material = new THREE.MeshNormalMaterial();

  const mesh = new THREE.InstancedMesh(geometry, material, objectCount);

  const dummy = new THREE.Object3D();
  const matrix = new THREE.Matrix4();

  // Store animation data for each instance
  interface InstanceData {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    speed: THREE.Vector3;
    rotationSpeed: THREE.Vector3;
  }

  const instanceData: InstanceData[] = [];

  for (let i = 0; i < objectCount; i++) {
    const data: InstanceData = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      scale: 0.5 + Math.random() * 1.5,
      speed: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ),
    };

    instanceData.push(data);

    // Set initial transform
    dummy.position.copy(data.position);
    dummy.rotation.copy(data.rotation);
    dummy.scale.setScalar(data.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  // Add some static reference objects
  const sphereGeometry = new THREE.SphereGeometry(50, 32, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

  const centerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(centerSphere);

  // Add grid helper
  const gridHelper = new THREE.GridHelper(2000, 20, 0x444444, 0x222222);
  scene.add(gridHelper);

  const renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable AA for performance
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop with performance tracking
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let frameCount = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;
      frameCount++;

      // Update all instances
      for (let i = 0; i < instanceData.length; i++) {
        const data = instanceData[i];

        // Update position
        data.position.add(data.speed);

        // Wrap around boundaries
        const boundary = 1500;
        if (data.position.x > boundary) data.position.x = -boundary;
        if (data.position.x < -boundary) data.position.x = boundary;
        if (data.position.y > boundary) data.position.y = -boundary;
        if (data.position.y < -boundary) data.position.y = boundary;
        if (data.position.z > boundary) data.position.z = -boundary;
        if (data.position.z < -boundary) data.position.z = boundary;

        // Update rotation
        data.rotation.x += data.rotationSpeed.x;
        data.rotation.y += data.rotationSpeed.y;
        data.rotation.z += data.rotationSpeed.z;

        // Update matrix
        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);
        dummy.scale.setScalar(data.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;

      // Animate camera
      camera.position.x = Math.sin(time * 0.1) * 2000;
      camera.position.z = Math.cos(time * 0.1) * 2000;
      camera.position.y = Math.sin(time * 0.05) * 500;
      camera.lookAt(0, 0, 0);

      // Animate center sphere
      centerSphere.rotation.x = time;
      centerSphere.rotation.y = time * 0.5;

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
    getFrameCount: () => frameCount,
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
    { title: 'three.js webgl - performance' },
    (a) => {
      a.window(
        { title: 'three.js webgl - performance', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPerformance(a, win, { width: WIDTH, height: HEIGHT });
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
