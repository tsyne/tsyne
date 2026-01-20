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
  walls: Wall[] = [];

  constructor() {
    this.loadLevel(0);
  }

  loadLevel(levelIndex: number): void {
    const levelData = LEVEL_DATA[levelIndex] || LEVEL_DATA[0];
    this.regions = runTurtle(uncompress(levelData));

    // Build walls from regions
    this.walls = [];
    const potentialWalls = new Map<string, number[][]>();

    for (const region of this.regions) {
      for (const [p1, p2] of region.lines) {
        const key = [p1.x, p1.y, p2.x, p2.y].sort((a, b) => a - b).join(',');
        const heights = potentialWalls.get(key) || [];
        heights.push([region.floorHeight, region.ceilHeight]);
        potentialWalls.set(key, heights);
      }
    }

    // Create walls where heights differ
    for (const [key, heights] of potentialWalls) {
      const [a, b, c, d] = key.split(',').map(Number);
      const p1 = new Vector3(a, b, 0);
      const p2 = new Vector3(c, d, 0);
      const mid = p1.lerp(p2, 0.5);
      const angle = -angleBetween(p1, mid);
      const halfWidth = p1.distanceTo(mid);

      // Transpose heights to get floor/ceiling pairs
      if (heights.length === 1) {
        // Single-sided wall
        const h = heights[0];
        this.walls.push(new Wall(mid, angle, halfWidth, h[1] - h[0]));
      } else if (heights.length === 2) {
        // Two-sided - create walls for floor/ceiling differences
        const floors = heights.map((h) => h[0]).sort((a, b) => a - b);
        const ceils = heights.map((h) => h[1]).sort((a, b) => a - b);

        if (floors[0] !== floors[1]) {
          const wallHeight = floors[1] - floors[0];
          const wallMid = mid.add(new Vector3(0, 0, floors[0]));
          this.walls.push(new Wall(wallMid, angle, halfWidth, wallHeight));
        }
        if (ceils[0] !== ceils[1]) {
          const wallHeight = ceils[1] - ceils[0];
          const wallMid = mid.add(new Vector3(0, 0, ceils[0]));
          this.walls.push(new Wall(wallMid, angle, halfWidth, wallHeight));
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
// Wall Class
// ============================================================================

export class Wall {
  position: Vector3;
  theta: number;
  width: number;
  height: number;
  solid: boolean = true;
  parallelDir: Vector3;

  constructor(position: Vector3, theta: number, width: number, height: number) {
    this.position = position;
    this.theta = theta;
    this.width = width;
    this.height = Math.abs(height);
    if (height < 0) {
      this.position = this.position.add(new Vector3(0, 0, height));
    }
    this.parallelDir = new Vector3(
      -Math.sin(this.theta) * this.width,
      Math.cos(this.theta) * this.width,
      0
    );
  }
}

// ============================================================================
// Player Class
// ============================================================================

export class Player {
  position: Vector3;
  theta: number = 0;
  theta2: number = 0;  // Vertical look angle
  health: number = 5;
  velocity: Vector3 = ZERO.clone();
  height: number = 5;

  constructor(position: Vector3) {
    this.position = position.clone();
  }

  getForwardVector(): Vector3 {
    return rotateXY(Y_DIR, this.theta);
  }

  getRightVector(): Vector3 {
    return rotateXY(X_DIR, this.theta);
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
  wallX: number;  // Where on the wall texture
  wall: Wall | null;
  side: number;   // 0 = NS, 1 = EW
  color: [number, number, number];
}

export class RaycastRenderer {
  width: number;
  height: number;
  fov: number = Math.PI / 3;  // 60 degrees
  maxRenderDistance: number = 200;

  // Depth buffer for sprite sorting
  depthBuffer: number[];

  // Wall colors
  wallColorNS: [number, number, number] = [100, 100, 120];
  wallColorEW: [number, number, number] = [80, 80, 100];
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
      const p1 = wall.position.add(wall.parallelDir);
      const p2 = wall.position.sub(wall.parallelDir);

      const hit = rayLineIntersect(pos, rayDir, p1, p2);
      if (hit && hit[0] < closestHit.distance) {
        // Check height intersection
        const hitPos = pos.add(rayDir.multiplyScalar(hit[0]));
        const floorAtHit = map.getFloorHeight(hitPos);

        closestHit = {
          distance: hit[0],
          wallX: hit[1],
          wall: wall,
          side: Math.abs(Math.cos(wall.theta)) > 0.5 ? 0 : 1,
          color: Math.abs(Math.cos(wall.theta)) > 0.5 ? this.wallColorNS : this.wallColorEW,
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

    // Fill background (ceiling and floor)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        if (y < this.height / 2) {
          // Ceiling
          buffer[idx] = this.ceilingColor[0];
          buffer[idx + 1] = this.ceilingColor[1];
          buffer[idx + 2] = this.ceilingColor[2];
        } else {
          // Floor
          buffer[idx] = this.floorColor[0];
          buffer[idx + 1] = this.floorColor[1];
          buffer[idx + 2] = this.floorColor[2];
        }
        buffer[idx + 3] = 255;
      }
    }

    // Cast rays for each column
    const halfFov = this.fov / 2;
    for (let x = 0; x < this.width; x++) {
      // Calculate ray angle
      const rayAngle =
        player.theta + halfFov - (x / this.width) * this.fov;

      const hit = this.castRay(player, map, rayAngle);

      // Fix fisheye distortion
      const perpDist = hit.distance * Math.cos(rayAngle - player.theta);
      this.depthBuffer[x] = perpDist;

      if (perpDist < this.maxRenderDistance && hit.wall) {
        // Calculate wall height on screen
        const wallHeight = Math.min(
          this.height * 2,
          (this.height * 20) / perpDist
        );
        const drawStart = Math.max(0, Math.floor((this.height - wallHeight) / 2));
        const drawEnd = Math.min(
          this.height - 1,
          Math.floor((this.height + wallHeight) / 2)
        );

        // Apply distance-based shading
        const shade = Math.max(0.2, 1 - perpDist / this.maxRenderDistance);
        const r = Math.floor(hit.color[0] * shade);
        const g = Math.floor(hit.color[1] * shade);
        const b = Math.floor(hit.color[2] * shade);

        // Draw vertical line
        for (let y = drawStart; y <= drawEnd; y++) {
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
    const healthPercent = player.health / 9;

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

  private changeListeners: ChangeListener[] = [];
  private lastTime: number = 0;

  constructor(width: number, height: number) {
    this.map = new GameMap();
    this.player = new Player(new Vector3(0, 0, 10));
    this.renderer = new RaycastRenderer(width, height);

    // Spawn some enemies
    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    // Spawn enemies in various positions
    const spawnPoints = [
      new Vector3(50, 50, 10),
      new Vector3(-50, 30, 10),
      new Vector3(80, -40, 10),
      new Vector3(-30, -60, 10),
      new Vector3(100, 20, 10),
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

    // Rotation
    if (this.keysHeld.has('ArrowLeft') || this.keysHeld.has('Left')) {
      this.player.theta += turnSpeed;
    }
    if (this.keysHeld.has('ArrowRight') || this.keysHeld.has('Right')) {
      this.player.theta -= turnSpeed;
    }

    // Movement
    const forward = this.player.getForwardVector();
    const right = this.player.getRightVector();
    let moveDir = ZERO.clone();

    if (this.keysHeld.has('ArrowUp') || this.keysHeld.has('Up') || this.keysHeld.has('w')) {
      moveDir = moveDir.add(forward);
    }
    if (this.keysHeld.has('ArrowDown') || this.keysHeld.has('Down') || this.keysHeld.has('s')) {
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

    // Shooting
    if (this.keysHeld.has(' ') || this.keysHeld.has('Space')) {
      this.shoot();
      this.keysHeld.delete(' ');
      this.keysHeld.delete('Space');
    }
  }

  private shoot(): void {
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
  }

  reset(): void {
    this.player = new Player(new Vector3(0, 0, 10));
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
