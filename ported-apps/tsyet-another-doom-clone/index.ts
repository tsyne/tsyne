/**
 * Yet Another Doom Clone - Ported to Tsyne
 *
 * A faithful port of Nicholas Carlini's js13k 2019 entry "Yet Another Doom Clone"
 * to the Tsyne framework using software raycasting rendering.
 *
 * Original: https://github.com/carlini/js13k2019-yet-another-doom-clone
 * Original writeup: https://nicholas.carlini.com/writing/2019/javascript-doom-clone-13k.html
 *
 * Copyright (C) 2019, Nicholas Carlini <nicholas@carlini.com> (original)
 * Copyright (C) 2025, Paul Hammant (Tsyne port)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @tsyne-app:name Yet Another Doom Clone
 * @tsyne-app:icon home
 * @tsyne-app:category Games
 * @tsyne-app:args (a: App) => void
 */

import { App, TappableCanvasRaster, Label, app, resolveTransport } from 'tsyne';
import {
  Vector3,
  clamp,
  urandom,
  urandomVector,
  rayLineIntersect2DV,
  rotateXY,
  rotateXZ,
  rotateYZ,
  angleBetweenYForward,
  isInRegion as isInPolygon,
} from '../../cosyne/src/math3d';

// Re-export Vector3 for tests
export { Vector3 };

// ============================================================================
// Constants
// ============================================================================

export const ZERO = Vector3.zero();
export const X_DIR = Vector3.right();
export const Y_DIR = Vector3.up();
export const Z_DIR = Vector3.forward();

// Re-export utilities for tests
export { clamp, urandom, urandomVector, rotateXY, rotateXZ, rotateYZ };

// ============================================================================
// Vector3 Helper Functions
// ============================================================================

/** Project vector to XY plane (set z to 0) */
function noz(v: Vector3): Vector3 {
  return new Vector3(v.x, v.y, 0);
}

/**
 * Angle from point a looking away from point b (original doom clone convention)
 * This is the negation of angleBetweenYForward.
 * Kept for API compatibility with tests.
 */
export function angleBetween(a: Vector3, b: Vector3): number {
  return -angleBetweenYForward(a, b);
}

// ============================================================================
// Ray-Line Intersection Wrapper
// ============================================================================

/**
 * Wrapper around cosyne's rayLineIntersect2DV that returns tuple instead of object
 * Kept for API compatibility - game code expects [t, u] tuple format
 */
export function rayLineIntersect(
  origin: Vector3,
  dir: Vector3,
  p1: Vector3,
  p2: Vector3
): [number, number] | null {
  const result = rayLineIntersect2DV(origin, dir, p1, p2);
  if (result === null) return null;
  return [result.t, result.u];
}

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
// Game Map Class
// ============================================================================

export class GameMap {
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

// ============================================================================
// Wall Classes
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
// Player Class
// ============================================================================

export class Player {
  position: Vector3;
  theta: number = 0;
  theta2: number = 0;  // Vertical look angle
  health: number = 100;
  velocity: Vector3 = ZERO.clone();
  height: number = 5;

  constructor(position: Vector3) {
    this.position = position.clone();
  }

  getForwardVector(): Vector3 {
    // Forward direction based on theta angle
    // Uses cos/sin convention: theta=0 points along +X, theta=PI/2 points along +Y
    return new Vector3(Math.cos(this.theta), Math.sin(this.theta), 0);
  }

  getRightVector(): Vector3 {
    // Right is perpendicular to forward (90 degrees clockwise)
    return new Vector3(Math.cos(this.theta - Math.PI / 2), Math.sin(this.theta - Math.PI / 2), 0);
  }

  getEyePosition(): Vector3 {
    return this.position.add(Z_DIR.multiplyScalar(this.height));
  }
}

// ============================================================================
// Enemy Classes
// ============================================================================

export type EnemyState = 'patrol' | 'attack' | 'dead';

export class Enemy {
  position: Vector3;
  theta: number;
  health: number = 10;
  state: EnemyState = 'patrol';
  height: number = 5;
  size: number = 6;
  dead: boolean = false;
  attacking: boolean = false;
  color: [number, number, number] = [180, 50, 50];  // Reddish

