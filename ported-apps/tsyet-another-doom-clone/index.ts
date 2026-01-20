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
} from '../../cosyne/src/math3d';

// ============================================================================
// Re-exports from extracted modules
// ============================================================================

// Re-export Vector3 for tests
export { Vector3 };

// Re-export utilities for tests
export { clamp, urandom, urandomVector, rotateXY, rotateXZ, rotateYZ };

// Re-export from extracted modules
export { Player } from './player';
export {
  GameMap,
  MapPolygon,
  WallSegment,
  Wall,
  runTurtle,
  TurtleBuilder,
  LevelInfo,
  getLevelCount,
  getLevelInfo,
  getAllLevelInfos,
} from './game-map';
export { RaycastRenderer, RaycastHit } from './renderer';
export { Enemy, EnemyState, EnemyType, IGameMap } from './enemy';
export { WalkingEnemy } from './walking-enemy';
export { FlyingEnemy } from './flying-enemy';
export { BodyPart, createWalkingEnemyBodyParts, createFlyingEnemyBodyParts } from './body-part';
export { Chaingun, ChaingunGeometry, CHAINGUN_GEOMETRY } from './chaingun';
export { HitParticle, LightFlash, createWallHitParticles, createEnemyHitParticles } from './hit-particle';

// Import for local use
import { Player } from './player';
import { GameMap, getLevelCount, getLevelInfo, LevelInfo } from './game-map';
import { RaycastRenderer } from './renderer';
import { Enemy } from './enemy';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';
import { BodyPart, createWalkingEnemyBodyParts, createFlyingEnemyBodyParts } from './body-part';
import { Chaingun } from './chaingun';
import { HitParticle, LightFlash, createWallHitParticles, createEnemyHitParticles } from './hit-particle';

// ============================================================================
// Constants
// ============================================================================

export const ZERO = Vector3.zero();
export const X_DIR = Vector3.right();
export const Y_DIR = Vector3.up();
export const Z_DIR = Vector3.forward();

// ============================================================================
// Vector3 Helper Functions
// ============================================================================

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
// Game State Management
// ============================================================================

export type GameState = 'playing' | 'paused' | 'gameover' | 'won';
type ChangeListener = () => void;

// ============================================================================
// Screen Shake System
// ============================================================================

/**
 * ScreenShake - handles screen shake effects when shooting
 * Uses damped oscillation for natural-feeling shake
 */
export class ScreenShake {
  private intensity: number = 0;
  private decay: number = 0.9;       // How fast shake decays (0-1)
  private frequency: number = 25;    // Oscillation frequency
  private time: number = 0;

  // Current offset values
  offsetX: number = 0;
  offsetY: number = 0;
  rotation: number = 0;

  /**
   * Trigger a new shake
   * @param intensity Initial shake intensity (pixels)
   */
  shake(intensity: number = 3): void {
    // Add to existing intensity for continuous fire
    this.intensity = Math.min(this.intensity + intensity, 10);
  }

  /**
   * Update shake state
   * @param dt Delta time in milliseconds
   */
  update(dt: number): void {
    if (this.intensity < 0.01) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.rotation = 0;
      return;
    }

    this.time += dt;

    // Damped oscillation
    const shake = this.intensity * Math.exp(-this.time * 0.005);

    // Random direction per frame for chaotic feel
    const angle = this.time * this.frequency * 0.001;
    this.offsetX = Math.sin(angle * 1.1) * shake;
    this.offsetY = Math.cos(angle * 1.3) * shake;
    this.rotation = Math.sin(angle * 0.7) * shake * 0.003;

    // Decay intensity
    this.intensity *= Math.pow(this.decay, dt / 16);
  }

  /**
   * Get current shake offsets
   */
  getOffsets(): { x: number; y: number; rotation: number } {
    return { x: this.offsetX, y: this.offsetY, rotation: this.rotation };
  }
}

// ============================================================================
// Wall Collision Detection (8 Rays)
// ============================================================================

/**
 * Check collision using 8 rays cast from player position
 * Returns adjusted position that doesn't collide with walls
 *
 * @param position Current player position
 * @param newPosition Desired new position
 * @param map Game map with walls
 * @param collisionRadius Minimum distance from walls
 * @returns Adjusted position that maintains distance from walls
 */
