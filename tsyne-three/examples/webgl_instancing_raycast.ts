/**
 * three.js webgl - instancing raycast
 *
 * Port of: three/examples/webgl_instancing_raycast.html
 *
 * Tests:
 * - Raycasting with InstancedMesh
 * - Per-instance intersection detection
 * - Instance highlighting on hover
 * - Efficient raycasting with many instances
 *
 * Adaptations for Tsyne:
 * - Procedural geometry
 * - Interactive highlighting
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInstancingRaycastParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLInstancingRaycastDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInstancingRaycast(
  a: App,
  win: Window,
  params: WebGLInstancingRaycastParams = {}
): Promise<WebGLInstancingRaycastDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 500;

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
    interactive: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101020);

  // Lights
  const light1 = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
  light2.position.set(1, 1, 1);
  scene.add(light2);

  // ─────────────────────────────────────────────────────────────────────────
  // Create instanced mesh
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.BoxGeometry(10, 10, 10);
  const material = new THREE.MeshPhongMaterial({ shininess: 60 });

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  scene.add(mesh);

  // Store original colors
  const originalColors: THREE.Color[] = [];
  const highlightColor = new THREE.Color(0xff0000);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Grid layout
  const gridSize = Math.ceil(Math.sqrt(instanceCount));
  const spacing = 20;
  const offset = (gridSize * spacing) / 2;

  for (let i = 0; i < instanceCount; i++) {
    const x = (i % gridSize) * spacing - offset;
    const y = Math.floor(i / gridSize) * spacing - offset;
    const z = 0;

    dummy.position.set(x, y, z);
    dummy.rotation.set(
      Math.random() * 0.5,
      Math.random() * 0.5,
      Math.random() * 0.5
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Set random color
    const instanceColor = new THREE.Color().setHSL(
      (i / instanceCount) * 0.8,
      0.7,
      0.5
    );
    originalColors.push(instanceColor.clone());
    mesh.setColorAt(i, instanceColor);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  let hoveredInstance: number | null = null;

  // Get the canvas to add event listeners
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    pointer.x = (event.clientX / width) * 2 - 1;
    pointer.y = -(event.clientY / height) * 2 + 1;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.x = -10;
    pointer.y = -10;
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

      // Animate instances (subtle rotation)
      for (let i = 0; i < instanceCount; i++) {
        mesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

        dummy.rotation.x += 0.005 * Math.sin(i * 0.1);
        dummy.rotation.y += 0.005 * Math.cos(i * 0.1);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      // Raycast to find hovered instance
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(mesh);

      // Reset previous hovered instance color
      if (hoveredInstance !== null) {
        mesh.setColorAt(hoveredInstance, originalColors[hoveredInstance]);
      }

      // Highlight new hovered instance
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
          hoveredInstance = instanceId;
          mesh.setColorAt(instanceId, highlightColor);
        }
      } else {
        hoveredInstance = null;
      }

      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      // Orbit camera slowly
      camera.position.x = Math.sin(time * 0.1) * 50;
      camera.position.y = Math.cos(time * 0.1) * 50;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - instancing raycast' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instancing raycast', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInstancingRaycast(a, win, { width: WIDTH, height: HEIGHT });
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
