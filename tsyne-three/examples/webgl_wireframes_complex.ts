/**
 * three.js webgl - wireframes complex
 *
 * Tests:
 * - Complex wireframe rendering
 * - Multiple nested geometries
 * - Wireframe material with vertex colors
 * - Animated wireframe structures
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLWireframesComplexParams {
  width?: number;
  height?: number;
}

export interface WebGLWireframesComplexDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLWireframesComplex(
  a: App,
  win: Window,
  params: WebGLWireframesComplexParams = {}
): Promise<WebGLWireframesComplexDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // ─────────────────────────────────────────────────────────────────────────
  // Create nested wireframe structures
  // ─────────────────────────────────────────────────────────────────────────

  const mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Create nested icosahedra
  const scales = [150, 120, 90, 60, 30];
  const wireframes: THREE.Mesh[] = [];

  for (let i = 0; i < scales.length; i++) {
    const geometry = new THREE.IcosahedronGeometry(scales[i], 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / scales.length, 0.8, 0.5),
      wireframe: true,
      transparent: true,
      opacity: 0.8 - i * 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mainGroup.add(mesh);
    wireframes.push(mesh);
  }

  // Create orbiting dodecahedra
  const orbitGroup = new THREE.Group();
  mainGroup.add(orbitGroup);

  const dodecaGeometry = new THREE.DodecahedronGeometry(30, 0);
  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 6 + 0.5, 0.9, 0.6),
      wireframe: true,
    });
    const mesh = new THREE.Mesh(dodecaGeometry, material);
    const angle = (i / 6) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 200, 0, Math.sin(angle) * 200);
    mesh.userData.orbitAngle = angle;
    orbitGroup.add(mesh);
    wireframes.push(mesh);
  }

  // Create torus knots at corners
  const torusKnotGeometry = new THREE.TorusKnotGeometry(20, 6, 64, 8);
  const corners = [
    new THREE.Vector3(180, 180, 0),
    new THREE.Vector3(-180, 180, 0),
    new THREE.Vector3(180, -180, 0),
    new THREE.Vector3(-180, -180, 0),
  ];

  for (let i = 0; i < corners.length; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 4 + 0.25, 0.7, 0.5),
      wireframe: true,
    });
    const mesh = new THREE.Mesh(torusKnotGeometry, material);
    mesh.position.copy(corners[i]);
    mainGroup.add(mesh);
    wireframes.push(mesh);
  }

  // Create wireframe box grid
  const boxGeometry = new THREE.BoxGeometry(30, 30, 30);
  const gridSize = 3;
  const gridSpacing = 40;
  const gridOffset = ((gridSize - 1) * gridSpacing) / 2;

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((x + y * gridSize) / (gridSize * gridSize), 0.6, 0.4),
        wireframe: true,
      });
      const mesh = new THREE.Mesh(boxGeometry, material);
      mesh.position.set(
        x * gridSpacing - gridOffset,
        -200,
        y * gridSpacing - gridOffset
      );
      mainGroup.add(mesh);
      wireframes.push(mesh);
    }
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

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

      // Rotate main group
      mainGroup.rotation.y = time * 0.2;

      // Animate nested icosahedra
      for (let i = 0; i < scales.length; i++) {
        wireframes[i].rotation.x = time * (0.1 + i * 0.05);
        wireframes[i].rotation.z = time * (0.05 + i * 0.03);
      }

      // Animate orbiting dodecahedra
      const orbitMeshes = orbitGroup.children as THREE.Mesh[];
      for (let i = 0; i < orbitMeshes.length; i++) {
        const mesh = orbitMeshes[i];
        const angle = mesh.userData.orbitAngle + time * 0.5;
        mesh.position.x = Math.cos(angle) * 200;
        mesh.position.z = Math.sin(angle) * 200;
        mesh.position.y = Math.sin(time * 2 + i) * 30;
        mesh.rotation.x = time;
        mesh.rotation.y = time * 1.5;
      }

      // Animate torus knots
      for (let i = scales.length + 6; i < scales.length + 6 + 4; i++) {
        wireframes[i].rotation.x = time * 0.3;
        wireframes[i].rotation.y = time * 0.5;
      }

      // Animate grid boxes
      const gridStart = scales.length + 6 + 4;
      for (let i = gridStart; i < wireframes.length; i++) {
        const idx = i - gridStart;
        wireframes[i].rotation.x = time + idx * 0.1;
        wireframes[i].rotation.y = time * 0.7 + idx * 0.05;
        wireframes[i].position.y = -200 + Math.sin(time * 2 + idx * 0.5) * 20;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 450;
      camera.position.z = Math.cos(time * 0.15) * 450;
      camera.position.y = Math.sin(time * 0.1) * 150;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - wireframes complex' },
    (a) => {
      a.window(
        { title: 'three.js webgl - wireframes complex', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLWireframesComplex(a, win, { width: WIDTH, height: HEIGHT });
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