  constructor(position: Vector3, theta: number = 0) {
    this.position = position.clone();
    this.theta = theta;
  }

  update(dt: number, playerPos: Vector3, map: GameMap): void {
    if (this.dead) return;

    // Simple AI: face player and move toward them if attacking
    const toPlayer = noz(playerPos).sub(noz(this.position));
    const distToPlayer = toPlayer.length();

    // Detect player if close enough
    if (distToPlayer < 100 && !this.attacking) {
      this.attacking = true;
      this.state = 'attack';
    }

    if (this.attacking && distToPlayer > 10) {
      // Move toward player
      const goalAngle = Math.atan2(toPlayer.y, toPlayer.x);

      // Gradually turn toward player
      let angleDiff = goalAngle - this.theta;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.theta += angleDiff * 0.1;

      // Move forward
      const speed = dt / 50;
      const moveDir = new Vector3(Math.cos(this.theta), Math.sin(this.theta), 0);
      const nextPos = this.position.add(moveDir.multiplyScalar(speed));

      // Update floor height
      const floorHeight = map.getFloorHeight(nextPos);
      if (Math.abs(floorHeight - this.position.z + this.height) < 10) {
        this.position = nextPos;
        this.position.z = floorHeight + this.height;
      }
    }
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'dead';
    }
  }

  distanceTo(player: Player): number {
    return this.position.distanceTo(player.position);
  }
}

// ============================================================================
// Raycasting Renderer
// ============================================================================

export interface RaycastHit {
  distance: number;
  wallX: number;  // Where on the wall texture (0-1)
  wall: WallSegment | null;
  side: number;   // 0 = NS, 1 = EW
  color: [number, number, number];
}

// Brick texture size
const BRICK_TEX_SIZE = 64;

/**
 * Generate a procedural brick texture similar to the original
 * Returns a 2D array of grayscale values (0-1)
 */
function generateBrickTexture(): number[][] {
  const tex: number[][] = [];

  // Simple Perlin-like noise using sin waves
  const noise = (x: number, y: number): number => {
    return (
      Math.sin(x * 0.1) * 0.3 +
      Math.sin(y * 0.15) * 0.3 +
      Math.sin((x + y) * 0.08) * 0.2 +
      Math.sin((x - y) * 0.12) * 0.2
    ) * 0.5 + 0.5;
  };

  for (let y = 0; y < BRICK_TEX_SIZE; y++) {
    tex[y] = [];
    for (let x = 0; x < BRICK_TEX_SIZE; x++) {
      // Brick pattern: horizontal lines every 16 pixels, vertical offset every other row
      const brickHeight = 16;
      const brickWidth = 32;
      const mortarWidth = 2;

      const row = Math.floor(y / brickHeight);
      const yInBrick = y % brickHeight;
      const xOffset = (row % 2) * (brickWidth / 2);
      const xInBrick = (x + xOffset) % brickWidth;

      // Check if we're in mortar (gaps between bricks)
      const inHorizontalMortar = yInBrick < mortarWidth;
      const inVerticalMortar = xInBrick < mortarWidth;

      if (inHorizontalMortar || inVerticalMortar) {
        // Mortar is dark gray
        tex[y][x] = 0.2 + noise(x, y) * 0.1;
      } else {
        // Brick surface with noise variation
        tex[y][x] = 0.6 + noise(x * 2, y * 2) * 0.3;
      }
    }
  }

  return tex;
}

// Pre-generate brick texture
const brickTexture = generateBrickTexture();

// Tile texture size
const TILE_TEX_SIZE = 64;

/**
 * Generate a procedural tile/floor texture with hexagonal lattice pattern
 * Similar to the original doom clone's floor
 * Returns a 2D array of grayscale values (0-1)
 */
