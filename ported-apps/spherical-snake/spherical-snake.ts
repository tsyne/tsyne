/**
 * Spherical Snake
 *
 * Snake game on a sphere with 3D perspective projection.
 * Port of https://github.com/kevinAlbs/SphericalSnake to Tsyne.
 *
 * @tsyne-app:name Spherical Snake
 * @tsyne-app:icon home
 * @tsyne-app:category Games
 * @tsyne-app:args (a: App) => void
 */

import { App, TappableCanvasRaster, Label, app, resolveTransport } from 'tsyne';

// ============================================================================
// 3D Math Types & Utilities
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
  radius?: number;
}

interface ProjectedPoint extends Point2D {
  depth: number;
  alpha: number;
}

// ============================================================================
// 3D Rotation Mathematics
// ============================================================================

export class RotationMatrix {
  // Matrix stored in row-major order
  data: number[] = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];

  static identity(): RotationMatrix {
    return new RotationMatrix();
  }

  static rotateX(angle: number): RotationMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = new RotationMatrix();
    m.data = [
      1, 0, 0,
      0, cos, -sin,
      0, sin, cos
    ];
    return m;
  }

  static rotateY(angle: number): RotationMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = new RotationMatrix();
    m.data = [
      cos, 0, sin,
      0, 1, 0,
      -sin, 0, cos
    ];
    return m;
  }

  static rotateZ(angle: number): RotationMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = new RotationMatrix();
    m.data = [
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
    ];
    return m;
  }

  multiply(other: RotationMatrix): RotationMatrix {
    const result = new RotationMatrix();
    const a = this.data;
    const b = other.data;
    const r = result.data;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        r[i * 3 + j] = 0;
        for (let k = 0; k < 3; k++) {
          r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
        }
      }
    }
    return result;
  }

  multiplyPoint(p: Point3D): Point3D {
    const a = this.data;
    return {
      x: a[0] * p.x + a[1] * p.y + a[2] * p.z,
      y: a[3] * p.x + a[4] * p.y + a[5] * p.z,
      z: a[6] * p.x + a[7] * p.y + a[8] * p.z
    };
  }
}

function copyPoint(src: Point3D): Point3D {
  return { x: src.x, y: src.y, z: src.z };
}

function distanceSquared(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

// ============================================================================
// Sphere Grid Generation (Latitude/Longitude - like original)
// ============================================================================

function generateSphereGrid(gridSize: number): Point3D[] {
  const points: Point3D[] = [];
  const n = gridSize; // Number of lines in each direction

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const theta = (i / n) * Math.PI * 2; // Longitude: 0 to 2π
      const phi = (j / n) * Math.PI;       // Latitude: 0 to π

      const sinPhi = Math.sin(phi);
      points.push({
        x: Math.cos(theta) * sinPhi,
        y: Math.sin(theta) * sinPhi,
        z: Math.cos(phi)
      });
    }
  }

  return points;
}

// ============================================================================
// Game Logic
// ============================================================================

const NODE_ANGLE = Math.PI / 60;
const NODE_QUEUE_SIZE = 9;
const STARTING_DIRECTION = Math.PI / 4;
const COLLISION_DISTANCE = 2 * Math.sin(NODE_ANGLE);
const SNAKE_VELOCITY = (NODE_ANGLE * 2) / (NODE_QUEUE_SIZE + 1);
const GRID_SIZE = 40; // Number of latitude/longitude lines (40x40 = 1600 points)

interface SnakeNode {
  x: number;
  y: number;
  z: number;
  posQueue: (Point3D | null)[];
}

type GameState = 'playing' | 'gameover' | 'paused';
type ChangeListener = () => void;

export class SphericalSnake {
  private snake: SnakeNode[] = [];
  private pellet: Point3D = { x: 0, y: 0, z: 1 };
  private sphereGrid: Point3D[] = [];
  private score = 0;
  private gameState: GameState = 'playing';

  private direction = STARTING_DIRECTION;
  private angularVelocityY = 0;
  private leftDown = false;
  private rightDown = false;