export function checkWallCollision(
  position: Vector3,
  newPosition: Vector3,
  map: GameMap,
  collisionRadius: number = 4
): Vector3 {
  // First check if the desired position has valid floor
  const desiredFloor = map.getFloorHeight(newPosition);
  if (desiredFloor < -50) {
    // Can't move there, stay in place
    return position.clone();
  }

  // Cast 8 rays in all directions from the NEW position
  const numRays = 8;
  let adjustedPos = newPosition.clone();

  // Check each direction for nearby walls
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    const rayDir = new Vector3(Math.cos(angle), Math.sin(angle), 0);

    // Check against all walls
    for (const wall of map.walls) {
      const hit = rayLineIntersect(
        new Vector3(adjustedPos.x, adjustedPos.y, 0),
        rayDir,
        wall.p1,
        wall.p2
      );

      // If ray hits a wall within collision radius, push back
      if (hit && hit[0] > 0 && hit[0] < collisionRadius) {
        // Calculate push-back direction (opposite of ray)
        const pushBack = collisionRadius - hit[0];
        const pushVec = rayDir.multiplyScalar(pushBack);
        const testPos = adjustedPos.sub(pushVec);

        // Only apply push-back if the result is still on valid floor
        const testFloor = map.getFloorHeight(testPos);
        if (testFloor > -50) {
          adjustedPos = testPos;
        }
      }
    }
  }

  return adjustedPos;
}

export class DoomGame {
  map: GameMap;
  player: Player;
  enemies: Enemy[] = [];
  bodyParts: BodyPart[] = [];    // Death explosion particles
  hitParticles: HitParticle[] = [];  // Bullet impact sparks
  lightFlashes: LightFlash[] = [];   // Impact light effects
  chaingun: Chaingun;            // 3D gun model
  renderer: RaycastRenderer;
  screenShake: ScreenShake;      // Screen shake effect

  gameState: GameState = 'playing';
  score: number = 0;
  keysHeld: Set<string> = new Set();
  currentLevel: number = 0;      // Current level index

  // Visual feedback
  shootFlashFrames: number = 0;  // Frames remaining for muzzle flash effect
  playerMoving: boolean = false; // Track if player is moving (for gun bob)

  private changeListeners: ChangeListener[] = [];
  private lastTime: number = 0;

  constructor(width: number, height: number, levelIndex: number = 0) {
    this.currentLevel = levelIndex;
    this.map = new GameMap(levelIndex);
    this.screenShake = new ScreenShake();

    // Start player at level-defined spawn point
    const levelInfo = getLevelInfo(levelIndex);
    const startPos = levelInfo?.startPosition || new Vector3(20, -15, 10);
    this.player = new Player(startPos.clone());

    this.chaingun = new Chaingun();
    this.renderer = new RaycastRenderer(width, height);

    // Spawn enemies based on level spawn points
    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    const levelInfo = getLevelInfo(this.currentLevel);
    if (!levelInfo) return;

    // Spawn walking enemies from level spawn points
    for (const pos of levelInfo.enemySpawnPoints.walking) {
      const enemy = new WalkingEnemy(pos.clone(), Math.random() * Math.PI * 2);
      this.enemies.push(enemy);
    }

    // Spawn flying enemies from level spawn points
    for (const pos of levelInfo.enemySpawnPoints.flying) {
      const enemy = new FlyingEnemy(pos.clone(), Math.random() * Math.PI * 2);
      this.enemies.push(enemy);
    }
  }

  /**
   * Load a specific level
   */
  loadLevel(levelIndex: number): void {
    this.currentLevel = levelIndex % getLevelCount();
    this.map.loadLevel(this.currentLevel);

    const levelInfo = getLevelInfo(this.currentLevel);
    const startPos = levelInfo?.startPosition || new Vector3(20, -15, 10);
    this.player = new Player(startPos.clone());

    this.enemies = [];
    this.bodyParts = [];
    this.hitParticles = [];
    this.lightFlashes = [];
    this.chaingun = new Chaingun();
    this.gameState = 'playing';
    this.score = 0;
    this.keysHeld.clear();
    this.playerMoving = false;

    this.spawnEnemies();
    this.notifyChange();
  }

  /**
   * Advance to next level
   */
  nextLevel(): void {
    this.loadLevel(this.currentLevel + 1);
  }

  /**
   * Get current level info
   */
  getLevelInfo(): LevelInfo | null {
    return getLevelInfo(this.currentLevel);
  }