function generateTileTexture(): number[][] {
  const tex: number[][] = [];

  // Hexagonal lattice parameters
  const scale = 12;  // Size of hex cells
  const sqrt3 = Math.sqrt(3);

  // Simple noise for variation
  const noise = (x: number, y: number): number => {
    return (
      Math.sin(x * 0.2 + 1.3) * 0.2 +
      Math.sin(y * 0.25 + 2.1) * 0.2 +
      Math.sin((x + y) * 0.15) * 0.15 +
      Math.sin((x - y) * 0.18 + 0.7) * 0.15
    ) * 0.5 + 0.5;
  };

  for (let y = 0; y < TILE_TEX_SIZE; y++) {
    tex[y] = [];
    for (let x = 0; x < TILE_TEX_SIZE; x++) {
      // Convert to hexagonal lattice coordinates
      // Hex lattice has points at (n*scale, m*scale*sqrt(3)) and ((n+0.5)*scale, (m+0.5)*scale*sqrt(3))
      const fx = x / scale;
      const fy = y / (scale * sqrt3);

      // Find closest lattice point (two offset grids)
      const grid1x = Math.round(fx);
      const grid1y = Math.round(fy);
      const dist1 = Math.hypot(fx - grid1x, fy - grid1y);

      const grid2x = Math.round(fx - 0.5) + 0.5;
      const grid2y = Math.round(fy - 0.5) + 0.5;
      const dist2 = Math.hypot(fx - grid2x, fy - grid2y);

      // Minimum distance to nearest lattice point
      const minDist = Math.min(dist1, dist2);

      // Create tile pattern: dark lines where close to lattice points (tile edges)
      // Values closer to 0 = darker (grout lines), closer to 1 = lighter (tile surface)
      const lineThreshold = 0.15;  // How close to lattice point for grout line

      if (minDist < lineThreshold) {
        // Grout/edge - dark with some variation
        tex[y][x] = 0.25 + noise(x, y) * 0.1;
      } else {
        // Tile surface with noise variation
        const surfaceValue = 0.5 + (minDist - lineThreshold) * 0.8;
        tex[y][x] = Math.min(0.85, surfaceValue) + noise(x * 2, y * 2) * 0.15;
      }
    }
  }

  return tex;
}

// Pre-generate tile texture
const tileTexture = generateTileTexture();

export class RaycastRenderer {
  width: number;
  height: number;
  fov: number = Math.PI / 3;  // 60 degrees
  maxRenderDistance: number = 200;

  // Depth buffer for sprite sorting
  depthBuffer: number[];

