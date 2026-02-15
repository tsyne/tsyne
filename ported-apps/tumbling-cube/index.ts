/**
 * Tumbling Cube - 3D cube with Rubik's-colored opaque faces on three sides
 * and translucent faces on the other three, continuously rotating.
 *
 * Uses a single canvasPath widget updated each frame — no rebuild, no flashing.
 * All geometry (faces + edges) is rendered as one SVG path string.
 */

import { App } from 'tsyne';

// Cube vertices at (±1, ±1, ±1)
const VERTICES: [number, number, number][] = [
  [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1], // 0-3
  [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1], // 4-7
];

// 6 faces: vertex indices + Rubik's colors
// Opaque: red (front), orange (right), white (top)
// Translucent: yellow (back), blue (left), green (bottom)
const FACES = [
  { verts: [4, 5, 6, 7], fill: 'rgba(255,0,0,255)',     stroke: 'rgba(34,34,34,255)'   }, // front  red
  { verts: [1, 2, 6, 5], fill: 'rgba(255,140,0,255)',    stroke: 'rgba(34,34,34,255)'   }, // right  orange
  { verts: [2, 3, 7, 6], fill: 'rgba(255,255,255,255)',  stroke: 'rgba(34,34,34,255)'   }, // top    white
  { verts: [0, 3, 2, 1], fill: 'rgba(255,239,0,64)',     stroke: 'rgba(34,34,34,128)'   }, // back   yellow
  { verts: [0, 4, 7, 3], fill: 'rgba(0,70,173,64)',      stroke: 'rgba(34,34,34,128)'   }, // left   blue
  { verts: [0, 1, 5, 4], fill: 'rgba(0,155,72,64)',      stroke: 'rgba(34,34,34,128)'   }, // bottom green
];

const WIDTH = 500;
const HEIGHT = 450;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const SCALE = 100;
const FOCAL = 4;

interface Projected { x: number; y: number; z: number }

function rotate(
  vx: number, vy: number, vz: number,
  ax: number, ay: number, az: number,
): Projected {
  const y1 = vy * Math.cos(ax) - vz * Math.sin(ax);
  const z1 = vy * Math.sin(ax) + vz * Math.cos(ax);
  const x2 = vx * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -vx * Math.sin(ay) + z1 * Math.cos(ay);
  const x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
  const y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
  return { x: x3, y: y3, z: z2 };
}

function project(p: Projected): { x: number; y: number } {
  const s = FOCAL / (FOCAL + p.z);
  return { x: CX + p.x * SCALE * s, y: CY + p.y * SCALE * s };
}

function quadPath(pts: { x: number; y: number }[]): string {
  return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)} L ${pts[2].x.toFixed(1)},${pts[2].y.toFixed(1)} L ${pts[3].x.toFixed(1)},${pts[3].y.toFixed(1)} Z`;
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return `M ${a.x.toFixed(1)},${a.y.toFixed(1)} L ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

export function buildTumblingCubeApp(a: App): () => void {
  const startTime = Date.now();

  // One canvasPath per face (filled quad) + one for all edges (stroked lines)
  const facePaths: any[] = [];
  let edgesPath: any;

  a.canvasStack(() => {
    // Background
    a.canvasRectangle({ width: WIDTH, height: HEIGHT, fillColor: '#1a1a2e' });

    // 6 face paths — created in order, slot 0 rendered first (behind)
    for (let i = 0; i < 6; i++) {
      facePaths.push(a.canvasPath({
        width: WIDTH,
        height: HEIGHT,
        path: 'M 0,0 Z',
        fillColor: 'transparent',
        strokeWidth: 0,
      }));
    }

    // Single edges path on top
    edgesPath = a.canvasPath({
      width: WIDTH,
      height: HEIGHT,
      path: 'M 0,0 Z',
      strokeColor: '#222222',
      strokeWidth: 1.5,
    });
  });

  // Animation loop — update path strings each frame
  const interval = setInterval(() => {
    const t = (Date.now() - startTime) / 1000;
    const ax = t * 0.7, ay = t * 1.1, az = t * 0.5;

    const rotated = VERTICES.map(v => rotate(v[0], v[1], v[2], ax, ay, az));

    // Sort faces back-to-front
    const sorted = FACES.map((face, i) => ({
      face,
      avgZ: face.verts.reduce((sum, vi) => sum + rotated[vi].z, 0) / 4,
    })).sort((a, b) => b.avgZ - a.avgZ);

    // Update face paths in depth order
    for (let slot = 0; slot < 6; slot++) {
      const { face } = sorted[slot];
      const pts = face.verts.map(vi => project(rotated[vi]));
      facePaths[slot].update({
        path: quadPath(pts),
        fillColor: face.fill,
        strokeColor: face.stroke,
        strokeWidth: 1,
      });
    }

    // Build all 12 edges as a single path
    const edgeSegments: string[] = [];
    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    for (const [v0, v1] of edges) {
      edgeSegments.push(edgePath(project(rotated[v0]), project(rotated[v1])));
    }
    edgesPath.update({ path: edgeSegments.join(' ') });
  }, 16);

  return () => clearInterval(interval);
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, standaloneShutdownStrategy } = require('tsyne');
  let appInstance: any;
  appInstance = app(
    resolveTransport(),
    { title: 'Tumbling Cube' },
    (a: any) => {
      a.window(
        { title: 'Tumbling Cube', width: WIDTH, height: HEIGHT },
        (win: any) => {
          win.setContent(() => {
            buildTumblingCubeApp(a);
          });
          win.show();
        },
      );
      queueMicrotask(() => {
        appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
      });
    },
  );
}
