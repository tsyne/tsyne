/**
 * three.js webgl - buffergeometry - lines - indexed
 *
 * Port of: three/examples/webgl_buffergeometry_lines_indexed.html
 *
 * Tests:
 * - Indexed BufferGeometry
 * - LineSegments with vertex colors
 * - Koch snowflake fractal generation
 *
 * Adaptations for Tsyne:
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryLinesIndexedParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryLinesIndexedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryLinesIndexed(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryLinesIndexedParams = {}
): Promise<WebGLBufferGeometryLinesIndexedDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(27, width / height, 1, 10000);
  camera.position.z = 9000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ vertexColors: true });

  const indices: number[] = [];
  const positions: number[] = [];
  const colors: number[] = [];

  let next_positions_index = 0;

  const iteration_count = 4;
  const rangle = (60 * Math.PI) / 180.0;

  function add_vertex(v: THREE.Vector3): number {
    positions.push(v.x, v.y, v.z);
    colors.push(Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1);
    return next_positions_index++;
  }

  // Simple Koch curve fractal
  function snowflake_iteration(
    p0: THREE.Vector3,
    p4: THREE.Vector3,
    depth: number
  ): void {
    if (--depth < 0) {
      const i = next_positions_index - 1; // p0 already there
      add_vertex(p4);
      indices.push(i, i + 1);
      return;
    }

    const v = p4.clone().sub(p0);
    const v_tier = v.clone().multiplyScalar(1 / 3);
    const p1 = p0.clone().add(v_tier);

    const angle = Math.atan2(v.y, v.x) + rangle;
    const length = v_tier.length();
    const p2 = p1.clone();
    p2.x += Math.cos(angle) * length;
    p2.y += Math.sin(angle) * length;

    const p3 = p0.clone().add(v_tier).add(v_tier);

    snowflake_iteration(p0, p1, depth);
    snowflake_iteration(p1, p2, depth);
    snowflake_iteration(p2, p3, depth);
    snowflake_iteration(p3, p4, depth);
  }

  function snowflake(
    points: THREE.Vector3[],
    loop: boolean,
    x_offset: number
  ): void {
    for (let iteration = 0; iteration !== iteration_count; iteration++) {
      add_vertex(points[0]);

      for (let p_index = 0, p_count = points.length - 1; p_index !== p_count; p_index++) {
        snowflake_iteration(points[p_index], points[p_index + 1], iteration);
      }

      if (loop) snowflake_iteration(points[points.length - 1], points[0], iteration);

      // Translate input curve for next iteration
      for (let p_index = 0, p_count = points.length; p_index !== p_count; p_index++) {
        points[p_index].x += x_offset;
      }
    }
  }

  let y = 0;

  // Simple line
  snowflake(
    [new THREE.Vector3(0, y, 0), new THREE.Vector3(500, y, 0)],
    false,
    600
  );

  // Triangle (Koch snowflake)
  y += 600;
  snowflake(
    [
      new THREE.Vector3(0, y, 0),
      new THREE.Vector3(250, y + 400, 0),
      new THREE.Vector3(500, y, 0),
    ],
    true,
    600
  );

  // Square
  y += 600;
  snowflake(
    [
      new THREE.Vector3(0, y, 0),
      new THREE.Vector3(500, y, 0),
      new THREE.Vector3(500, y + 500, 0),
      new THREE.Vector3(0, y + 500, 0),
    ],
    true,
    600
  );

  // Cross pattern
  y += 1000;
  snowflake(
    [
      new THREE.Vector3(250, y, 0),
      new THREE.Vector3(500, y, 0),
      new THREE.Vector3(250, y, 0),
      new THREE.Vector3(250, y + 250, 0),
      new THREE.Vector3(250, y, 0),
      new THREE.Vector3(0, y, 0),
      new THREE.Vector3(250, y, 0),
      new THREE.Vector3(250, y - 250, 0),
      new THREE.Vector3(250, y, 0),
    ],
    false,
    600
  );

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const lineSegments = new THREE.LineSegments(geometry, material);
  lineSegments.position.x -= 1200;
  lineSegments.position.y -= 1200;

  const parent_node = new THREE.Object3D();
  parent_node.add(lineSegments);

  scene.add(parent_node);

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

      parent_node.rotation.z = time * 0.5;

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
    { title: 'three.js webgl - buffergeometry - lines - indexed' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry - lines - indexed', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryLinesIndexed(a, win, { width: WIDTH, height: HEIGHT });
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