  // Base wall colors (will be modulated by brick texture)
  wallColorNS: [number, number, number] = [140, 100, 80];   // Reddish brick
  wallColorEW: [number, number, number] = [120, 85, 70];    // Slightly darker
  floorColor: [number, number, number] = [50, 50, 60];
  ceilingColor: [number, number, number] = [30, 30, 40];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.depthBuffer = new Array(width).fill(Infinity);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.depthBuffer = new Array(width).fill(Infinity);
  }

  castRay(
    player: Player,
    map: GameMap,
    rayAngle: number
  ): RaycastHit {
    const rayDir = new Vector3(Math.cos(rayAngle), Math.sin(rayAngle), 0);
    const pos = noz(player.position);

    let closestHit: RaycastHit = {
      distance: this.maxRenderDistance,
      wallX: 0,
      wall: null,
      side: 0,
      color: this.wallColorNS,
    };

    // Check intersection with all walls
    for (const wall of map.walls) {
      const hit = rayLineIntersect(pos, rayDir, wall.p1, wall.p2);
      if (hit && hit[0] < closestHit.distance && hit[0] > 0.1) {
        // Determine wall orientation for shading
        const dx = wall.p2.x - wall.p1.x;
        const dy = wall.p2.y - wall.p1.y;
        const isNS = Math.abs(dx) > Math.abs(dy);

        closestHit = {
          distance: hit[0],
          wallX: hit[1],
          wall: wall,
          side: isNS ? 0 : 1,
          color: isNS ? this.wallColorNS : this.wallColorEW,
        };
      }
    }

    return closestHit;
  }

  render(
    buffer: Uint8Array,
    player: Player,
    map: GameMap,
    enemies: Enemy[]
  ): void {
    // Clear depth buffer
    this.depthBuffer.fill(Infinity);

    // Fill ceiling (solid color)
    for (let y = 0; y < this.height / 2; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        buffer[idx] = this.ceilingColor[0];
        buffer[idx + 1] = this.ceilingColor[1];
        buffer[idx + 2] = this.ceilingColor[2];
        buffer[idx + 3] = 255;
      }
    }

    // Floor casting with texture
    const halfFov = this.fov / 2;
    const halfHeight = this.height / 2;
    const floorZ = 0;  // Floor is at Z=0
    const eyeZ = player.position.z;  // Player eye height

    for (let y = Math.floor(halfHeight); y < this.height; y++) {
      // Calculate the distance to this floor row
      // Using similar triangles: rowDistance = (eyeZ - floorZ) * scale / (y - halfHeight)
      const rowDistance = ((eyeZ - floorZ) * this.height * 1.5) / (y - halfHeight + 0.001);

      // Skip very distant floor (beyond render distance)
      if (rowDistance > this.maxRenderDistance * 2) {
        for (let x = 0; x < this.width; x++) {
          const idx = (y * this.width + x) * 4;
          buffer[idx] = this.floorColor[0];
          buffer[idx + 1] = this.floorColor[1];
          buffer[idx + 2] = this.floorColor[2];
          buffer[idx + 3] = 255;
        }
        continue;
      }

      // Calculate shading based on distance
      const shade = Math.max(0.2, 1 - rowDistance / (this.maxRenderDistance * 1.5));

      for (let x = 0; x < this.width; x++) {
        // Calculate ray direction for this pixel
        const rayAngle = player.theta + halfFov - (x / this.width) * this.fov;
        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);

        // Calculate world position of this floor pixel
        const floorX = player.position.x + rayDirX * rowDistance;
        const floorY = player.position.y + rayDirY * rowDistance;

        // Sample tile texture (with tiling)
        const texX = Math.floor(Math.abs(floorX * 4)) % TILE_TEX_SIZE;
        const texY = Math.floor(Math.abs(floorY * 4)) % TILE_TEX_SIZE;
        const texValue = tileTexture[texY]?.[texX] ?? 0.5;

        // Apply texture to floor color with distance shading
        const r = Math.floor(this.floorColor[0] * shade * texValue * 1.5);
        const g = Math.floor(this.floorColor[1] * shade * texValue * 1.5);
        const b = Math.floor(this.floorColor[2] * shade * texValue * 1.5);

        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.min(255, r);
        buffer[idx + 1] = Math.min(255, g);
        buffer[idx + 2] = Math.min(255, b);
        buffer[idx + 3] = 255;
      }
    }

    // Cast rays for each column (halfFov already defined above)
    for (let x = 0; x < this.width; x++) {
      // Calculate ray angle
      const rayAngle =
        player.theta + halfFov - (x / this.width) * this.fov;

      const hit = this.castRay(player, map, rayAngle);

      // Fix fisheye distortion
      const perpDist = hit.distance * Math.cos(rayAngle - player.theta);
      this.depthBuffer[x] = perpDist;

      if (perpDist < this.maxRenderDistance && hit.wall) {
        // Get player's eye height in world coordinates
        // position.z is already set to floorHeight + height (eye level)
        const eyeZ = player.position.z;

        // Wall bottom and top in world Z coordinates
        const wallBottom = hit.wall.floorZ;
        const wallTop = hit.wall.floorZ + hit.wall.height;

        // Calculate screen Y for a given world Z coordinate
        // screenY = centerY - (worldZ - eyeZ) * scale / distance
        const centerY = this.height / 2;
        const scale = this.height * 1.5;  // Perspective scale factor

        // Calculate screen Y positions for wall bottom and top
        const screenWallTop = centerY - ((wallTop - eyeZ) * scale) / perpDist;
        const screenWallBottom = centerY - ((wallBottom - eyeZ) * scale) / perpDist;

        const drawStart = Math.max(0, Math.floor(screenWallTop));
        const drawEnd = Math.min(this.height - 1, Math.floor(screenWallBottom));

        // Apply distance-based shading
        const shade = Math.max(0.2, 1 - perpDist / this.maxRenderDistance);

        // Calculate texture X coordinate from wallX (0-1 along wall segment)
        // Scale by wall length for proper tiling
        const wallLength = hit.wall.p1.distanceTo(hit.wall.p2);
        const texX = Math.floor((hit.wallX * wallLength * 2) % BRICK_TEX_SIZE);

        // Draw vertical line with brick texture
        const wallScreenHeight = screenWallBottom - screenWallTop;
        for (let y = drawStart; y <= drawEnd; y++) {
          // Calculate texture Y coordinate based on position in wall
          const wallY = (y - screenWallTop) / wallScreenHeight;
          const texY = Math.floor((wallY * hit.wall.height * 2) % BRICK_TEX_SIZE);

          // Sample brick texture
          const texValue = brickTexture[texY]?.[texX] ?? 0.5;

          // Apply texture to base color with shading
          const r = Math.floor(hit.color[0] * shade * texValue);
          const g = Math.floor(hit.color[1] * shade * texValue);
          const b = Math.floor(hit.color[2] * shade * texValue);

          const idx = (y * this.width + x) * 4;
          buffer[idx] = r;
          buffer[idx + 1] = g;
          buffer[idx + 2] = b;
          buffer[idx + 3] = 255;
        }
      }
    }

    // Render enemies as sprites
    this.renderEnemies(buffer, player, enemies);

    // Render HUD elements
    this.renderHUD(buffer, player);
  }

  renderEnemies(
    buffer: Uint8Array,
    player: Player,
    enemies: Enemy[]
  ): void {
    // Sort enemies by distance (far to near)
    const sortedEnemies = enemies
      .filter((e) => !e.dead)
      .map((e) => ({
        enemy: e,
        distance: noz(e.position).distanceTo(noz(player.position)),
      }))
      .sort((a, b) => b.distance - a.distance);

    for (const { enemy, distance } of sortedEnemies) {
      if (distance < 5 || distance > this.maxRenderDistance) continue;

      // Calculate sprite screen position
      const spriteDir = enemy.position.sub(player.position);
      const spriteAngle = Math.atan2(spriteDir.y, spriteDir.x);
      let angleDiff = spriteAngle - player.theta;

      // Normalize angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if sprite is in view
      if (Math.abs(angleDiff) > this.fov / 2 + 0.2) continue;

      // Calculate screen X position
      const screenX = Math.floor(
        (0.5 - angleDiff / this.fov) * this.width
      );

      // Calculate sprite size
      const spriteHeight = Math.min(
        this.height,
        (this.height * 15) / distance
      );
      const spriteWidth = spriteHeight * 0.8;

      const drawStartX = Math.floor(screenX - spriteWidth / 2);
      const drawEndX = Math.floor(screenX + spriteWidth / 2);
      const drawStartY = Math.floor((this.height - spriteHeight) / 2);
      const drawEndY = Math.floor((this.height + spriteHeight) / 2);

      // Apply distance shading
      const shade = Math.max(0.3, 1 - distance / this.maxRenderDistance);

      // Draw sprite (simple rectangle for now)
      for (let x = Math.max(0, drawStartX); x < Math.min(this.width, drawEndX); x++) {
        // Check depth buffer
        if (distance < this.depthBuffer[x]) {
          for (let y = Math.max(0, drawStartY); y < Math.min(this.height, drawEndY); y++) {
            // Simple sprite shape (diamond/oval)
            const xRel = (x - screenX) / (spriteWidth / 2);
            const yRel = (y - (this.height / 2)) / (spriteHeight / 2);
            if (xRel * xRel + yRel * yRel < 1) {
              const idx = (y * this.width + x) * 4;
              buffer[idx] = Math.floor(enemy.color[0] * shade);
              buffer[idx + 1] = Math.floor(enemy.color[1] * shade);
              buffer[idx + 2] = Math.floor(enemy.color[2] * shade);
              buffer[idx + 3] = 255;
            }
          }
        }
      }
    }
  }

  renderHUD(buffer: Uint8Array, player: Player): void {
    // Draw simple crosshair
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const crosshairSize = 5;

    for (let i = -crosshairSize; i <= crosshairSize; i++) {
      // Horizontal line
      const hIdx = (cy * this.width + cx + i) * 4;
      if (cx + i >= 0 && cx + i < this.width) {
        buffer[hIdx] = 255;
        buffer[hIdx + 1] = 255;
        buffer[hIdx + 2] = 255;
        buffer[hIdx + 3] = 255;
      }
      // Vertical line
      if (cy + i >= 0 && cy + i < this.height) {
        const vIdx = ((cy + i) * this.width + cx) * 4;
        buffer[vIdx] = 255;
        buffer[vIdx + 1] = 255;
        buffer[vIdx + 2] = 255;
        buffer[vIdx + 3] = 255;
      }
    }

    // Draw health bar at bottom left
    const barWidth = Math.floor(this.width * 0.2);
    const barHeight = 10;
    const barX = 10;
    const barY = this.height - barHeight - 10;
    const healthPercent = player.health / 100;

    for (let y = barY; y < barY + barHeight; y++) {
      for (let x = barX; x < barX + barWidth; x++) {
        const idx = (y * this.width + x) * 4;
        const filled = (x - barX) / barWidth <= healthPercent;
        buffer[idx] = filled ? 200 : 50;
        buffer[idx + 1] = filled ? 50 : 50;
        buffer[idx + 2] = filled ? 50 : 50;
        buffer[idx + 3] = 200;
      }
    }
  }
}

