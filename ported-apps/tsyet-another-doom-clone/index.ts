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
export { GameMap, MapPolygon, WallSegment, Wall, runTurtle } from './game-map';
export { RaycastRenderer, RaycastHit } from './renderer';
export { Enemy, EnemyState, EnemyType, IGameMap } from './enemy';
export { WalkingEnemy } from './walking-enemy';
export { FlyingEnemy } from './flying-enemy';

// Import for local use
import { Player } from './player';
import { GameMap } from './game-map';
import { RaycastRenderer } from './renderer';
import { Enemy } from './enemy';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';

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
    // Spawn walking enemies far from player start (20, -15)
    const walkingSpawnPoints = [
      new Vector3(120, 80, 10),
      new Vector3(-80, 60, 10),
      new Vector3(150, -80, 10),
    ];

    for (const pos of walkingSpawnPoints) {
      const enemy = new WalkingEnemy(pos, Math.random() * Math.PI * 2);
      this.enemies.push(enemy);
    }

    // Spawn flying enemies (higher up, different locations)
    const flyingSpawnPoints = [
      new Vector3(-60, -100, 25),
      new Vector3(180, 40, 30),
      new Vector3(100, -50, 20),
      new Vector3(-40, 80, 25),
    ];

    for (const pos of flyingSpawnPoints) {
      const enemy = new FlyingEnemy(pos, Math.random() * Math.PI * 2);
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