  private rotationMatrix = RotationMatrix.identity();
  private changeListeners: ChangeListener[] = [];

  private focalLength = 320;
  private canvasWidth = 450;
  private canvasHeight = 450;
  private sphereSize = 450; // Size used for projection (keeps sphere circular)

  constructor() {
    this.init();
  }

  private init(): void {
    this.sphereGrid = generateSphereGrid(GRID_SIZE);
    this.snake = [];

    // Initialize snake nodes spread apart along a great circle
    for (let i = 0; i < 8; i++) {
      const angle = i * NODE_ANGLE * 2; // Spread nodes apart
      const snakeNode: SnakeNode = {
        x: Math.sin(angle),
        y: 0,
        z: -Math.cos(angle),
        posQueue: []
      };
      for (let j = 0; j < NODE_QUEUE_SIZE; j++) {
        snakeNode.posQueue.push(null);
      }
      this.snake.push(snakeNode);
    }

    this.regeneratePellet();
  }

  private addSnakeNode(): void {
    const snakeNode: SnakeNode = {
      x: 0,
      y: 0,
      z: -1,
      posQueue: []
    };

    for (let i = 0; i < NODE_QUEUE_SIZE; i++) {
      snakeNode.posQueue.push(null);
    }

    if (this.snake.length > 0) {
      const last = this.snake[this.snake.length - 1];
      const lastPos = last.posQueue[NODE_QUEUE_SIZE - 1];

      if (lastPos === null) {
        snakeNode.x = last.x;
        snakeNode.y = last.y;
        snakeNode.z = last.z;
      } else {
        snakeNode.x = lastPos.x;
        snakeNode.y = lastPos.y;
        snakeNode.z = lastPos.z;
      }
    }

    this.snake.push(snakeNode);
  }

  private regeneratePellet(): void {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const sinPhi = Math.sin(phi);

    this.pellet = {
      x: Math.cos(theta) * sinPhi,
      y: Math.sin(theta) * sinPhi,
      z: Math.cos(phi)
    };
  }