// ============================================================================
// Game State Management
// ============================================================================

export type GameState = 'playing' | 'paused' | 'gameover' | 'won';
type ChangeListener = () => void;

export class DoomGame {
  map: GameMap;
  player: Player;
  enemies: Enemy[] = [];
  renderer: RaycastRenderer;

  gameState: GameState = 'playing';
  score: number = 0;
  keysHeld: Set<string> = new Set();

  // Visual feedback
  shootFlashFrames: number = 0;  // Frames remaining for muzzle flash effect

  private changeListeners: ChangeListener[] = [];
  private lastTime: number = 0;

  constructor(width: number, height: number) {
    this.map = new GameMap();
    // Start player inside region 0, away from walls
    this.player = new Player(new Vector3(20, -15, 10));
    this.renderer = new RaycastRenderer(width, height);

    // Spawn some enemies
    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    // Spawn enemies far from player start (20, -15)
    const spawnPoints = [
      new Vector3(120, 80, 10),
      new Vector3(-80, 60, 10),
      new Vector3(150, -80, 10),
      new Vector3(-60, -100, 10),
      new Vector3(180, 40, 10),
    ];

    for (const pos of spawnPoints) {
      const enemy = new Enemy(pos, Math.random() * Math.PI * 2);
      this.enemies.push(enemy);
    }
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  setKey(key: string, pressed: boolean): void {
    if (pressed) {
      this.keysHeld.add(key);
    } else {
      this.keysHeld.delete(key);
    }
  }

  tick(currentTime: number): void {
    if (this.gameState !== 'playing') return;

    const dt = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    // Handle player input
    this.handleInput(dt);

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.position, this.map);
    }

