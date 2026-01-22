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
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19 8l-7 3.5L5 8l7-3.5zM4 9.5l7 3.5v7l-7-3.5v-7zm16 0v7l-7 3.5v-7l7-3.5z"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder buildYetAnotherDoomCloneApp
 * @tsyne-app:args app,windowWidth,windowHeight
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
export { GameKeyboardController, buildGameKeyboard, buildExtendedGameKeyboard } from './game-keyboard';

// Import for local use
import { DoomGame } from './doom-game';
import { GameKeyboardController, buildExtendedGameKeyboard } from './game-keyboard';

// ============================================================================
// Tsyne UI Layer
// ============================================================================

/**
 * Build the Doom game app
 * @param a The Tsyne App instance
 * @param windowWidth Optional window width from PhoneTop (if provided, runs in embedded mode)
 * @param windowHeight Optional window height from PhoneTop
 */
export function buildYetAnotherDoomCloneApp(a: App, windowWidth?: number, windowHeight?: number): void {
  // Determine if we're in PhoneTop mode (embedded) or standalone mode
  const isPhoneTopMode = windowWidth !== undefined && windowHeight !== undefined;

  if (isPhoneTopMode) {
    // PhoneTop mode: build content directly without creating a window
    buildDoomContent(a, windowWidth, windowHeight, true);
  } else {
    // Standalone mode: create a window
    buildDoomStandalone(a);
  }
}

/**
 * Build standalone window version (desktop mode)
 */
function buildDoomStandalone(a: App): void {
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

    game.subscribe(() => {
      updateUI();
    });

    setTimeout(async () => {
      await canvas.requestFocus();
      startGameLoop();
    }, 100);
  });
}

/**
 * Build embedded content for PhoneTop mode
 * Adapts canvas to available space and includes touch controls
 */
function buildDoomContent(a: App, windowWidth: number, windowHeight: number, showKeyboard: boolean): void {
  // Calculate canvas size - leave room for HUD (~60px) and keyboard (~120px if shown)
  const hudHeight = 60;
  const keyboardHeight = showKeyboard ? 120 : 0;
  const padding = 10;

  let canvasWidth = Math.max(200, windowWidth - padding * 2);
  let canvasHeight = Math.max(150, windowHeight - hudHeight - keyboardHeight - padding * 2);

  // Maintain a reasonable aspect ratio (4:3 to 16:9)
  const aspectRatio = canvasWidth / canvasHeight;
  if (aspectRatio > 2) {
    // Too wide, constrain width
    canvasWidth = Math.floor(canvasHeight * 1.6);
  } else if (aspectRatio < 1) {
    // Too tall, constrain height
    canvasHeight = Math.floor(canvasWidth * 0.75);
  }

  const game = new DoomGame(canvasWidth, canvasHeight);

  let canvas: TappableCanvasRaster;
  let scoreLabel: Label;
  let healthLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;

  // Create game keyboard controller
  const keyboardController = new GameKeyboardController((key, pressed) => {
    game.setKey(key, pressed);
  });

  // Main layout
  a.vbox(() => {
    // HUD row
    a.hbox(() => {
      scoreLabel = a.label('Score: 0').withId('scoreLabel');
      a.spacer();
      healthLabel = a.label('HP: 100').withId('healthLabel');
      a.spacer();
      statusLabel = a.label('Playing').withId('statusLabel');
    });

    // Game canvas (centered)
    a.center(() => {
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

    // Control buttons row
    a.hbox(() => {
      a.button('New').onClick(async () => {
        game.reset();
        startGameLoop();
        updateUI();
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
      }).withId('pauseBtn');
      a.button('<<').onClick(async () => {
        const prevLevel = (game.currentLevel - 1 + game.getTotalLevels()) % game.getTotalLevels();
        game.loadLevel(prevLevel);
        startGameLoop();
        updateUI();
      }).withId('prevLevelBtn');
      a.button('>>').onClick(async () => {
        game.nextLevel();
        startGameLoop();
        updateUI();
      }).withId('nextLevelBtn');
    });

    // Game keyboard for touch controls
    if (showKeyboard) {
      a.separator();
      buildExtendedGameKeyboard(a, keyboardController);
    }
  });

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
    healthLabel.setText(`HP: ${game.getHealth()}`);

    const state = game.getGameState();
    if (state === 'gameover') {
      statusLabel.setText('Game Over!');
      if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
      }
    } else if (state === 'won') {
      const hasNextLevel = game.currentLevel + 1 < game.getTotalLevels();
      statusLabel.setText(hasNextLevel ? 'Complete!' : 'You Win!');
      if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
      }
    } else if (state === 'playing') {
      statusLabel.setText(`${game.getEnemiesAlive()} enemies`);
    }
  }

  game.subscribe(() => {
    updateUI();
  });

  // Start game loop after a short delay
  setTimeout(async () => {
    startGameLoop();
  }, 100);
}

// Entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Yet Another Doom Clone' }, buildYetAnotherDoomCloneApp);
}