  private applySnakeRotation(): void {
    let nextPosition: Point3D | null = null;

    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const oldPosition = copyPoint(node);

      if (i === 0) {
        // Head moves FORWARD (opposite to global rotation, so it stays anchored)
        const headRotZ1 = RotationMatrix.rotateZ(-this.direction);
        const headRotY = RotationMatrix.rotateY(SNAKE_VELOCITY); // Positive = forward
        const headRotZ2 = RotationMatrix.rotateZ(this.direction);
        const headMatrix = headRotZ1.multiply(headRotY).multiply(headRotZ2);
        const rotated = headMatrix.multiplyPoint(node);
        node.x = rotated.x;
        node.y = rotated.y;
        node.z = rotated.z;
      } else if (nextPosition === null) {
        // History isn't available yet - use starting direction
        const bodyRotZ1 = RotationMatrix.rotateZ(-STARTING_DIRECTION);
        const bodyRotY = RotationMatrix.rotateY(SNAKE_VELOCITY);
        const bodyRotZ2 = RotationMatrix.rotateZ(STARTING_DIRECTION);
        const bodyMatrix = bodyRotZ1.multiply(bodyRotY).multiply(bodyRotZ2);
        const rotated = bodyMatrix.multiplyPoint(node);
        node.x = rotated.x;
        node.y = rotated.y;
        node.z = rotated.z;
      } else {
        // Follow the previous node's historical position
        node.x = nextPosition.x;
        node.y = nextPosition.y;
        node.z = nextPosition.z;
      }

      // Push old position to queue, get next position for following segment
      node.posQueue.unshift(oldPosition);
      nextPosition = node.posQueue.pop() || null;
    }
  }

  private collision(a: Point3D, b: Point3D): boolean {
    const dist = Math.sqrt(distanceSquared(a, b));
    return dist < COLLISION_DISTANCE;
  }

  private checkCollisions(): void {
    if (this.gameState !== 'playing') return;

    // Self-collision (check with body starting at index 2)
    for (let i = 2; i < this.snake.length; i++) {
      if (this.collision(this.snake[0], this.snake[i])) {
        this.gameState = 'gameover';
        this.notifyChange();
        return;
      }
    }

    // Pellet collision
    if (this.collision(this.snake[0], this.pellet)) {
      this.score += 1;
      this.regeneratePellet();
      this.addSnakeNode();
      this.notifyChange();
    }
  }

  setInputs(leftDown: boolean, rightDown: boolean): void {
    this.leftDown = leftDown;
    this.rightDown = rightDown;
  }

  tick(): void {
    if (this.gameState !== 'playing') return;

    // Update direction based on input
    if (this.leftDown) this.direction -= 0.08;
    if (this.rightDown) this.direction += 0.08;

    // First, apply snake-specific rotation (head moves forward, body follows)
    this.applySnakeRotation();

    // Then apply global rotation to EVERYTHING (grid, pellet, AND snake)
    // This makes the sphere appear to rotate under the snake
    // The snake head moved forward by +SNAKE_VELOCITY, now everything moves back by -SNAKE_VELOCITY
    // Net effect: head stays anchored, sphere rotates
    const rotZ1 = RotationMatrix.rotateZ(-this.direction);
    const rotY = RotationMatrix.rotateY(-SNAKE_VELOCITY);
    const rotZ2 = RotationMatrix.rotateZ(this.direction);
    const globalMatrix = rotZ1.multiply(rotY).multiply(rotZ2);

    // Rotate grid points
    for (let i = 0; i < this.sphereGrid.length; i++) {
      const p = this.sphereGrid[i];
      const rotated = globalMatrix.multiplyPoint(p);
      p.x = rotated.x;
      p.y = rotated.y;
      p.z = rotated.z;
    }

    // Rotate pellet
    const rotatedPellet = globalMatrix.multiplyPoint(this.pellet);
    this.pellet.x = rotatedPellet.x;
    this.pellet.y = rotatedPellet.y;
    this.pellet.z = rotatedPellet.z;

    // Rotate snake (and its position queues)
    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const rotated = globalMatrix.multiplyPoint(node);
      node.x = rotated.x;
      node.y = rotated.y;
      node.z = rotated.z;

      // Also rotate the position queue entries
      for (let j = 0; j < node.posQueue.length; j++) {
        const qp = node.posQueue[j];
        if (qp) {
          const rotatedQ = globalMatrix.multiplyPoint(qp);
          qp.x = rotatedQ.x;
          qp.y = rotatedQ.y;
          qp.z = rotatedQ.z;
        }
      }
    }

    this.checkCollisions();
  }

  // ========================================================================
  // Rendering & Projection
  // ========================================================================

  private project(point: Point3D): ProjectedPoint {
    const p = copyPoint(point);

    // Translate sphere origin
    p.z += 2;

    // Project to 2D - scale focalLength based on sphereSize to maintain aspect ratio
    let radius = NODE_ANGLE;
    const scaledFocalLength = this.focalLength * (this.sphereSize / 450);
    const scale = scaledFocalLength / p.z;

    const x = -p.x * scale + this.canvasWidth / 2;
    const y = -p.y * scale + this.canvasHeight / 2;
    const projRadius = radius * scale;

    // Depth for alpha blending
    const alpha = Math.max(0, 1 - (p.z - 1) / 2);

    return {
      x: Math.round(x),
      y: Math.round(y),
      radius: projRadius,
      depth: p.z,
      alpha
    };
  }

  getProjectedGridPoints(): ProjectedPoint[] {
    return this.sphereGrid.map(p => this.project(p));
  }

  getProjectedSnakeNodes(): ProjectedPoint[] {
    return this.snake.map(node =>
      this.project({ x: node.x, y: node.y, z: node.z })
    );
  }

  getProjectedPellet(): ProjectedPoint {
    return this.project(this.pellet);
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getScore(): number {
    return this.score;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getSnakeLength(): number {
    return this.snake.length;
  }

  canvasSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  setCanvasSize(width: number, height: number, sphereSize?: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.sphereSize = sphereSize ?? Math.min(width, height);
  }

  // ========================================================================
  // Observable Pattern
  // ========================================================================

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  reset(): void {
    this.snake = [];
    this.score = 0;
    this.gameState = 'playing';
    this.direction = STARTING_DIRECTION;
    this.leftDown = false;
    this.rightDown = false;
    this.rotationMatrix = RotationMatrix.identity();
    this.init();
    this.notifyChange();
  }
}

// ============================================================================
// UI Layer
// ============================================================================

export function buildSphericalSnakeApp(a: App): void {
  const game = new SphericalSnake();
  let canvasSize = { width: 450, height: 450 };

  let canvas: TappableCanvasRaster;
  let scoreLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;
  let leftDown = false;
  let rightDown = false;

  a.window({ title: 'Spherical Snake', width: 500, height: 580 }, (win) => {
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
          // Stack: game canvas with direction buttons overlaid at bottom corners
          a.stack(() => {
            // Layer 1: Game canvas with aspect ratio
            a.aspectRatio(1.0, () => {
              canvas = a
                .tappableCanvasRaster(canvasSize.width, canvasSize.height, {
                  onKeyDown: (key: string) => handleKeyDown(key),
                  onKeyUp: (key: string) => handleKeyUp(key)
                })
                .withId('gameCanvas');
            });

            // Layer 2: Direction buttons at bottom corners using TappableCanvasRaster
            const arrowSize = 80;
            const insetPercent = 0.10; // 10% inset from edges
            a.border({
              bottom: () => {
                a.hbox(() => {
                  // Left spacer (10% inset)
                  a.label('').withMinSize(Math.round(canvasSize.width * insetPercent), 1);

                  // Left arrow button (SW corner)
                  let leftArrowCanvas: TappableCanvasRaster;
                  leftArrowCanvas = a
                    .tappableCanvasRaster(arrowSize, arrowSize, {
                      onTap: () => {
                        leftDown = true;
                        game.setInputs(leftDown, rightDown);
                        setTimeout(() => {
                          leftDown = false;
                          game.setInputs(leftDown, rightDown);
                        }, 100);
                      },
                      onDrag: () => {
                        leftDown = true;
                        game.setInputs(leftDown, rightDown);
                      },
                      onDragEnd: () => {
                        leftDown = false;
                        game.setInputs(leftDown, rightDown);
                      }
                    })
                    .withId('leftBtn');

                  // Draw the left arrow after canvas is ready
                  setTimeout(async () => {
                    const buffer = new Uint8Array(arrowSize * arrowSize * 4);
                    drawArrow(buffer, arrowSize, 'left');
                    await leftArrowCanvas.setPixelBuffer(buffer);
                  }, 200);

                  a.spacer();

                  // Right arrow button (SE corner)
                  let rightArrowCanvas: TappableCanvasRaster;
                  rightArrowCanvas = a
                    .tappableCanvasRaster(arrowSize, arrowSize, {
                      onTap: () => {
                        rightDown = true;
                        game.setInputs(leftDown, rightDown);
                        setTimeout(() => {
                          rightDown = false;
                          game.setInputs(leftDown, rightDown);
                        }, 100);
                      },
                      onDrag: () => {
                        rightDown = true;
                        game.setInputs(leftDown, rightDown);
                      },
                      onDragEnd: () => {
                        rightDown = false;
                        game.setInputs(leftDown, rightDown);
                      }
                    })
                    .withId('rightBtn');

                  // Draw the right arrow after canvas is ready
                  setTimeout(async () => {
                    const buffer = new Uint8Array(arrowSize * arrowSize * 4);
                    drawArrow(buffer, arrowSize, 'right');
                    await rightArrowCanvas.setPixelBuffer(buffer);
                  }, 200);

                  // Right spacer (10% inset)
                  a.label('').withMinSize(Math.round(canvasSize.width * insetPercent), 1);
                });
              }
            });
          });
        },
        bottom: () => {
          a.hbox(() => {
            a.button('New Game').onClick(async () => {
              game.reset();
              startGameLoop();
              updateUI();
              await canvas.requestFocus();
            });
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
            });
          });
        }
      });
    });

    win.show();

    // Handle window resize - resize canvas buffer to match new size
    const UI_HEIGHT = 130; // Approximate height of labels + buttons
    win.onResize(async (newWidth: number, newHeight: number) => {
      const availW = Math.max(100, newWidth - 20);
      const availH = Math.max(100, newHeight - UI_HEIGHT);
      // Use smaller dimension to keep canvas square
      const size = Math.min(availW, availH);
      canvasSize = { width: size, height: size };
      game.setCanvasSize(size, size, size);
      await canvas.resize(size, size);
      await renderFrame();
    });

    function handleKeyDown(key: string): void {
      if (key === 'Left' || key === 'ArrowLeft') leftDown = true;
      if (key === 'Right' || key === 'ArrowRight') rightDown = true;
      game.setInputs(leftDown, rightDown);
    }

    function handleKeyUp(key: string): void {
      if (key === 'Left' || key === 'ArrowLeft') leftDown = false;
      if (key === 'Right' || key === 'ArrowRight') rightDown = false;
      game.setInputs(leftDown, rightDown);
    }

    async function renderFrame(): Promise<void> {
      const buffer = new Uint8Array(
        canvasSize.width * canvasSize.height * 4
      );

      // Fill background (light gray like original)
      for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 232; // R (#E8)
        buffer[i + 1] = 232; // G (#E8)
        buffer[i + 2] = 232; // B (#E8)
        buffer[i + 3] = 255; // A
      }

      // Draw sphere grid (graticule - slightly larger dots)
      const gridPoints = game.getProjectedGridPoints();
      for (const point of gridPoints) {
        const depthAlpha = Math.floor(point.alpha * 255);
        // Draw 2x2 dot for visibility
        drawPixel(buffer, point.x, point.y, canvasSize.width, 0, 0, 0, depthAlpha);
        drawPixel(buffer, point.x + 1, point.y, canvasSize.width, 0, 0, 0, depthAlpha);
        drawPixel(buffer, point.x, point.y + 1, canvasSize.width, 0, 0, 0, depthAlpha);
        drawPixel(buffer, point.x + 1, point.y + 1, canvasSize.width, 0, 0, 0, depthAlpha);
      }

      // Draw snake (reddish-purple with depth-based coloring)
      const snakeNodes = game.getProjectedSnakeNodes();
      for (let i = 0; i < snakeNodes.length; i++) {
        const point = snakeNodes[i];
        const depthColor = Math.floor(point.alpha * 255);
        const fadeAlpha = Math.floor((1 - i / snakeNodes.length) * point.alpha * 255);
        drawCircle(
          buffer,
          point.x,
          point.y,
          Math.max(3, Math.round(point.radius || 5)),
          canvasSize.width,
          canvasSize.height,
          120,          // Red component (reddish)
          0,            // Green
          depthColor,   // Blue varies with depth (purple tint)
          fadeAlpha
        );
      }

      // Draw pellet (blue-purple with depth)
      const pellet = game.getProjectedPellet();
      const pelletDepthColor = Math.floor(pellet.alpha * 255);
      drawCircle(
        buffer,
        pellet.x,
        pellet.y,
        Math.max(3, Math.round(pellet.radius || 5)),
        canvasSize.width,
        canvasSize.height,
        0,                // Red
        0,                // Green
        pelletDepthColor, // Blue varies with depth
        255
      );

      // Draw horizon circle (thin black outline at edge of sphere)
      const horizonRadius = Math.round(canvasSize.width * 0.41); // ~0.58 * 0.71 scale factor
      drawCircleOutline(
        buffer,
        Math.round(canvasSize.width / 2),
        Math.round(canvasSize.height / 2),
        horizonRadius,
        canvasSize.width,
        0, 0, 0 // Black
      );

      await canvas.setPixelBuffer(buffer);
    }

    function startGameLoop(): void {
      if (gameLoop) clearInterval(gameLoop);

      gameLoop = setInterval(async () => {
        try {
          game.tick();
          await renderFrame();
          updateUI();
        } catch (err) {
          console.error('[GAME] Error in game loop:', err);
        }
      }, 15); // 15ms ~ 67 FPS
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

    // Request canvas focus and start game (deferred to let setContent complete)
    setTimeout(async () => {
      await canvas.requestFocus();
      startGameLoop();
      await renderFrame();
    }, 100);
  });
}

