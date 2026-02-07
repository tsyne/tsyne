/**
 * three.js webgl - geometry - terrain - raycast
 *
 * Based on: https://threejs.org/examples/webgl_geometry_terrain_raycast.html
 *
 * Tests:
 * - PlaneGeometry with vertex displacement
 * - Procedural terrain generation with ImprovedNoise algorithm
 * - Vertex colors based on height (adapted from texture in original)
 * - Raycasting on terrain mesh
 * - Helper cone positioned and oriented by raycast intersection
 * - Simulated pointer movement for raycasting
 *
 * Adaptations for Tsyne:
 * - Uses vertex colors instead of canvas texture (more reliable in Tsyne)
 * - Simulated pointer movement in figure-8 pattern
 * - Smaller terrain size for better performance
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTerrainRaycastParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTerrainRaycastDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ImprovedNoise - Perlin noise implementation
// ═══════════════════════════════════════════════════════════════════════════

class ImprovedNoise {
  private p: number[];

  constructor() {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(Math.random() * 256);
    }

    this.p = new Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = p[i];
      this.p[i + 256] = p[i];
    }
  }

  noise(x: number, y: number, z: number): number {
    const p = this.p;
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain Generation
// ═══════════════════════════════════════════════════════════════════════════

function generateHeight(width: number, height: number): Uint8Array {
  const size = width * height;
  const data = new Uint8Array(size);
  const perlin = new ImprovedNoise();
  const z = Math.random() * 100;

  let quality = 1;

  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < size; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
    }
    quality *= 5;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryTerrainRaycast(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryTerrainRaycastParams = {}
): Promise<WebGLGeometryTerrainRaycastDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  const camera = new THREE.PerspectiveCamera(60, width / height, 10, 20000);

  // Generate terrain (reduced size for better visibility)
  const worldWidth = 64;
  const worldDepth = 64;
  const worldHalfWidth = worldWidth / 2;
  const worldHalfDepth = worldDepth / 2;

  const data = generateHeight(worldWidth, worldDepth);

  // Position camera closer and at angle to see terrain
  const targetY = data[worldHalfWidth + worldHalfDepth * worldWidth] * 10 + 200;
  camera.position.set(800, targetY + 600, 800);
  const lookAtTarget = new THREE.Vector3(0, targetY, 0);
  camera.lookAt(lookAtTarget);

  // Create terrain geometry (smaller for better visibility and performance)
  const geometry = new THREE.PlaneGeometry(1500, 1500, worldWidth - 1, worldDepth - 1);
  geometry.rotateX(-Math.PI / 2);

  const positionAttribute = geometry.attributes.position;
  const colors = new Float32Array(positionAttribute.count * 3);
  const color = new THREE.Color();

  // Find height range for color mapping
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  const heights: number[] = [];

  // Set heights and find range
  for (let i = 0; i < positionAttribute.count; i++) {
    const y = data[i] * 10;
    positionAttribute.setY(i, y);
    heights.push(y);
    minHeight = Math.min(minHeight, y);
    maxHeight = Math.max(maxHeight, y);
  }

  // Generate vertex colors based on height (similar to texture but as vertex colors)
  const heightRange = maxHeight - minHeight;
  for (let i = 0; i < positionAttribute.count; i++) {
    const h = heights[i];
    const normalizedHeight = (h - minHeight) / heightRange;

    // Color gradient based on height
    if (normalizedHeight < 0.2) {
      color.setRGB(0.1, 0.2, 0.4); // Low - dark blue
    } else if (normalizedHeight < 0.4) {
      const t = (normalizedHeight - 0.2) / 0.2;
      color.setRGB(0.3 + t * 0.2, 0.3 + t * 0.2, 0.1); // Mid-low - brownish
    } else if (normalizedHeight < 0.7) {
      const t = (normalizedHeight - 0.4) / 0.3;
      color.setRGB(0.2 + t * 0.3, 0.4 + t * 0.2, 0.1); // Mid - greenish
    } else {
      const t = (normalizedHeight - 0.7) / 0.3;
      color.setRGB(0.5 + t * 0.5, 0.5 + t * 0.5, 0.5 + t * 0.5); // High - gray to white
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  // Create terrain mesh with vertex colors (more reliable than textures in Tsyne)
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Add solid version
  const solidMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);
  solidMesh.position.y = -0.5;
  scene.add(solidMesh);

  // Create helper cone that shows raycast intersection
  const geometryHelper = new THREE.ConeGeometry(20, 100, 3);
  geometryHelper.translate(0, 50, 0);
  geometryHelper.rotateX(Math.PI / 2);
  const helper = new THREE.Mesh(geometryHelper, new THREE.MeshNormalMaterial());
  // Position helper in center of terrain initially so it's visible
  helper.position.set(0, targetY, 0);
  scene.add(helper);

  // Raycaster setup
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

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

  // Simulate pointer movement in a circular pattern
  let pointerAngle = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

          // Rotate camera around terrain
      const radius = 1000;
      camera.position.x = Math.sin(time * 0.3) * radius;
      camera.position.z = Math.cos(time * 0.3) * radius;
      camera.position.y = targetY + 600 + Math.sin(time * 0.4) * 200;
      camera.lookAt(lookAtTarget);

      // Simulate pointer movement in a figure-8 pattern
      pointerAngle += 0.02;
      pointer.x = Math.sin(pointerAngle * 2) * 0.7;
      pointer.y = Math.sin(pointerAngle) * 0.7;

      // Perform raycasting
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0) {
        const intersect = intersects[0];

        // Position helper at intersection point
        helper.position.copy(intersect.point);

        // Orient helper to face the surface normal
        if (intersect.face) {
          helper.position.set(0, 0, 0);
          helper.lookAt(intersect.face.normal);
          helper.position.copy(intersect.point);
        }
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
    { title: 'three.js webgl - geometry - terrain - raycast' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - geometry - terrain - raycast',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryTerrainRaycast(a, win, {
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