    // Check player-enemy collision (damage)
    for (const enemy of this.enemies) {
      if (!enemy.dead && enemy.distanceTo(this.player) < 10) {
        this.player.health -= 0.01 * dt;
        if (this.player.health <= 0) {
          this.gameState = 'gameover';
          this.notifyChange();
        }
      }
    }

    // Check win condition
    if (this.enemies.every((e) => e.dead)) {
      this.gameState = 'won';
      this.notifyChange();
    }
  }

  private handleInput(dt: number): void {
    const moveSpeed = dt / 10;
    const turnSpeed = dt / 300;

    // Rotation - Fyne sends "Left"/"Right", not "ArrowLeft"/"ArrowRight"
    if (this.keysHeld.has('Left')) {
      this.player.theta += turnSpeed;
    }
    if (this.keysHeld.has('Right')) {
      this.player.theta -= turnSpeed;
    }

    // Movement
    const forward = this.player.getForwardVector();
    const right = this.player.getRightVector();
    let moveDir = ZERO.clone();

    // Fyne sends "Up"/"Down" for arrow keys, "w"/"s" for WASD (lowercase from our normalizer)
    if (this.keysHeld.has('Up') || this.keysHeld.has('w')) {
      moveDir = moveDir.add(forward);
    }
    if (this.keysHeld.has('Down') || this.keysHeld.has('s')) {
      moveDir = moveDir.sub(forward);
    }
    if (this.keysHeld.has('a')) {
      moveDir = moveDir.sub(right);
    }
    if (this.keysHeld.has('d')) {
      moveDir = moveDir.add(right);
    }

    if (moveDir.lengthSquared() > 0) {
      moveDir = moveDir.normalize().multiplyScalar(moveSpeed);
      const nextPos = this.player.position.add(moveDir);

      // Simple collision check - stay on floor
      const floorHeight = this.map.getFloorHeight(nextPos);
      if (floorHeight > -50) {
        this.player.position = nextPos;
        this.player.position.z = floorHeight + this.player.height;
      }
    }

    // Shooting - space key sends "Space", but TypedRune sends ' '
    // Our normalizer doesn't lowercase "Space" (multi-char), but ' ' stays as ' '
    if (this.keysHeld.has(' ') || this.keysHeld.has('Space')) {
      this.shoot();
      this.keysHeld.delete(' ');
      this.keysHeld.delete('Space');
    }
  }

  private shoot(): void {
    // Trigger muzzle flash visual feedback
    this.shootFlashFrames = 3;

    // Simple hitscan - find enemy in crosshair
    const forward = this.player.getForwardVector();
    const pos = this.player.position;

    let closestEnemy: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      // Check if enemy is roughly in front
      const toEnemy = enemy.position.sub(pos);
      const dist = toEnemy.length();
      const dot = toEnemy.normalize().dot(forward);

      // Within ~15 degree cone
      if (dot > 0.95 && dist < closestDist && dist < this.renderer.maxRenderDistance) {
        closestEnemy = enemy;
        closestDist = dist;
      }
    }

    if (closestEnemy) {
      closestEnemy.takeDamage(3);
      this.score += closestEnemy.dead ? 100 : 10;
      this.notifyChange();
    }
  }

  render(buffer: Uint8Array): void {
    this.renderer.render(buffer, this.player, this.map, this.enemies);

    // Apply muzzle flash effect (yellow tint on screen edges)
    if (this.shootFlashFrames > 0) {
      this.shootFlashFrames--;
      const w = this.renderer.width;
      const h = this.renderer.height;

      // Draw yellow flash bars on left and right edges
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < 20; x++) {
          // Left edge
          const idxL = (y * w + x) * 4;
          buffer[idxL] = Math.min(255, buffer[idxL] + 100);     // R
          buffer[idxL + 1] = Math.min(255, buffer[idxL + 1] + 80); // G

          // Right edge
          const idxR = (y * w + (w - 1 - x)) * 4;
          buffer[idxR] = Math.min(255, buffer[idxR] + 100);     // R
          buffer[idxR + 1] = Math.min(255, buffer[idxR + 1] + 80); // G
        }
      }

      // Draw flash at bottom center (gun position)
      const gunX = Math.floor(w / 2);
      const gunY = h - 30;
      for (let dy = -15; dy < 15; dy++) {
        for (let dx = -10; dx < 10; dx++) {
          const px = gunX + dx;
          const py = gunY + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 12) {
              const idx = (py * w + px) * 4;
              const intensity = (12 - dist) / 12;
              buffer[idx] = Math.min(255, buffer[idx] + Math.floor(200 * intensity));     // R
              buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.floor(150 * intensity)); // G
              buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.floor(50 * intensity));  // B
            }
          }
        }
      }
    }
  }

  reset(): void {
    this.player = new Player(new Vector3(20, -15, 10));
    this.enemies = [];
    this.spawnEnemies();
    this.gameState = 'playing';
    this.score = 0;
    this.keysHeld.clear();
    this.notifyChange();
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => l());
  }

  getScore(): number {
    return this.score;
  }

  getHealth(): number {
    return Math.max(0, Math.floor(this.player.health));
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getEnemiesAlive(): number {
    return this.enemies.filter((e) => !e.dead).length;
  }
}

