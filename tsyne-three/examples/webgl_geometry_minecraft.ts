/**
 * three.js webgl - geometry - minecraft style voxels
 *
 * Tests:
 * - Voxel-based terrain generation
 * - Merged geometry for performance
 * - Procedural block placement
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryMinecraftParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryMinecraftDemo {
  stop: () => void;
  getTime: () => number;
}

// Simple noise for terrain generation
function noise2D(x: number, z: number): number {
  return Math.sin(x * 0.1) * Math.cos(z * 0.1) +
         Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07) * 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryMinecraft(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryMinecraftParams = {}
): Promise<WebGLGeometryMinecraftDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.set(150, 200, 150);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const blockSize = 10;
  const worldSize = 20;

  // Generate terrain heightmap
  const heightMap: number[][] = [];
  for (let x = 0; x < worldSize; x++) {
    heightMap[x] = [];
    for (let z = 0; z < worldSize; z++) {
      const height = Math.floor(noise2D(x, z) * 3 + 5);
      heightMap[x][z] = Math.max(1, height);
    }
  }

  // Create block geometries for different types
  const grassBlocks: THREE.BufferGeometry[] = [];
  const dirtBlocks: THREE.BufferGeometry[] = [];
  const stoneBlocks: THREE.BufferGeometry[] = [];

  for (let x = 0; x < worldSize; x++) {
    for (let z = 0; z < worldSize; z++) {
      const maxY = heightMap[x][z];

      for (let y = 0; y < maxY; y++) {
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        geometry.translate(
          (x - worldSize / 2) * blockSize,
          y * blockSize,
          (z - worldSize / 2) * blockSize
        );

        if (y === maxY - 1) {
          grassBlocks.push(geometry);
        } else if (y >= maxY - 3) {
          dirtBlocks.push(geometry);
        } else {
          stoneBlocks.push(geometry);
        }
      }
    }
  }

  // Merge and add grass blocks
  if (grassBlocks.length > 0) {
    const mergedGrass = BufferGeometryUtils.mergeGeometries(grassBlocks);
    const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x4caf50, wireframe: true });
    const grassMesh = new THREE.Mesh(mergedGrass, grassMaterial);
    scene.add(grassMesh);
  }

  // Merge and add dirt blocks
  if (dirtBlocks.length > 0) {
    const mergedDirt = BufferGeometryUtils.mergeGeometries(dirtBlocks);
    const dirtMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513, wireframe: true });
    const dirtMesh = new THREE.Mesh(mergedDirt, dirtMaterial);
    scene.add(dirtMesh);
  }

  // Merge and add stone blocks
  if (stoneBlocks.length > 0) {
    const mergedStone = BufferGeometryUtils.mergeGeometries(stoneBlocks);
    const stoneMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true });
    const stoneMesh = new THREE.Mesh(mergedStone, stoneMaterial);
    scene.add(stoneMesh);
  }

  // Add some trees
  const treePositions = [
    [5, 5], [15, 3], [3, 15], [12, 12], [8, 17],
  ];

  for (const [tx, tz] of treePositions) {
    if (tx < worldSize && tz < worldSize) {
      const baseY = heightMap[tx][tz];
      const treeX = (tx - worldSize / 2) * blockSize;
      const treeZ = (tz - worldSize / 2) * blockSize;

      // Trunk
      const trunkBlocks: THREE.BufferGeometry[] = [];
      for (let y = 0; y < 4; y++) {
        const trunk = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        trunk.translate(treeX, (baseY + y) * blockSize, treeZ);
        trunkBlocks.push(trunk);
      }

      const mergedTrunk = BufferGeometryUtils.mergeGeometries(trunkBlocks);
      const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x5d4037, wireframe: true });
      scene.add(new THREE.Mesh(mergedTrunk, trunkMaterial));

      // Leaves
      const leafBlocks: THREE.BufferGeometry[] = [];
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = 0; dy <= 2; dy++) {
            if (Math.abs(dx) + Math.abs(dz) + dy <= 3) {
              const leaf = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
              leaf.translate(
                treeX + dx * blockSize,
                (baseY + 4 + dy) * blockSize,
                treeZ + dz * blockSize
              );
              leafBlocks.push(leaf);
            }
          }
        }
      }

      const mergedLeaves = BufferGeometryUtils.mergeGeometries(leafBlocks);
      const leafMaterial = new THREE.MeshBasicMaterial({ color: 0x2e7d32, wireframe: true });
      scene.add(new THREE.Mesh(mergedLeaves, leafMaterial));
    }
  }

  // Add water plane
  const waterGeometry = new THREE.PlaneGeometry(worldSize * blockSize * 1.5, worldSize * blockSize * 1.5);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.MeshBasicMaterial({
    color: 0x2196f3,
    transparent: true,
    opacity: 0.5,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.y = blockSize * 2;
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

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 250;
      camera.position.z = Math.cos(time * 0.2) * 250;
      camera.position.y = 150 + Math.sin(time * 0.1) * 50;
      camera.lookAt(0, 30, 0);

      // Animate water
      water.position.y = blockSize * 2 + Math.sin(time) * 2;

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
    { title: 'three.js webgl - geometry - minecraft style' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - minecraft style', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryMinecraft(a, win, { width: WIDTH, height: HEIGHT });
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