// ============================================================================
// Pixel Drawing Utilities
// ============================================================================

function drawPixel(
  buffer: Uint8Array,
  x: number,
  y: number,
  width: number,
  r: number,
  g: number,
  b: number,
  a: number = 255
): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && x < width && y >= 0 && y < buffer.length / (width * 4)) {
    const index = (y * width + x) * 4;
    buffer[index] = r;
    buffer[index + 1] = g;
    buffer[index + 2] = b;
    buffer[index + 3] = a;
  }
}

function drawCircle(
  buffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number = 255
): void {
  cx = Math.round(cx);
  cy = Math.round(cy);
  radius = Math.round(radius);

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius) {
        drawPixel(buffer, cx + x, cy + y, width, r, g, b, a);
      }
    }
  }
}

function drawCircleOutline(
  buffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  width: number,
  r: number,
  g: number,
  b: number
): void {
  cx = Math.round(cx);
  cy = Math.round(cy);
  radius = Math.round(radius);

  // Bresenham's circle algorithm for thin 1px line
  let x = radius;
  let y = 0;
  let err = 0;

  while (x >= y) {
    drawPixel(buffer, cx + x, cy + y, width, r, g, b, 255);
    drawPixel(buffer, cx + y, cy + x, width, r, g, b, 255);
    drawPixel(buffer, cx - y, cy + x, width, r, g, b, 255);
    drawPixel(buffer, cx - x, cy + y, width, r, g, b, 255);
    drawPixel(buffer, cx - x, cy - y, width, r, g, b, 255);
    drawPixel(buffer, cx - y, cy - x, width, r, g, b, 255);
    drawPixel(buffer, cx + y, cy - x, width, r, g, b, 255);
    drawPixel(buffer, cx + x, cy - y, width, r, g, b, 255);

    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }
}

