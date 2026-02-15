/**
 * Spherical Snake — CVG (Cosyne Vector Graphics) version
 *
 * Reuses the game logic from spherical-snake.ts and replaces the imperative
 * pixel-buffer rendering with declarative CVG primitives.
 *
 * Rendering strategy:
 * - Grid dots + horizon: pixel buffer (1600 dots per frame, too many for individual CVG elements)
 * - Snake nodes: CVG circles via bindTo() (dynamic collection, grows as pellets are eaten)
 * - Pellet: CVG circle with bindPos/bindFill (reactive bindings)
 * - Arrow buttons: CVG path triangles with onClick
 * - Keyboard: CVG onKeyDown/onKeyUp via enableEvents()
 *
 * @tsyne-app:name Spherical Snake (CVG)
 * @tsyne-app:icon home
 * @tsyne-app:category Games
 * @tsyne-app:builder buildSphericalSnakeCvgApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { App, TappableCanvasRaster, Label, app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import { cvg } from 'cosyne';
import type { CvgContext } from 'cosyne';
import { SphericalSnake } from './spherical-snake';

const CANVAS_SIZE = 450;

// ============================================================================
// Grid rendering (pixel buffer — 1600 dots + horizon circle)
// ============================================================================

function drawGrid(
  buffer: Uint8Array,
  game: SphericalSnake,
  size: number,
): void {
  // Clear to gray background
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 232;
    buffer[i + 1] = 232;
    buffer[i + 2] = 232;
    buffer[i + 3] = 255;
  }

  // Grid dots (2×2 pixels each, with depth-based alpha blending)
  const gridPoints = game.getProjectedGridPoints();
  for (const p of gridPoints) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (x >= 0 && x + 1 < size && y >= 0 && y + 1 < size) {
      const c = Math.round(232 * (1 - p.alpha));
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const idx = ((y + dy) * size + (x + dx)) * 4;
          buffer[idx] = c;
          buffer[idx + 1] = c;
          buffer[idx + 2] = c;
          buffer[idx + 3] = 255;
        }
      }
    }
  }

  // Horizon circle (Bresenham midpoint algorithm)
  const r = Math.round(size * 0.41);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  let bx = r, by = 0, err = 1 - bx;
  const set = (px: number, py: number) => {
    if (px >= 0 && px < size && py >= 0 && py < size) {
      const i = (py * size + px) * 4;
      buffer[i] = 0;
      buffer[i + 1] = 0;
      buffer[i + 2] = 0;
      buffer[i + 3] = 255;
    }
  };
  while (bx >= by) {
    set(cx + bx, cy + by); set(cx + by, cy + bx);
    set(cx - by, cy + bx); set(cx - bx, cy + by);
    set(cx - bx, cy - by); set(cx - by, cy - bx);
    set(cx + by, cy - bx); set(cx + bx, cy - by);
    by++;
    if (err < 0) err += 2 * by + 1;
    else { bx--; err += 2 * (by - bx + 1); }
  }
}

// ============================================================================
// UI Layer — CVG
// ============================================================================

export function buildSphericalSnakeCvgApp(a: App, windowWidth?: number, windowHeight?: number): void {
  const game = new SphericalSnake();

  let cvgCtx: CvgContext;
  let gridCanvas: TappableCanvasRaster;
  let scoreLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;
  let leftDown = false;
  let rightDown = false;
  let rendering = false;

  const gridBuffer = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * 4);

  // Snake data with index/total baked in for color computation
  interface SnakeItem {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    index: number;
    total: number;
  }

  function getSnakeItems(): SnakeItem[] {
    const nodes = game.getProjectedSnakeNodes();
    const total = nodes.length;
    return nodes.map((n, i) => ({
      x: n.x,
      y: n.y,
      radius: Math.max(3, Math.round(n.radius || 5)),
      alpha: n.alpha,
      index: i,
      total,
    }));
  }

  function snakeColor(item: SnakeItem): string {
    const fadeAlpha = (1 - item.index / item.total) * item.alpha;
    const b = Math.floor(item.alpha * 255);
    return `rgba(120, 0, ${b}, ${fadeAlpha.toFixed(3)})`;
  }

  function startGameLoop(): void {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(async () => {
      if (rendering) return;
      rendering = true;
      try {
        game.tick();

        // Update grid pixel buffer
        drawGrid(gridBuffer, game, CANVAS_SIZE);
        await gridCanvas.setPixelBuffer(gridBuffer);

        // Update CVG bindings (snake positions, pellet position, colors)
        await cvgCtx.refresh();

        // Update labels
        updateUI();
      } catch (err) {
        console.error('[GAME] Error in game loop:', err);
      } finally {
        rendering = false;
      }
    }, 15);
  }

  function updateUI(): void {
    scoreLabel.setText(`Score: ${game.getScore()}`);
    const state = game.getGameState();
    if (state === 'gameover') {
      statusLabel.setText('Good game! Click New Game to play again');
      if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
      }
    } else {
      statusLabel.setText('Playing');
    }
  }

  a.window({ title: 'Spherical Snake (CVG)', width: windowWidth ?? 500, height: windowHeight ?? 580 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Spherical Snake').withId('title');
            a.hbox(() => {
              scoreLabel = a.label('Score: 0').withId('scoreLabel');
              statusLabel = a.label('Playing').withId('statusLabel');
            });
          });
        },

        center: () => {
          a.aspectRatio(1.0, () => {
            a.canvasStack(() => {
              // Layer 0 (bottom): Grid pixel buffer
              gridCanvas = a.tappableCanvasRaster(CANVAS_SIZE, CANVAS_SIZE, {}).withId('gridCanvas');

              // Layer 1 (middle + top): CVG overlay for snake, pellet, arrows
              cvgCtx = cvg(a, {
                viewBox: `0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`,
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
              }, (s) => {
                // --- Snake nodes (dynamic collection) ---
                s.bindTo({
                  items: getSnakeItems,
                  trackBy: (item) => item.index,
                  render: (item) =>
                    s.circle({
                      cx: item.x,
                      cy: item.y,
                      r: item.radius,
                      fill: snakeColor(item),
                    }),
                  update: (item, els) => {
                    els[0].updateSvgProps({
                      cx: item.x,
                      cy: item.y,
                      r: item.radius,
                    });
                    els[0].fill(snakeColor(item));
                  },
                });

                // --- Pellet ---
                const pellet = game.getProjectedPellet();
                s.circle({
                  cx: pellet.x,
                  cy: pellet.y,
                  r: Math.max(3, Math.round(pellet.radius || 5)),
                  fill: `rgba(0, 0, ${Math.floor(pellet.alpha * 255)}, 1)`,
                }).bindPos(() => {
                  const p = game.getProjectedPellet();
                  return {
                    cx: p.x,
                    cy: p.y,
                    r: Math.max(3, Math.round(p.radius || 5)),
                  };
                }).bindFill(() => {
                  const p = game.getProjectedPellet();
                  return `rgba(0, 0, ${Math.floor(p.alpha * 255)}, 1)`;
                }).name('pellet');

                // --- Arrow buttons ---
                const arrowY = CANVAS_SIZE - 50;
                const arrowH = 30;
                const arrowInset = 50;

                // Left arrow triangle
                s.path({
                  d: `M ${arrowInset} ${arrowY} L ${arrowInset + 40} ${arrowY - arrowH} L ${arrowInset + 40} ${arrowY + arrowH} Z`,
                  fill: '#505050',
                  onClick: () => {
                    leftDown = true;
                    game.setInputs(leftDown, rightDown);
                    setTimeout(() => {
                      leftDown = false;
                      game.setInputs(leftDown, rightDown);
                    }, 100);
                  },
                }).name('leftArrow');

                // Right arrow triangle
                const rightX = CANVAS_SIZE - arrowInset;
                s.path({
                  d: `M ${rightX} ${arrowY} L ${rightX - 40} ${arrowY - arrowH} L ${rightX - 40} ${arrowY + arrowH} Z`,
                  fill: '#505050',
                  onClick: () => {
                    rightDown = true;
                    game.setInputs(leftDown, rightDown);
                    setTimeout(() => {
                      rightDown = false;
                      game.setInputs(leftDown, rightDown);
                    }, 100);
                  },
                }).name('rightArrow');

                // --- Keyboard input ---
                s.onKeyDown((key) => {
                  if (key === 'Left') leftDown = true;
                  if (key === 'Right') rightDown = true;
                  game.setInputs(leftDown, rightDown);
                });

                s.onKeyUp((key) => {
                  if (key === 'Left') leftDown = false;
                  if (key === 'Right') rightDown = false;
                  game.setInputs(leftDown, rightDown);
                });
              });

              // Event overlay (keyboard focus + click dispatch)
              cvgCtx.enableEvents();
            });
          });
        },

        bottom: () => {
          a.hbox(() => {
            a.button('New Game', {
              onClick: async () => {
                game.reset();
                startGameLoop();
                updateUI();
                await cvgCtx.requestFocus();
              },
            });
            a.button('Pause', {
              onClick: async () => {
                if (gameLoop) {
                  clearInterval(gameLoop);
                  gameLoop = null;
                  statusLabel.setText('Paused');
                } else {
                  startGameLoop();
                  statusLabel.setText('Playing');
                }
                await cvgCtx.requestFocus();
              },
            });
          });
        },
      });
    });

    win.show();

    // Initialize and start
    setTimeout(async () => {
      drawGrid(gridBuffer, game, CANVAS_SIZE);
      await gridCanvas.setPixelBuffer(gridBuffer);
      await cvgCtx.requestFocus();
      startGameLoop();
    }, 100);
  });
}

// Entry point
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Spherical Snake (CVG)' }, buildSphericalSnakeCvgApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
