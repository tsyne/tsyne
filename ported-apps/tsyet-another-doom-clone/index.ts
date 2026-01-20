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
  rotateXY,
  rotateXZ,
  rotateYZ,
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

// Re-export from new physics and game modules
export { ZERO, X_DIR, Y_DIR, Z_DIR, angleBetween, rayLineIntersect, checkWallCollision } from './physics';
export { DoomGame, GameState, ScreenShake } from './doom-game';

// Import for local use
import { DoomGame } from './doom-game';

// ============================================================================
// Tsyne UI Layer
// ============================================================================

export function buildYetAnotherDoomCloneApp(a: App): void {
  let canvasWidth = 400;
  let canvasHeight = 300;
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
          a.max(() => {
            canvas = a
              .tappableCanvasRaster(canvasWidth, canvasHeight, {
                onKeyDown: (key: string) => {
                  if (game.getGameState() === 'won') {
                    if (game.currentLevel + 1 < game.getTotalLevels()) {
                      game.nextLevel();
                      startGameLoop();
                      updateUI();
                    }
                  } else {
                    game.setKey(key, true);
                  }
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

    win.onResize(async (w, h) => {
      // Deduct space for labels and buttons
      // We use slightly more aggressive values to fill the space better
      const newWidth = Math.max(200, Math.floor(w - 20));
      const newHeight = Math.max(150, Math.floor(h - 160));

      if (Math.abs(newWidth - canvasWidth) > 5 || Math.abs(newHeight - canvasHeight) > 5) {
        canvasWidth = newWidth;
        canvasHeight = newHeight;
        game.resize(canvasWidth, canvasHeight);
        if (canvas) {
          await canvas.resize(canvasWidth, canvasHeight);
        }
      }
    });

    win.show();

    function startGameLoop(): void {
      if (gameLoop) clearInterval(gameLoop);

      gameLoop = setInterval(async () => {
        try {
          game.tick(Date.now());
          const currentW = game.renderer.width;
          const currentH = game.renderer.height;
          const buffer = new Uint8Array(currentW * currentH * 4);
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
        statusLabel.setText(hasNextLevel ? 'Level Complete! Press any key to advance' : 'All Levels Complete!');
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