/**
 * Draw an arrow on a canvas buffer
 * @param buffer - Pixel buffer (RGBA)
 * @param size - Width/height of the square canvas
 * @param direction - 'left' or 'right'
 */
function drawArrow(buffer: Uint8Array, size: number, direction: 'left' | 'right'): void {
  // Fill with background matching sphere (#E8E8E8 = 232, 232, 232)
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 232;     // R
    buffer[i + 1] = 232; // G
    buffer[i + 2] = 232; // B
    buffer[i + 3] = 255; // A
  }

  const margin = Math.floor(size * 0.15);
  const cy = Math.floor(size / 2);
  const halfHeight = Math.floor((size - margin * 2) / 2);

  if (direction === 'left') {
    // Left arrow: tip on left, base on right
    const tipX = margin;
    const baseX = size - margin;
    for (let row = -halfHeight; row <= halfHeight; row++) {
      const y = cy + row;
      const t = Math.abs(row) / halfHeight;
      const leftX = Math.floor(tipX + (baseX - tipX) * t);
      for (let x = leftX; x <= baseX; x++) {
        drawPixel(buffer, x, y, size, 80, 80, 80, 255);
      }
    }
  } else {
    // Right arrow: tip on right, base on left
    const tipX = size - margin;
    const baseX = margin;
    for (let row = -halfHeight; row <= halfHeight; row++) {
      const y = cy + row;
      const t = Math.abs(row) / halfHeight;
      const rightX = Math.floor(tipX - (tipX - baseX) * t);
      for (let x = baseX; x <= rightX; x++) {
        drawPixel(buffer, x, y, size, 80, 80, 80, 255);
      }
    }
  }
}

// Entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Spherical Snake' }, buildSphericalSnakeApp);
}
