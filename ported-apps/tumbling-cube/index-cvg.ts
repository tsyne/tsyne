/**
 * Tumbling Cube — 100% CVG version
 *
 * Uses cosyne() builder with bindVertices + bindFill for faces
 * and bindEndpoint for edges. Animation via refreshAllCosyneContexts().
 */

import { App } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from 'cosyne';

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

// 12 edges of a cube
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
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

// Mutable state updated each frame
let rotated: Projected[] = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
// sorted[slot] = index into FACES, back-to-front order
let sorted: number[] = [0, 1, 2, 3, 4, 5];

function updateFrame(t: number): void {
  const ax = t * 0.7, ay = t * 1.1, az = t * 0.5;
  for (let i = 0; i < VERTICES.length; i++) {
    rotated[i] = rotate(VERTICES[i][0], VERTICES[i][1], VERTICES[i][2], ax, ay, az);
  }
  // Sort faces back-to-front by average Z
  const avgZs = FACES.map((face, i) => ({
    idx: i,
    avgZ: face.verts.reduce((sum, vi) => sum + rotated[vi].z, 0) / 4,
  }));
  avgZs.sort((a, b) => b.avgZ - a.avgZ);
  sorted = avgZs.map(e => e.idx);
}

export function buildTumblingCubeCvgApp(a: App): () => void {
  const startTime = Date.now();

  // Initial frame
  updateFrame(0);

  a.canvasStack(() => {
    cosyne(a, (c) => {
      // Background
      c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

      // 6 polygon "slots" — slot 0 is rendered first (farthest back)
      for (let slot = 0; slot < 6; slot++) {
        c.polygon(0, 0, [{ x: 0, y: 0 }])
          .bindVertices(() => {
            const faceIdx = sorted[slot];
            const face = FACES[faceIdx];
            return face.verts.map(vi => project(rotated[vi]));
          })
          .bindFill(() => {
            const faceIdx = sorted[slot];
            return FACES[faceIdx].fill;
          });
      }

      // 12 edge lines
      for (const [v0, v1] of EDGES) {
        c.line(0, 0, 0, 0, { strokeColor: '#222222', strokeWidth: 1.5 })
          .bindEndpoint(() => {
            const a = project(rotated[v0]);
            const b = project(rotated[v1]);
            return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
          });
      }
    });
  });

  // Animation loop
  const interval = setInterval(() => {
    const t = (Date.now() - startTime) / 1000;
    updateFrame(t);
    refreshAllCosyneContexts();
  }, 16);

  return () => clearInterval(interval);
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, standaloneShutdownStrategy } = require('tsyne');
  let appInstance: any;
  appInstance = app(
    resolveTransport(),
    { title: 'Tumbling Cube (CVG)' },
    (a: any) => {
      a.window(
        { title: 'Tumbling Cube (CVG)', width: WIDTH, height: HEIGHT },
        (win: any) => {
          win.setContent(() => {
            buildTumblingCubeCvgApp(a);
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
