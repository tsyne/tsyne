/**
 * three.js webgl - geometry - terrain
 *
 * Tests:
 * - PlaneGeometry with vertex displacement
 * - Procedural terrain generation
 * - Vertex color based on height
 * - Large geometry manipulation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTerrainParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTerrainDemo {
  stop: () => void;
  getTime: () => number;
}

// Simple noise function
function noise(x: number, z: number): number {
  // Simple value noise
  const n1 = Math.sin(x * 0.1) * Math.cos(z * 0.1);
  const n2 = Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.07 + 0.5) * 2;
  const n3 = Math.sin(x * 0.02 + 2.1) * Math.cos(z * 0.03 + 1.7) * 4;
  return n1 + n2 + n3;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryTerrain(
  a: App,
  win: Window,
  params: WebGLGeometryTerrainParams = {}
): Promise<WebGLGeometryTerrainDemo> {
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

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.set(0, 150, 300);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue

  // Create terrain geometry
  const terrainWidth = 400;
  const terrainDepth = 400;
  const segments = 100;

  const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positionAttribute = geometry.getAttribute('position');
  const colors = new Float32Array(positionAttribute.count * 3);

  const color = new THREE.Color();
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  // First pass: calculate heights and find min/max
  const heights: number[] = [];
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getZ(i);

    const h = noise(x, z) * 30;
    heights.push(h);

    minHeight = Math.min(minHeight, h);
    maxHeight = Math.max(maxHeight, h);

    positionAttribute.setY(i, h);
  }

  // Second pass: set colors based on height
  const heightRange = maxHeight - minHeight;
  for (let i = 0; i < positionAttribute.count; i++) {
    const h = heights[i];
    const normalizedHeight = (h - minHeight) / heightRange;

    // Color gradient: blue (water) -> green (grass) -> brown (dirt) -> white (snow)
    if (normalizedHeight < 0.2) {
      // Water/low areas - blue
      color.setRGB(0.2, 0.4, 0.8);
    } else if (normalizedHeight < 0.4) {
      // Beach/low grass - yellow-green
      const t = (normalizedHeight - 0.2) / 0.2;
      color.setRGB(0.8 - t * 0.5, 0.7, 0.3 - t * 0.1);
    } else if (normalizedHeight < 0.7) {
      // Grass/forest - green
      const t = (normalizedHeight - 0.4) / 0.3;
      color.setRGB(0.2 + t * 0.3, 0.6 - t * 0.2, 0.2);
    } else if (normalizedHeight < 0.85) {
      // Rock/dirt - brown
      const t = (normalizedHeight - 0.7) / 0.15;
      color.setRGB(0.5 + t * 0.2, 0.4 - t * 0.1, 0.2 + t * 0.1);
    } else {
      // Snow peaks - white
      const t = (normalizedHeight - 0.85) / 0.15;
      color.setRGB(0.7 + t * 0.3, 0.5 + t * 0.5, 0.3 + t * 0.7);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    wireframe: true,
  });

  const terrain = new THREE.Mesh(geometry, material);
  scene.add(terrain);

  // Add a solid version underneath
  const solidMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const solidTerrain = new THREE.Mesh(geometry.clone(), solidMaterial);
  solidTerrain.position.y = -0.5;
  scene.add(solidTerrain);

  // Add water plane
  const waterGeometry = new THREE.PlaneGeometry(terrainWidth * 1.5, terrainDepth * 1.5);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.MeshBasicMaterial({
    color: 0x4488cc,
    transparent: true,
    opacity: 0.6,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.y = minHeight + heightRange * 0.15;
  scene.add(water);

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Orbit camera around terrain
      camera.position.x = Math.sin(time * 0.2) * 350;
      camera.position.z = Math.cos(time * 0.2) * 350;
      camera.position.y = 150 + Math.sin(time * 0.3) * 50;
      camera.lookAt(0, 0, 0);

      // Animate water level slightly
      water.position.y = minHeight + heightRange * 0.15 + Math.sin(time) * 2;

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
    { title: 'three.js webgl - geometry - terrain' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - terrain', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryTerrain(a, win, { width: WIDTH, height: HEIGHT });
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