// ============================================================================
// Tsyne UI Layer
// ============================================================================

export function buildYetAnotherDoomCloneApp(a: App): void {
  const canvasWidth = 400;
  const canvasHeight = 300;
  const game = new DoomGame(canvasWidth, canvasHeight);

  let canvas: TappableCanvasRaster;
  let scoreLabel: Label;
  let healthLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;

  a.window({ title: 'Yet Another Doom Clone', width: 450, height: 420 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Yet Another Doom Clone').withId('title');
            a.hbox(() => {
              scoreLabel = a.label('Score: 0').withId('scoreLabel');
              healthLabel = a.label('Health: 5').withId('healthLabel');
              statusLabel = a.label('Playing').withId('statusLabel');
            });
          });
        },
        center: () => {
          a.center(() => {
            canvas = a
              .tappableCanvasRaster(canvasWidth, canvasHeight, {
                onKeyDown: (key: string) => {
                  game.setKey(key, true);
                },
                onKeyUp: (key: string) => {
                  game.setKey(key, false);
                },
              })
              .withId('gameCanvas');
          });
        },
        bottom: () => {
          a.vbox(() => {
            a.label('Controls: Arrow keys to move/turn, WASD to strafe, Space to shoot');
            a.hbox(() => {
              a.button('New Game').onClick(async () => {
                game.reset();
                startGameLoop();
                updateUI();
                await canvas.requestFocus();
              }).withId('newGameBtn');
              a.button('Pause').onClick(async () => {
                if (gameLoop) {
                  clearInterval(gameLoop);
                  gameLoop = null;
                  statusLabel.setText('Paused');
                } else {
                  startGameLoop();
                  statusLabel.setText('Playing');
                }
                await canvas.requestFocus();
              }).withId('pauseBtn');
            });
          });
        },
      });
    });

    win.show();

    function startGameLoop(): void {
      if (gameLoop) clearInterval(gameLoop);

      gameLoop = setInterval(async () => {
        try {
          game.tick(Date.now());
          const buffer = new Uint8Array(canvasWidth * canvasHeight * 4);
          game.render(buffer);
          await canvas.setPixelBuffer(buffer);
          updateUI();
        } catch (err) {
          console.error('[DOOM] Game loop error:', err);
        }
      }, 33); // ~30 FPS
    }

    function updateUI(): void {
      scoreLabel.setText(`Score: ${game.getScore()}`);
      healthLabel.setText(`Health: ${game.getHealth()}`);

      const state = game.getGameState();
      if (state === 'gameover') {
        statusLabel.setText('Game Over!');
        if (gameLoop) {
          clearInterval(gameLoop);
          gameLoop = null;
        }
      } else if (state === 'won') {
        statusLabel.setText('You Win!');
        if (gameLoop) {
          clearInterval(gameLoop);
          gameLoop = null;
        }
      } else if (state === 'playing') {
        statusLabel.setText(`Playing - ${game.getEnemiesAlive()} enemies left`);
      }
    }

    // Subscribe to game changes
    game.subscribe(() => {
      updateUI();
    });

    // Start game loop after a short delay
    setTimeout(async () => {
      await canvas.requestFocus();
      startGameLoop();
    }, 100);
  });
}

// Entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Yet Another Doom Clone' }, buildYetAnotherDoomCloneApp);
}