  /**
   * Get total number of levels
   */
  getTotalLevels(): number {
    return getLevelCount();
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

    // Update camera bob (smooth start/stop transitions)
    this.player.updateBob(dt, this.playerMoving);

    // Update screen shake
    this.screenShake.update(dt);

    // Update chaingun (bob, recoil, spin)
    this.chaingun.update(dt, this.playerMoving, false);

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.position, this.map);
    }

    // Update body parts (death particles)
    for (const part of this.bodyParts) {
      part.update(dt, this.map);
    }
    // Remove dead body parts
    this.bodyParts = this.bodyParts.filter((p) => !p.dead);

    // Update hit particles (bullet impact sparks)
    for (const particle of this.hitParticles) {
      particle.update(dt, this.map);
    }
    // Remove dead hit particles
    this.hitParticles = this.hitParticles.filter((p) => !p.dead);

    // Update light flashes
    for (const flash of this.lightFlashes) {
      flash.update(dt);
    }
    // Remove dead flashes
    this.lightFlashes = this.lightFlashes.filter((f) => !f.dead);

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
    // Check if player is holding fire button
    const isShooting = this.keysHeld.has(' ') || this.keysHeld.has('Space');

    // Movement slowdown while shooting (50% speed reduction)
    const shootingSlowdown = isShooting ? 0.5 : 1.0;
    const moveSpeed = (dt / 10) * shootingSlowdown;
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
      this.playerMoving = true;
      moveDir = moveDir.normalize().multiplyScalar(moveSpeed);
      const desiredPos = this.player.position.add(moveDir);

      // DEBUG: Log movement attempt
      const beforePos = this.player.position.clone();

      // Apply 8-ray wall collision detection
      const adjustedPos = checkWallCollision(
        this.player.position,
        desiredPos,
        this.map,
        5  // Collision radius
      );

      // Check floor height at adjusted position
      const floorHeight = this.map.getFloorHeight(adjustedPos);

      if (floorHeight > -50) {
        this.player.position = adjustedPos;
        this.player.position.z = floorHeight + this.player.height;
      }
    } else {
      this.playerMoving = false;
    }

    // Shooting - space key sends "Space", but TypedRune sends ' '
    // Our normalizer doesn't lowercase "Space" (multi-char), but ' ' stays as ' '
    if (isShooting) {
      this.shoot();
      this.keysHeld.delete(' ');
      this.keysHeld.delete('Space');
    }
  }

  private shoot(): void {
    // Trigger muzzle flash visual feedback
    this.shootFlashFrames = 3;

    // Trigger screen shake
    this.screenShake.shake(4);

    // Trigger chaingun recoil and spin
    this.chaingun.update(0, this.playerMoving, true);

    // Hitscan - check what the bullet hits
    const forward = this.player.getForwardVector();
    const pos = this.player.position;

    // Find closest enemy in crosshair
    let closestEnemy: Enemy | null = null;
    let closestEnemyDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      // Check if enemy is roughly in front
      const toEnemy = enemy.position.sub(pos);
      const dist = toEnemy.length();
      const dot = toEnemy.normalize().dot(forward);

      // Within ~15 degree cone
      if (dot > 0.95 && dist < closestEnemyDist && dist < this.renderer.maxRenderDistance) {
        closestEnemy = enemy;
        closestEnemyDist = dist;
      }
    }

    // Find closest wall hit
    let closestWallDist = Infinity;
    let wallHitPos: Vector3 | null = null;
    let wallNormal: Vector3 | null = null;

    for (const wall of this.map.walls) {
      const hit = rayLineIntersect(
        new Vector3(pos.x, pos.y, 0),
        forward,
        wall.p1,
        wall.p2
      );
      if (hit && hit[0] > 0.1 && hit[0] < closestWallDist) {
        closestWallDist = hit[0];
        // Calculate hit position
        wallHitPos = pos.add(forward.multiplyScalar(hit[0]));
        wallHitPos.z = pos.z;  // Keep at eye level
        // Calculate wall normal (perpendicular to wall)
        const wallDir = wall.p2.sub(wall.p1).normalize();
        wallNormal = new Vector3(-wallDir.y, wallDir.x, 0);
        // Make sure normal points toward player
        if (wallNormal.dot(forward) > 0) {
          wallNormal = wallNormal.multiplyScalar(-1);
        }
      }
    }

    // Determine what we hit (enemy or wall, whichever is closer)
    if (closestEnemy && closestEnemyDist < closestWallDist) {
      // Hit enemy
      const wasDead = closestEnemy.dead;
      closestEnemy.takeDamage(3);
      this.score += closestEnemy.dead ? 100 : 10;

      // Spawn hit particles at enemy position
      const impactDir = forward.clone();
      const particles = createEnemyHitParticles(closestEnemy.position, impactDir, 15);
      this.hitParticles.push(...particles);

      // Spawn light flash
      this.lightFlashes.push(new LightFlash(
        closestEnemy.position,
        [255, 100, 50],  // Orange flash for enemy hit
        40
      ));

      // Spawn death explosion when enemy dies
      if (closestEnemy.dead && !wasDead) {
        this.spawnDeathExplosion(closestEnemy);
      }

      this.notifyChange();
    } else if (wallHitPos && wallNormal) {
      // Hit wall - spawn sparks
      const particles = createWallHitParticles(wallHitPos, wallNormal, 12);
      this.hitParticles.push(...particles);

      // Spawn light flash at wall
      this.lightFlashes.push(new LightFlash(
        wallHitPos,
        [255, 200, 100],  // Yellow flash for wall hit
        30
      ));
    }
  }

  private spawnDeathExplosion(enemy: Enemy): void {
    // Calculate explosion direction (away from player)
    const toEnemy = enemy.position.sub(this.player.position).normalize();

    // Spawn body parts based on enemy type
    let parts: BodyPart[];
    if (enemy.type === 'walking') {
      parts = createWalkingEnemyBodyParts(enemy.position, toEnemy);
    } else {
      parts = createFlyingEnemyBodyParts(enemy.position, toEnemy);
    }

    this.bodyParts.push(...parts);
  }

  render(buffer: Uint8Array): void {
    this.renderer.render(
      buffer,
      this.player,
      this.map,
      this.enemies,
      this.bodyParts,
      this.chaingun,
      this.hitParticles,
      this.lightFlashes
    );

    const w = this.renderer.width;
    const h = this.renderer.height;

    // Apply screen shake effect (shift entire image)
    const shake = this.screenShake.getOffsets();
    if (Math.abs(shake.x) > 0.1 || Math.abs(shake.y) > 0.1) {
      // Create a copy of the buffer to read from
      const original = new Uint8Array(buffer);

      // Apply shake by shifting pixels
      const shakeX = Math.round(shake.x);
      const shakeY = Math.round(shake.y);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Source pixel (with shake offset applied)
          const srcX = x - shakeX;
          const srcY = y - shakeY;

          const dstIdx = (y * w + x) * 4;

          if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
            const srcIdx = (srcY * w + srcX) * 4;
            buffer[dstIdx] = original[srcIdx];
            buffer[dstIdx + 1] = original[srcIdx + 1];
            buffer[dstIdx + 2] = original[srcIdx + 2];
            buffer[dstIdx + 3] = original[srcIdx + 3];
          } else {
            // Fill edge gaps with dark color
            buffer[dstIdx] = 10;
            buffer[dstIdx + 1] = 10;
            buffer[dstIdx + 2] = 15;
            buffer[dstIdx + 3] = 255;
          }
        }
      }
    }

    // Apply muzzle flash effect (yellow tint on screen edges)
    if (this.shootFlashFrames > 0) {
      this.shootFlashFrames--;

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
    // Reset to current level
    this.loadLevel(this.currentLevel);
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
  let levelLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;

  a.window({ title: 'Yet Another Doom Clone', width: 480, height: 460 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Yet Another Doom Clone').withId('title');
            a.hbox(() => {
              levelLabel = a.label('Level 1: Training Ground').withId('levelLabel');
            });
            a.hbox(() => {
              scoreLabel = a.label('Score: 0').withId('scoreLabel');
              healthLabel = a.label('Health: 100').withId('healthLabel');
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
              a.button('Prev Level').onClick(async () => {
                const prevLevel = (game.currentLevel - 1 + game.getTotalLevels()) % game.getTotalLevels();
                game.loadLevel(prevLevel);
                startGameLoop();
                updateUI();
                await canvas.requestFocus();
              }).withId('prevLevelBtn');
              a.button('Next Level').onClick(async () => {
                game.nextLevel();
                startGameLoop();
                updateUI();
                await canvas.requestFocus();
              }).withId('nextLevelBtn');
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

      // Update level info
      const levelInfo = game.getLevelInfo();
      if (levelInfo) {
        levelLabel.setText(`Level ${game.currentLevel + 1}: ${levelInfo.name}`);
      }

      const state = game.getGameState();
      if (state === 'gameover') {
        statusLabel.setText('Game Over!');
        if (gameLoop) {
          clearInterval(gameLoop);
          gameLoop = null;
        }
      } else if (state === 'won') {
        const hasNextLevel = game.currentLevel + 1 < game.getTotalLevels();
        statusLabel.setText(hasNextLevel ? 'Level Complete! Press Next Level' : 'All Levels Complete!');
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
