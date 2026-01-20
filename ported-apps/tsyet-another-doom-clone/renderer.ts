/**
 * RaycastRenderer for Yet Another Doom Clone
 * Software raycasting renderer with textured walls and floors
 */

import { Vector3 } from '../../cosyne/src/math3d';
import { rayLineIntersect } from './index';
import { Player } from './player';
import { GameMap, WallSegment } from './game-map';
import { Enemy } from './enemy';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';
import { BodyPart } from './body-part';
import { Chaingun, CHAINGUN_GEOMETRY } from './chaingun';
import { HitParticle, LightFlash } from './hit-particle';

/** Project vector to XY plane (set z to 0) */
function noz(v: Vector3): Vector3 {
  return new Vector3(v.x, v.y, 0);
}

// ============================================================================
// Raycasting Types
// ============================================================================

export interface RaycastHit {
  distance: number;
  wallX: number;  // Where on the wall texture (0-1)
  wall: WallSegment | null;
  side: number;   // 0 = NS, 1 = EW
  color: [number, number, number];
}

// ============================================================================
// Texture Generation
// ============================================================================

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

// ============================================================================
// Raycast Renderer Class
// ============================================================================

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
    enemies: Enemy[],
    bodyParts: BodyPart[] = [],
    chaingun?: Chaingun,
    hitParticles: HitParticle[] = [],
    lightFlashes: LightFlash[] = []
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

    // Render body parts (death particles)
    this.renderBodyParts(buffer, player, bodyParts);

    // Render hit particles (bullet impact sparks)
    this.renderHitParticles(buffer, player, hitParticles);

    // Apply light flash effects (brightens area around impact)
    this.applyLightFlashes(buffer, player, lightFlashes);

    // Render chaingun (weapon model)
    if (chaingun) {
      this.renderChaingun(buffer, chaingun);
    }

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

      // Calculate sprite size based on distance
      const scale = (this.height * 15) / distance;

      // Apply distance shading
      const shade = Math.max(0.3, 1 - distance / this.maxRenderDistance);

      // Render based on enemy type
      if (enemy.type === 'walking') {
        this.renderWalkingEnemy(buffer, enemy as WalkingEnemy, screenX, scale, shade, distance);
      } else {
        this.renderFlyingEnemy(buffer, enemy as FlyingEnemy, screenX, scale, shade, distance);
      }
    }
  }

  /**
   * Render a walking enemy as a blocky humanoid
   * Made of boxes: body, head, 2 legs, 2 arms
   */
  renderWalkingEnemy(
    buffer: Uint8Array,
    enemy: WalkingEnemy,
    screenX: number,
    scale: number,
    shade: number,
    distance: number
  ): void {
    const centerY = this.height / 2;

    // Walking animation - legs and arms swing based on time
    const armSwing = Math.sin(enemy.time) * 0.3;
    const legSwing = Math.sin(enemy.time) * 0.25;

    // Vertical bob when walking (subtle)
    const verticalBob = Math.abs(Math.sin(enemy.time * 2)) * scale * 0.05;

    // Body dimensions (relative to scale)
    const bodyWidth = scale * 0.4;
    const bodyHeight = scale * 0.35;
    const headSize = scale * 0.25;
    const limbWidth = scale * 0.12;
    const limbHeight = scale * 0.3;

    // Draw body (center torso)
    this.drawBox(buffer, screenX, centerY - verticalBob, bodyWidth, bodyHeight,
      enemy.bodyColor, shade, distance);

    // Draw head (above body)
    this.drawBox(buffer, screenX, centerY - bodyHeight * 0.6 - headSize * 0.4 - verticalBob,
      headSize, headSize, enemy.headColor, shade, distance);

    // Draw eyes on head (two small red dots)
    const eyeSize = scale * 0.06;
    const eyeY = centerY - bodyHeight * 0.6 - headSize * 0.4 - verticalBob;
    this.drawBox(buffer, screenX - headSize * 0.25, eyeY, eyeSize, eyeSize,
      enemy.eyeColor, shade, distance);
    this.drawBox(buffer, screenX + headSize * 0.25, eyeY, eyeSize, eyeSize,
      enemy.eyeColor, shade, distance);

    // Draw legs (below body, animated)
    const legY = centerY + bodyHeight * 0.4 - verticalBob;
    // Left leg swings forward/back
    this.drawBox(buffer, screenX - bodyWidth * 0.25 + legSwing * scale * 0.2, legY + limbHeight * 0.5,
      limbWidth, limbHeight, enemy.bodyColor, shade * 0.9, distance);
    // Right leg opposite phase
    this.drawBox(buffer, screenX + bodyWidth * 0.25 - legSwing * scale * 0.2, legY + limbHeight * 0.5,
      limbWidth, limbHeight, enemy.bodyColor, shade * 0.9, distance);

    // Draw arms (sides of body, animated)
    const armY = centerY - bodyHeight * 0.1 - verticalBob;
    // Left arm
    this.drawBox(buffer, screenX - bodyWidth * 0.5 - limbWidth * 0.3 - armSwing * scale * 0.15, armY,
      limbWidth * 0.8, limbHeight * 0.8, enemy.bodyColor, shade * 0.85, distance);
    // Right arm opposite phase
    this.drawBox(buffer, screenX + bodyWidth * 0.5 + limbWidth * 0.3 + armSwing * scale * 0.15, armY,
      limbWidth * 0.8, limbHeight * 0.8, enemy.bodyColor, shade * 0.85, distance);
  }

  /**
   * Render a flying enemy with flapping wings
   */
  renderFlyingEnemy(
    buffer: Uint8Array,
    enemy: FlyingEnemy,
    screenX: number,
    scale: number,
    shade: number,
    distance: number
  ): void {
    const centerY = this.height / 2;

    // Wing flap animation
    const wingAngle = Math.sin(enemy.time * 8) * 0.5;  // Fast flapping
    const verticalBob = Math.sin(enemy.time * 2) * scale * 0.1;

    // Body dimensions (smaller than walking enemy)
    const bodyWidth = scale * 0.2;
    const bodyHeight = scale * 0.15;
    const wingSpan = scale * 0.5;
    const wingHeight = scale * 0.08;

    // Draw central body (elongated rectangle)
    this.drawBox(buffer, screenX, centerY - verticalBob, bodyWidth, bodyHeight,
      enemy.bodyColor, shade, distance);

    // Draw wings (trapezoid-ish, angle based on flap)
    // Left wing
    const leftWingX = screenX - bodyWidth * 0.5 - wingSpan * 0.4;
    const leftWingY = centerY - verticalBob + wingAngle * scale * 0.2;
    this.drawWing(buffer, leftWingX, leftWingY, wingSpan * 0.6, wingHeight,
      enemy.wingColor, shade, distance, -wingAngle, true);

    // Right wing
    const rightWingX = screenX + bodyWidth * 0.5 + wingSpan * 0.4;
    const rightWingY = centerY - verticalBob + wingAngle * scale * 0.2;
    this.drawWing(buffer, rightWingX, rightWingY, wingSpan * 0.6, wingHeight,
      enemy.wingColor, shade, distance, wingAngle, false);

    // Draw glowing red eye stripe
    const eyeWidth = bodyWidth * 1.2;
    const eyeHeight = scale * 0.04;
    this.drawBox(buffer, screenX, centerY - bodyHeight * 0.2 - verticalBob,
      eyeWidth, eyeHeight, enemy.eyeColor, shade, distance);
  }

  /**
   * Draw a simple rectangular box
   */
  drawBox(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    width: number,
    height: number,
    color: [number, number, number],
    shade: number,
    distance: number
  ): void {
    const startX = Math.floor(cx - width / 2);
    const endX = Math.floor(cx + width / 2);
    const startY = Math.floor(cy - height / 2);
    const endY = Math.floor(cy + height / 2);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      if (distance >= this.depthBuffer[x]) continue;
      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.floor(color[0] * shade);
        buffer[idx + 1] = Math.floor(color[1] * shade);
        buffer[idx + 2] = Math.floor(color[2] * shade);
        buffer[idx + 3] = 255;
      }
    }
  }

  /**
   * Draw a wing shape (tapers toward tip)
   */
  drawWing(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    width: number,
    height: number,
    color: [number, number, number],
    shade: number,
    distance: number,
    angle: number,
    isLeft: boolean
  ): void {
    const startX = Math.floor(cx - width / 2);
    const endX = Math.floor(cx + width / 2);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      if (distance >= this.depthBuffer[x]) continue;

      // Wing tapers - calculate taper factor based on x position
      const xRel = (x - cx) / (width / 2);
      const taperFactor = isLeft ? (1 - xRel) * 0.5 + 0.5 : (1 + xRel) * 0.5 + 0.5;
      const localHeight = height * taperFactor;

      // Apply angle offset
      const yOffset = (x - cx) * Math.sin(angle) * 0.3;

      const localStartY = Math.floor(cy - localHeight / 2 + yOffset);
      const localEndY = Math.floor(cy + localHeight / 2 + yOffset);

      for (let y = Math.max(0, localStartY); y < Math.min(this.height, localEndY); y++) {
        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.floor(color[0] * shade);
        buffer[idx + 1] = Math.floor(color[1] * shade);
        buffer[idx + 2] = Math.floor(color[2] * shade);
        buffer[idx + 3] = 255;
      }
    }
  }

  /**
   * Render body parts (death particles) as spinning cubes
   */
  renderBodyParts(
    buffer: Uint8Array,
    player: Player,
    bodyParts: BodyPart[]
  ): void {
    if (bodyParts.length === 0) return;

    // Sort by distance (far to near)
    const sortedParts = bodyParts
      .filter((p) => !p.dead)
      .map((p) => ({
        part: p,
        distance: noz(p.position).distanceTo(noz(player.position)),
      }))
      .sort((a, b) => b.distance - a.distance);

    for (const { part, distance } of sortedParts) {
      if (distance < 2 || distance > this.maxRenderDistance) continue;

      // Calculate sprite screen position
      const spriteDir = part.position.sub(player.position);
      const spriteAngle = Math.atan2(spriteDir.y, spriteDir.x);
      let angleDiff = spriteAngle - player.theta;

      // Normalize angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if in view
      if (Math.abs(angleDiff) > this.fov / 2 + 0.3) continue;

      // Calculate screen X position
      const screenX = Math.floor((0.5 - angleDiff / this.fov) * this.width);

      // Calculate screen Y based on height difference
      const eyeZ = player.position.z;
      const heightDiff = part.position.z - eyeZ;
      const centerY = this.height / 2;
      const scale = this.height * 1.5;
      const screenY = centerY - (heightDiff * scale) / distance;

      // Calculate sprite size based on distance
      const partScale = (this.height * part.size * 2) / distance;

      // Apply distance shading
      const shade = Math.max(0.3, 1 - distance / this.maxRenderDistance);

      // Draw spinning cube effect
      // Apply rotation to create illusion of spinning
      const rotPhase = part.rotationX + part.rotationY;
      const wobble = Math.sin(rotPhase) * partScale * 0.2;

      this.drawBox(
        buffer,
        screenX + wobble,
        screenY,
        partScale,
        partScale,
        part.color,
        shade,
        distance
      );
    }
  }

  /**
   * Render hit particles (bullet impact sparks)
   * Similar to body parts but smaller, brighter, and with glow effect
   */
  renderHitParticles(
    buffer: Uint8Array,
    player: Player,
    hitParticles: HitParticle[]
  ): void {
    if (hitParticles.length === 0) return;

    // Sort by distance (far to near)
    const sortedParticles = hitParticles
      .filter((p) => !p.dead)
      .map((p) => ({
        particle: p,
        distance: noz(p.position).distanceTo(noz(player.position)),
      }))
      .sort((a, b) => b.distance - a.distance);

    for (const { particle, distance } of sortedParticles) {
      if (distance < 2 || distance > this.maxRenderDistance) continue;

      // Calculate sprite screen position
      const spriteDir = particle.position.sub(player.position);
      const spriteAngle = Math.atan2(spriteDir.y, spriteDir.x);
      let angleDiff = spriteAngle - player.theta;

      // Normalize angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if in view
      if (Math.abs(angleDiff) > this.fov / 2 + 0.3) continue;

      // Calculate screen X position
      const screenX = Math.floor((0.5 - angleDiff / this.fov) * this.width);

      // Calculate screen Y based on height difference
      const eyeZ = player.position.z;
      const heightDiff = particle.position.z - eyeZ;
      const centerY = this.height / 2;
      const scale = this.height * 1.5;
      const screenY = centerY - (heightDiff * scale) / distance;

      // Calculate particle size based on distance (smaller than body parts)
      const particleScale = (this.height * particle.size * 1.5) / distance;

      // Apply brightness (fades over time)
      const brightness = particle.brightness;

      // Draw glowing spark
      this.drawGlowingParticle(
        buffer,
        screenX,
        screenY,
        particleScale,
        particle.color,
        brightness,
        distance
      );
    }
  }

  /**
   * Draw a glowing particle (spark effect)
   */
  drawGlowingParticle(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    size: number,
    color: [number, number, number],
    brightness: number,
    distance: number
  ): void {
    // Draw with glow effect (larger radius, fading edges)
    const glowRadius = size * 2;
    const startX = Math.floor(cx - glowRadius);
    const endX = Math.ceil(cx + glowRadius);
    const startY = Math.floor(cy - glowRadius);
    const endY = Math.ceil(cy + glowRadius);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      if (distance >= this.depthBuffer[x]) continue;

      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= glowRadius) {
          // Intensity falls off with distance from center
          const intensity = Math.pow(1 - dist / glowRadius, 2) * brightness;

          if (intensity > 0.05) {
            const idx = (y * this.width + x) * 4;
            // Additive blending for glow effect
            buffer[idx] = Math.min(255, buffer[idx] + Math.floor(color[0] * intensity));
            buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.floor(color[1] * intensity));
            buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.floor(color[2] * intensity));
          }
        }
      }
    }
  }

  /**
   * Apply light flash effects to the scene
   * Creates a bright spot around impact points
   */
  applyLightFlashes(
    buffer: Uint8Array,
    player: Player,
    lightFlashes: LightFlash[]
  ): void {
    for (const flash of lightFlashes) {
      if (flash.dead) continue;

      // Calculate screen position of flash
      const spriteDir = flash.position.sub(player.position);
      const distance = noz(spriteDir).length();

      if (distance < 2 || distance > this.maxRenderDistance) continue;

      const spriteAngle = Math.atan2(spriteDir.y, spriteDir.x);
      let angleDiff = spriteAngle - player.theta;

      // Normalize angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if in view
      if (Math.abs(angleDiff) > this.fov / 2 + 0.5) continue;

      // Calculate screen position
      const screenX = Math.floor((0.5 - angleDiff / this.fov) * this.width);
      const eyeZ = player.position.z;
      const heightDiff = flash.position.z - eyeZ;
      const centerY = this.height / 2;
      const scale = this.height * 1.5;
      const screenY = centerY - (heightDiff * scale) / distance;

      // Flash radius on screen (inversely proportional to distance)
      const flashRadius = (flash.radius * this.height) / distance;

      // Apply bright flash
      this.applyFlashEffect(
        buffer,
        screenX,
        screenY,
        flashRadius,
        flash.color,
        flash.intensity
      );
    }
  }

  /**
   * Apply a flash effect (bright glow) at screen position
   */
  applyFlashEffect(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    radius: number,
    color: [number, number, number],
    intensity: number
  ): void {
    const startX = Math.floor(cx - radius);
    const endX = Math.ceil(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.ceil(cy + radius);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          // Intensity falls off smoothly from center
          const falloff = Math.pow(1 - dist / radius, 1.5) * intensity;

          if (falloff > 0.02) {
            const idx = (y * this.width + x) * 4;
            // Additive blending
            buffer[idx] = Math.min(255, buffer[idx] + Math.floor(color[0] * falloff * 0.5));
            buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.floor(color[1] * falloff * 0.5));
            buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.floor(color[2] * falloff * 0.5));
          }
        }
      }
    }
  }

  /**
   * Render the chaingun (3D weapon model) at the bottom of screen
   * Viewed from 3/4 angle - looking down the barrels toward the muzzle
   * Made of cylinders: body tube + 8 spinning barrels with visible muzzle holes
   */
  renderChaingun(buffer: Uint8Array, chaingun: Chaingun): void {
    const centerX = this.width / 2;
    const baseY = this.height * 0.92;  // Gun positioned near bottom

    // Get gun offset (bobbing + recoil)
    const [bobX, bobY, bobZ] = chaingun.getOffset();

    // Scale factors for gun rendering
    const gunScale = this.width * 0.25;  // Larger gun

    // Apply bob and recoil to position
    const gunX = centerX + bobX * this.width * 0.5;
    const gunY = baseY + bobY * this.height * 0.5 - bobZ * this.height * 0.3;

    // Get barrel rotation
    const rotation = chaingun.barrelRotation;

    // 3/4 view parameters - we're looking at the gun from slightly above
    const tiltAngle = 0.3;  // How much the front face is tilted toward us
    const perspectiveSquash = 0.4;  // Vertical compression for perspective

    // Gun body dimensions
    const bodyRadius = gunScale * 0.35;
    const bodyLength = gunScale * 0.8;
    const barrelRadius = gunScale * 0.08;
    const barrelCircleRadius = gunScale * 0.22;  // How far barrels are from center

    // Draw gun body (cylinder extending down-back from muzzle)
    // Back end first (darker, partially hidden)
    this.drawEllipse(
      buffer,
      gunX,
      gunY + bodyLength * perspectiveSquash,
      bodyRadius,
      bodyRadius * perspectiveSquash,
      [60, 60, 70],  // Dark back
      [80, 80, 90]
    );

    // Draw the body tube sides (connecting front and back ellipses)
    this.drawGunBody(
      buffer,
      gunX,
      gunY,
      bodyRadius,
      bodyLength * perspectiveSquash,
      perspectiveSquash,
      chaingun.bodyColor
    );

    // Draw barrels - sort by depth (back ones first)
    const barrelPositions: Array<{angle: number; x: number; y: number; depth: number}> = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) + rotation;
      const bx = Math.cos(angle) * barrelCircleRadius;
      const by = Math.sin(angle) * barrelCircleRadius * perspectiveSquash;
      // Depth based on y position (sin of angle) - positive sin = back
      barrelPositions.push({ angle, x: bx, y: by, depth: Math.sin(angle) });
    }
    // Sort back to front
    barrelPositions.sort((a, b) => b.depth - a.depth);

    // Draw barrel tubes (the length of each barrel)
    for (const bp of barrelPositions) {
      const barrelLength = gunScale * 0.5;

      // Shade based on depth
      const shade = 0.5 + 0.5 * (1 - bp.depth) / 2;
      const tubeColor: [number, number, number] = [
        Math.floor(chaingun.barrelColor[0] * shade),
        Math.floor(chaingun.barrelColor[1] * shade),
        Math.floor(chaingun.barrelColor[2] * shade),
      ];

      // Draw barrel tube extending from body toward camera
      // Tube goes from (gunX + bp.x, gunY + bp.y) upward
      this.drawBarrelTube(
        buffer,
        gunX + bp.x,
        gunY + bp.y,
        barrelRadius,
        barrelLength,
        tubeColor,
        bp.depth
      );
    }

    // Draw front face (muzzle plate) - large ellipse
    this.drawEllipse(
      buffer,
      gunX,
      gunY,
      bodyRadius * 0.9,
      bodyRadius * perspectiveSquash * 0.9,
      chaingun.bodyColor,
      chaingun.highlightColor
    );

    // Draw barrel holes on front face (muzzle openings)
    for (const bp of barrelPositions) {
      // Only draw muzzle holes for barrels in front half (visible on face)
      const holeColor: [number, number, number] = [20, 20, 25];  // Dark hole
      const highlightColor: [number, number, number] = [50, 50, 60];

      this.drawEllipse(
        buffer,
        gunX + bp.x,
        gunY + bp.y,
        barrelRadius * 0.9,
        barrelRadius * perspectiveSquash * 0.9,
        holeColor,
        highlightColor
      );
    }

    // Draw center spindle
    this.drawEllipse(
      buffer,
      gunX,
      gunY,
      barrelRadius * 1.2,
      barrelRadius * perspectiveSquash * 1.2,
      [90, 90, 100],
      chaingun.highlightColor
    );
  }

  /**
   * Draw the cylindrical gun body (sides connecting front and back ellipses)
   */
  drawGunBody(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    radius: number,
    length: number,
    squash: number,
    color: [number, number, number]
  ): void {
    const startX = Math.floor(cx - radius);
    const endX = Math.ceil(cx + radius);
    const startY = Math.floor(cy);
    const endY = Math.ceil(cy + length);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      const dx = x - cx;
      // Check if x is within the ellipse width
      if (Math.abs(dx) > radius) continue;

      // Calculate the edge position for this x (ellipse equation)
      const edgeFactor = Math.abs(dx) / radius;

      // Shading based on x position (left side darker, right side lighter)
      const shade = 0.6 + 0.4 * (1 - edgeFactor) * (0.5 + 0.5 * (dx / radius + 1) / 2);

      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        // Gradient from front to back (front lighter)
        const lengthFactor = (y - cy) / length;
        const finalShade = shade * (1 - lengthFactor * 0.3);

        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.floor(color[0] * finalShade);
        buffer[idx + 1] = Math.floor(color[1] * finalShade);
        buffer[idx + 2] = Math.floor(color[2] * finalShade);
        buffer[idx + 3] = 255;
      }
    }
  }

  /**
   * Draw a barrel tube extending toward the camera
   */
  drawBarrelTube(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    radius: number,
    length: number,
    color: [number, number, number],
    depth: number
  ): void {
    // Barrel extends upward (toward camera) from cy
    const startY = Math.floor(cy - length);
    const endY = Math.floor(cy);

    const halfWidth = radius;
    const startX = Math.floor(cx - halfWidth);
    const endX = Math.ceil(cx + halfWidth);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      const dx = (x - cx) / halfWidth;
      // Cylindrical shading
      const cylShade = Math.sqrt(1 - dx * dx);

      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        // Perspective: narrower toward the back (top of screen)
        const yFactor = (y - startY) / length;
        const perspWidth = halfWidth * (0.7 + 0.3 * yFactor);

        if (Math.abs(x - cx) > perspWidth) continue;

        const shade = cylShade * (0.7 + 0.3 * yFactor);

        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.floor(color[0] * shade);
        buffer[idx + 1] = Math.floor(color[1] * shade);
        buffer[idx + 2] = Math.floor(color[2] * shade);
        buffer[idx + 3] = 255;
      }
    }
  }

  /**
   * Draw an ellipse with shading (for gun faces)
   */
  drawEllipse(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    baseColor: [number, number, number],
    highlightColor: [number, number, number]
  ): void {
    const startX = Math.floor(cx - radiusX);
    const endX = Math.ceil(cx + radiusX);
    const startY = Math.floor(cy - radiusY);
    const endY = Math.ceil(cy + radiusY);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        const dx = (x - cx) / radiusX;
        const dy = (y - cy) / radiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 1) {
          // Shading: lighter on top-right, darker on bottom-left (3D effect)
          const shade = 0.6 + 0.4 * (1 - dist) + 0.2 * (-dy);
          // Edge highlight
          const edgeFactor = dist;
          const highlight = edgeFactor > 0.7 ? (edgeFactor - 0.7) / 0.3 * 0.3 : 0;

          const r = Math.floor(baseColor[0] * shade + (highlightColor[0] - baseColor[0]) * highlight);
          const g = Math.floor(baseColor[1] * shade + (highlightColor[1] - baseColor[1]) * highlight);
          const b = Math.floor(baseColor[2] * shade + (highlightColor[2] - baseColor[2]) * highlight);

          const idx = (y * this.width + x) * 4;
          buffer[idx] = Math.min(255, Math.max(0, r));
          buffer[idx + 1] = Math.min(255, Math.max(0, g));
          buffer[idx + 2] = Math.min(255, Math.max(0, b));
          buffer[idx + 3] = 255;
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
