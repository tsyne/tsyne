/**
 * GameMap class for Yet Another Doom Clone
 * Handles level loading, wall generation, and spatial queries
 */

import { Vector3, urandom, isInRegion as isInPolygon } from '../../cosyne/src/math3d';
import { IGameMap } from './enemy';

const ZERO = Vector3.zero();

// ============================================================================
// Map Polygon System
// ============================================================================

export interface MapPolygon {
  vertices: Vector3[];
  floorHeight: number;
  ceilHeight: number;
  lines: [Vector3, Vector3][];
}

function createMapPolygon(
  vertices: Vector3[],
  floorHeight: number,
  ceilHeight: number
): MapPolygon {
  const lines: [Vector3, Vector3][] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    lines.push([a, b]);
  }
  return { vertices, floorHeight, ceilHeight, lines };
}

// ============================================================================
// Game Map - Turtle Graphics Decompression
// ============================================================================

const LEVEL_DATA = [
  // Level 1 - Simplified for demo
  'rgt413aHp9UFRwdXm2S6cGajdGc0csIDhMeKwQUngnOne8qtCa19bVwnkHBQZ2LYdcSzFERiVTdZmLd7N3NWfFtGTMrYttSyYil4xasKMDBwscKcTWx9vGJ5cMQDUslqsQiEm3iHe2d4RwnLt8RGZ3YXeGfCjgNz13uQB3OHdqd+RnbPkq0DeDd2ZZ10246xA7d7Nw==',
];

function uncompress(b64: string): number[] {
  const binary = atob(b64);
  return binary.split('').map((c) => c.charCodeAt(0));
}

export function runTurtle(commands: number[]): MapPolygon[] {
  const regions: MapPolygon[] = [];
  const turtleLocation: Vector3[] = [ZERO.clone()];
  let floorHeight = 4;
  let ceilHeight = 40;

  let i = 0;
  while (i < commands.length) {
    const cmd = commands[i++];
    const low = cmd & 31;
    const high = cmd >> 5;

    if (high <= 1) {
      // Create new region with [low] vertices
      const vertices: Vector3[] = [turtleLocation[0].clone()];
      for (let j = 0; j < low; j++) {
        if (i >= commands.length) break;
        const dx = ((commands[i] >> 4) - 7) * 8;
        const dy = ((commands[i] & 15) - 7) * 8;
        i++;
        const newPos = turtleLocation[0].add(new Vector3(dx, dy, 0));
        turtleLocation.unshift(newPos);
        vertices.push(newPos.clone());
      }

      if (high === 0) {
        // Create region
        regions.push(createMapPolygon(vertices, floorHeight, ceilHeight));
      }
      // high === 1 means goto, don't create region
    } else if (high === 3) {
      // Object placement - skip for now
      i += 2;
    } else if (high === 4) {
      // Adjust floor height
      floorHeight += 2 * (low - 15);
    } else if (high === 5) {
      // Adjust ceiling height
      ceilHeight += 4 * (low - 15);
    } else if (high === 6) {
      // Backtrack turtle location
      turtleLocation.splice(0, low);
    }
  }

  return regions;
}

// ============================================================================
// Wall Segment Class
// ============================================================================

/**
 * WallSegment - a wall defined by two endpoints
 * Simpler representation for raycasting
 */
export class WallSegment {
  p1: Vector3;  // First endpoint
  p2: Vector3;  // Second endpoint
  floorZ: number;  // Z position of wall bottom
  height: number;  // Wall height

  constructor(p1: Vector3, p2: Vector3, floorZ: number, height: number) {
    this.p1 = p1;
    this.p2 = p2;
    this.floorZ = floorZ;
    this.height = Math.abs(height);
  }
}

// Alias for compatibility
export type Wall = WallSegment;

// ============================================================================
// Game Map Class
// ============================================================================

export class GameMap implements IGameMap {
  regions: MapPolygon[] = [];
  walls: WallSegment[] = [];

  constructor() {
    this.loadLevel(0);
  }

  loadLevel(levelIndex: number): void {
    const levelData = LEVEL_DATA[levelIndex] || LEVEL_DATA[0];
    this.regions = runTurtle(uncompress(levelData));

    // Build walls directly from region line segments
    // Each line segment becomes a wall - simpler and more correct
    this.walls = [];

    // Track which edges are shared between regions (portals - no wall needed for same heights)
    const edgeCounts = new Map<string, { count: number; heights: number[][] }>();

    for (const region of this.regions) {
      for (const [p1, p2] of region.lines) {
        // Create canonical key
        const pt1 = p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y) ? p1 : p2;
        const pt2 = p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y) ? p2 : p1;
        const key = `${pt1.x},${pt1.y},${pt2.x},${pt2.y}`;

        const existing = edgeCounts.get(key) || { count: 0, heights: [] };
        existing.count++;
        existing.heights.push([region.floorHeight, region.ceilHeight]);
        edgeCounts.set(key, existing);
      }
    }

    // Create walls
    for (const [key, data] of edgeCounts) {
      const [x1, y1, x2, y2] = key.split(',').map(Number);
      const p1 = new Vector3(x1, y1, 0);
      const p2 = new Vector3(x2, y2, 0);

      // For single-sided edges, create a full wall
      // For double-sided edges, only create wall if heights differ
      if (data.count === 1) {
        // Boundary wall - always create
        const h = data.heights[0];
        this.walls.push(new WallSegment(p1, p2, h[0], h[1] - h[0]));
      } else if (data.count === 2) {
        // Portal - only wall if floor/ceiling heights differ
        const h1 = data.heights[0];
        const h2 = data.heights[1];

        // Lower wall (step up)
        if (h1[0] !== h2[0]) {
          const lowerFloor = Math.min(h1[0], h2[0]);
          const upperFloor = Math.max(h1[0], h2[0]);
          this.walls.push(new WallSegment(p1, p2, lowerFloor, upperFloor - lowerFloor));
        }

        // Upper wall (ceiling difference)
        if (h1[1] !== h2[1]) {
          const lowerCeil = Math.min(h1[1], h2[1]);
          const upperCeil = Math.max(h1[1], h2[1]);
          this.walls.push(new WallSegment(p1, p2, lowerCeil, upperCeil - lowerCeil));
        }
      }
    }

  }

  getFloorHeight(position: Vector3): number {
    const region = this.getRegionAt(position);
    return region ? region.floorHeight : -100;
  }

  isInRegion(region: MapPolygon, position: Vector3): boolean {
    // Use cosyne's point-in-polygon algorithm with slight jitter to avoid edge cases
    const jitteredPos = new Vector3(
      position.x + urandom() * 0.01,
      position.y + urandom() * 0.01,
      position.z
    );
    return isInPolygon(region.vertices, jitteredPos);
  }

  getRegionAt(position: Vector3): MapPolygon | null {
    for (const region of this.regions) {
      if (this.isInRegion(region, position)) {
        return region;
      }
    }
    return null;
  }
}
