/**
 * Pseudo-Declarative Spherical Snake
 *
 * Alternative implementation using Cosyne's declarative canvas grammar.
 * Port of https://github.com/kevinAlbs/SphericalSnake to Tsyne + Cosyne.
 *
 * Key differences from imperative version (spherical-snake.ts):
 * - Uses Cosyne primitives (circles, rects) instead of pixel buffer
 * - Uses declarative bindings for position and color
 * - Calls refreshBindings() in game loop instead of manual setPixelBuffer()
 * - ~50% fewer lines of drawing code
 *
 * @tsyne-app:name Spherical Snake (Cosyne)
 * @tsyne-app:icon home
 * @tsyne-app:category Games
 * @tsyne-app:args (a: App) => void
 */

import { App, Label, TappableCanvasRaster, app, resolveTransport } from 'tsyne';
import { cosyne, CosyneContext } from '../../cosyne/src';

// ============================================================================
// 3D Math Types & Utilities (shared with imperative version)
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  radius: number;
  depth: number;
  alpha: number;
}

// ============================================================================
// 3D Rotation Mathematics
// ============================================================================

class RotationMatrix {
  data: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  static identity(): RotationMatrix {
    return new RotationMatrix();
  }

  static rotateY(angle: number): RotationMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = new RotationMatrix();
    m.data = [cos, 0, sin, 0, 1, 0, -sin, 0, cos];
    return m;
  }

  static rotateZ(angle: number): RotationMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = new RotationMatrix();
    m.data = [cos, -sin, 0, sin, cos, 0, 0, 0, 1];
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
      z: a[6] * p.x + a[7] * p.y + a[8] * p.z,
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
// Sphere Grid Generation
// ============================================================================

function generateSphereGrid(gridSize: number): Point3D[] {
  const points: Point3D[] = [];
  const n = gridSize;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const theta = (i / n) * Math.PI * 2;
      const phi = (j / n) * Math.PI;
      const sinPhi = Math.sin(phi);
      points.push({
        x: Math.cos(theta) * sinPhi,
        y: Math.sin(theta) * sinPhi,
        z: Math.cos(phi),
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
const GRID_SIZE = 40;

interface SnakeNode {
  x: number;
  y: number;
  z: number;
  posQueue: (Point3D | null)[];
}

type GameState = 'playing' | 'gameover' | 'paused';
type ChangeListener = () => void;

export class SphericalSnakeGame {
  private snake: SnakeNode[] = [];
  private pellet: Point3D = { x: 0, y: 0, z: 1 };
  private sphereGrid: Point3D[] = [];
  private score = 0;
  private gameState: GameState = 'playing';

  private direction = STARTING_DIRECTION;
  private leftDown = false;
  private rightDown = false;

  private changeListeners: ChangeListener[] = [];

  private focalLength = 320;
  private canvasWidth = 450;
  private canvasHeight = 450;
  private sphereSize = 450;

  constructor() {
    this.init();
  }

  private init(): void {
    this.sphereGrid = generateSphereGrid(GRID_SIZE);
    this.snake = [];

    for (let i = 0; i < 8; i++) {
      const angle = i * NODE_ANGLE * 2;
      const snakeNode: SnakeNode = {
        x: Math.sin(angle),
        y: 0,
        z: -Math.cos(angle),
        posQueue: [],
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
      posQueue: [],
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
      z: Math.cos(phi),
    };
  }

  private applySnakeRotation(): void {
    let nextPosition: Point3D | null = null;

    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const oldPosition = copyPoint(node);

      if (i === 0) {
        const headRotZ1 = RotationMatrix.rotateZ(-this.direction);
        const headRotY = RotationMatrix.rotateY(SNAKE_VELOCITY);
        const headRotZ2 = RotationMatrix.rotateZ(this.direction);
        const headMatrix = headRotZ1.multiply(headRotY).multiply(headRotZ2);
        const rotated = headMatrix.multiplyPoint(node);
        node.x = rotated.x;
        node.y = rotated.y;
        node.z = rotated.z;
      } else if (nextPosition === null) {
        const bodyRotZ1 = RotationMatrix.rotateZ(-STARTING_DIRECTION);
        const bodyRotY = RotationMatrix.rotateY(SNAKE_VELOCITY);
        const bodyRotZ2 = RotationMatrix.rotateZ(STARTING_DIRECTION);
        const bodyMatrix = bodyRotZ1.multiply(bodyRotY).multiply(bodyRotZ2);
        const rotated = bodyMatrix.multiplyPoint(node);
        node.x = rotated.x;
        node.y = rotated.y;
        node.z = rotated.z;
      } else {
        node.x = nextPosition.x;
        node.y = nextPosition.y;
        node.z = nextPosition.z;
      }

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

    for (let i = 2; i < this.snake.length; i++) {
      if (this.collision(this.snake[0], this.snake[i])) {
        this.gameState = 'gameover';
        this.notifyChange();
        return;
      }
    }

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

  turnLeft(): void {
    this.leftDown = true;
    setTimeout(() => {
      this.leftDown = false;
    }, 100);
  }

  turnRight(): void {
    this.rightDown = true;
    setTimeout(() => {
      this.rightDown = false;
    }, 100);
  }

  tick(): void {
    if (this.gameState !== 'playing') return;

    // Debug: log first grid point before rotation
    const beforeGrid0 = this.project(this.sphereGrid[0]);

    if (this.leftDown || this.rightDown) {
      console.log('[TICK] inputs:', this.leftDown, this.rightDown, 'direction:', this.direction.toFixed(3));
    }
    if (this.leftDown) this.direction -= 0.08;
    if (this.rightDown) this.direction += 0.08;

    this.applySnakeRotation();

    const rotZ1 = RotationMatrix.rotateZ(-this.direction);
    const rotY = RotationMatrix.rotateY(-SNAKE_VELOCITY);
    const rotZ2 = RotationMatrix.rotateZ(this.direction);
    const globalMatrix = rotZ1.multiply(rotY).multiply(rotZ2);

    for (let i = 0; i < this.sphereGrid.length; i++) {
      const p = this.sphereGrid[i];
      const rotated = globalMatrix.multiplyPoint(p);
      p.x = rotated.x;
      p.y = rotated.y;
      p.z = rotated.z;
    }

    const rotatedPellet = globalMatrix.multiplyPoint(this.pellet);
    this.pellet.x = rotatedPellet.x;
    this.pellet.y = rotatedPellet.y;
    this.pellet.z = rotatedPellet.z;

    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const rotated = globalMatrix.multiplyPoint(node);
      node.x = rotated.x;
      node.y = rotated.y;
      node.z = rotated.z;

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

    // Debug: log first grid point after rotation (every 60 frames)
    if (this.tickCount === undefined) this.tickCount = 0;
    this.tickCount++;
    if (this.tickCount % 60 === 0) {
      const afterGrid0 = this.project(this.sphereGrid[0]);
      console.log(`[GRID] point0 before: (${beforeGrid0.x}, ${beforeGrid0.y}) after: (${afterGrid0.x}, ${afterGrid0.y})`);
    }
  }
  private tickCount?: number;

  // ========================================================================
  // Projection (shared with Cosyne bindings)
  // ========================================================================

  private project(point: Point3D): ProjectedPoint {
    const p = copyPoint(point);
    p.z += 2;

    let radius = NODE_ANGLE;
    const scaledFocalLength = this.focalLength * (this.sphereSize / 450);
    const scale = scaledFocalLength / p.z;

    const x = -p.x * scale + this.canvasWidth / 2;
    const y = -p.y * scale + this.canvasHeight / 2;
    const projRadius = radius * scale;
    const alpha = Math.max(0, 1 - (p.z - 1) / 2);

    return {
      x: Math.round(x),
      y: Math.round(y),
      radius: projRadius,
      depth: p.z,
      alpha,
    };
  }

  // ========================================================================
  // Cosyne-compatible getters
  // ========================================================================

  /** Get all projected grid points with their IDs for binding */
  getGridPointsForBinding(): Array<{ id: string; point: ProjectedPoint }> {
    return this.sphereGrid.map((p, i) => ({
      id: `grid-${i}`,
      point: this.project(p),
    }));
  }

  /** Get all projected snake nodes with their IDs for binding */
  getSnakeNodesForBinding(): Array<{ id: string; point: ProjectedPoint; index: number }> {
    return this.snake.map((node, i) => ({
      id: `snake-${i}`,
      point: this.project({ x: node.x, y: node.y, z: node.z }),
      index: i,
    }));
  }

  /** Get projected pellet position */
  getProjectedPellet(): ProjectedPoint {
    return this.project(this.pellet);
  }

  /** Get snake node color - reddish purple with depth and fade */
  getNodeColor(index: number, alpha: number): string {
    const depthColor = Math.floor(alpha * 255);
    // Fade alpha: segments further from head are more transparent
    const fadeAlpha = Math.floor((1 - index / this.snake.length) * alpha * 255);
    // Return hex format #RRGGBBAA
    const r = 120;
    const g = 0;
    const b = depthColor;
    const a = fadeAlpha;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  // ========================================================================
  // Standard getters
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
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => l());
  }

  reset(): void {
    this.snake = [];
    this.score = 0;
    this.gameState = 'playing';
    this.direction = STARTING_DIRECTION;
    this.leftDown = false;
    this.rightDown = false;
    this.init();
    this.notifyChange();
  }

  togglePause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
    }
    this.notifyChange();
  }
}

// ============================================================================
// UI Layer - Pseudo-Declarative with Cosyne
// ============================================================================

// Maximum snake length we pre-allocate (can grow during gameplay)
const MAX_SNAKE_NODES = 100;

export function buildPseudoDeclarativeSphericalSnakeApp(a: App): void {
  const game = new SphericalSnakeGame();
  const canvasSize = { width: 450, height: 450 };

  let scoreLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;
  let cosyneCtx: CosyneContext;
  let leftArrowCanvas: TappableCanvasRaster;
  let rightArrowCanvas: TappableCanvasRaster;
  let gridCanvas: TappableCanvasRaster; // Main canvas for grid + keyboard
  const gridBuffer = new Uint8Array(canvasSize.width * canvasSize.height * 4);

  // Track button press state
  let leftDown = false;
  let rightDown = false;

  // Draw grid (sphere graticule) to pixel buffer - hybrid approach
  // 1600 points is too many for individual Cosyne bindings, so we draw imperatively
  // Now draws OPAQUE (with background) to test if canvas updates work
  function drawGridToBuffer(): void {
    // Clear to gray background (like original)
    for (let i = 0; i < gridBuffer.length; i += 4) {
      gridBuffer[i] = 232;     // R
      gridBuffer[i + 1] = 232; // G
      gridBuffer[i + 2] = 232; // B
      gridBuffer[i + 3] = 255; // A = opaque
    }

    // Draw grid points (black dots with alpha blended onto background)
    const gridPoints = game.getGridPointsForBinding();
    for (const gp of gridPoints) {
      const x = Math.round(gp.point.x);
      const y = Math.round(gp.point.y);
      if (x >= 0 && x < canvasSize.width && y >= 0 && y < canvasSize.height) {
        const alpha = gp.point.alpha;
        const idx = (y * canvasSize.width + x) * 4;
        // Blend black dot with alpha onto gray background
        const bgColor = 232;
        const dotColor = Math.round(bgColor * (1 - alpha));
        gridBuffer[idx] = dotColor;
        gridBuffer[idx + 1] = dotColor;
        gridBuffer[idx + 2] = dotColor;
        gridBuffer[idx + 3] = 255;
      }
    }

    // Draw horizon circle using midpoint circle algorithm
    const horizonRadius = Math.round(canvasSize.width * 0.41);
    const centerX = Math.floor(canvasSize.width / 2);
    const centerY = Math.floor(canvasSize.height / 2);

    let cx = horizonRadius;
    let cy = 0;
    let radiusError = 1 - cx;

    const setPixel = (px: number, py: number) => {
      if (px >= 0 && px < canvasSize.width && py >= 0 && py < canvasSize.height) {
        const idx = (py * canvasSize.width + px) * 4;
        gridBuffer[idx] = 0;
        gridBuffer[idx + 1] = 0;
        gridBuffer[idx + 2] = 0;
        gridBuffer[idx + 3] = 255;
      }
    };

    while (cx >= cy) {
      setPixel(centerX + cx, centerY + cy);
      setPixel(centerX + cy, centerY + cx);
      setPixel(centerX - cy, centerY + cx);
      setPixel(centerX - cx, centerY + cy);
      setPixel(centerX - cx, centerY - cy);
      setPixel(centerX - cy, centerY - cx);
      setPixel(centerX + cy, centerY - cx);
      setPixel(centerX + cx, centerY - cy);
      cy++;
      if (radiusError < 0) {
        radiusError += 2 * cy + 1;
      } else {
        cx--;
        radiusError += 2 * (cy - cx + 1);
      }
    }
  }

  a.window({ title: 'Spherical Snake (Cosyne)', width: 500, height: 580 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Spherical Snake (Cosyne)').withId('title');
            a.hbox(() => {
              scoreLabel = a.label('Score: 0').withId('scoreLabel');
              statusLabel = a.label('Playing').withId('statusLabel');
            });
          });
        },
        center: () => {
          a.stack(() => {
            // Layer 0 (bottom): Cosyne for snake and pellet
            a.aspectRatio(1.0, () => {
              a.canvasStack(() => {
                cosyneCtx = cosyne(a, (c) => {
                // Gray background
                c.rect(0, 0, canvasSize.width, canvasSize.height, {
                  fillColor: '#E8E8E8',
                });

                  // Snake nodes with declarative bindings
                  // Pre-allocate MAX_SNAKE_NODES, hide unused ones
                  for (let i = 0; i < MAX_SNAKE_NODES; i++) {
                    const snakeNodes = game.getSnakeNodesForBinding();
                    const sn = snakeNodes[i];
                    const initialX = sn?.point.x ?? 0;
                    const initialY = sn?.point.y ?? 0;
                    // Use projected radius from point (varies with depth)
                    const initialRadius = sn ? Math.max(3, Math.round(sn.point.radius || 5)) : 3;
                    const initialColor = sn
                      ? game.getNodeColor(i, sn.point.alpha)
                      : '#00000000'; // transparent

                    const snakeCircle = c.circle(initialX, initialY, initialRadius, {
                      fillColor: initialColor,
                    }).withId(`snake-${i}`);

                    // Bind position
                    const nodeIndex = i;
                    snakeCircle.bindPosition(() => {
                      const nodes = game.getSnakeNodesForBinding();
                      const node = nodes[nodeIndex];
                      return node ? { x: node.point.x, y: node.point.y } : { x: -100, y: -100 };
                    });

                    // Bind fill color
                    snakeCircle.bindFill(() => {
                      const nodes = game.getSnakeNodesForBinding();
                      const node = nodes[nodeIndex];
                      if (!node) return '#00000000'; // transparent
                      return game.getNodeColor(nodeIndex, node.point.alpha);
                    });

                    // Bind visibility
                    snakeCircle.bindVisible(() => {
                      const nodes = game.getSnakeNodesForBinding();
                      return nodeIndex < nodes.length;
                    });
                  }

                  // Pellet with declarative bindings
                  const pellet = game.getProjectedPellet();
                  const pelletBlue = Math.floor(pellet.alpha * 255);
                  const pelletCircle = c.circle(pellet.x, pellet.y, Math.max(3, pellet.radius || 5), {
                    fillColor: `#0000${pelletBlue.toString(16).padStart(2, '0')}ff`,
                  }).withId('pellet');

                  pelletCircle.bindPosition(() => {
                    const p = game.getProjectedPellet();
                    return { x: p.x, y: p.y };
                  });

                  pelletCircle.bindRadius(() => {
                    const p = game.getProjectedPellet();
                    return Math.max(3, Math.round(p.radius || 5));
                  });

                  pelletCircle.bindFill(() => {
                    const p = game.getProjectedPellet();
                    const blue = Math.floor(p.alpha * 255);
                    return `#0000${blue.toString(16).padStart(2, '0')}ff`;
                  });
                });
              });
            });

            // Layer 1 (top): Grid canvas with keyboard handlers
            // Draws grid dots with transparent background so Cosyne shows through
            a.aspectRatio(1.0, () => {
              gridCanvas = a.tappableCanvasRaster(canvasSize.width, canvasSize.height, {
                onKeyDown: (key: string) => {
                  console.log('[GAME] KeyDown:', key);
                  if (key === 'Left' || key === 'ArrowLeft') {
                    leftDown = true;
                    game.setInputs(leftDown, rightDown);
                  }
                  if (key === 'Right' || key === 'ArrowRight') {
                    rightDown = true;
                    game.setInputs(leftDown, rightDown);
                  }
                },
                onKeyUp: (key: string) => {
                  console.log('[GAME] KeyUp:', key);
                  if (key === 'Left' || key === 'ArrowLeft') {
                    leftDown = false;
                    game.setInputs(leftDown, rightDown);
                  }
                  if (key === 'Right' || key === 'ArrowRight') {
                    rightDown = false;
                    game.setInputs(leftDown, rightDown);
                  }
                },
              }).withId('gridCanvas');
            });

            // Layer 2: Direction buttons at bottom corners
            const arrowSize = 80;
            const insetPercent = 0.1;
            a.border({
              bottom: () => {
                a.hbox(() => {
                  a.label('').withMinSize(Math.round(canvasSize.width * insetPercent), 1);

                  // Left arrow button
                  leftArrowCanvas = a.tappableCanvasRaster(arrowSize, arrowSize, {
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
                    },
                  }).withId('leftBtn');

                  a.spacer();

                  // Right arrow button
                  rightArrowCanvas = a.tappableCanvasRaster(arrowSize, arrowSize, {
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
                    },
                  }).withId('rightBtn');

                  a.label('').withMinSize(Math.round(canvasSize.width * insetPercent), 1);
                });
              },
            });
          });
        },
        bottom: () => {
          a.hbox(() => {
            a.button('New Game').onClick(async () => {
              game.reset();
              startGameLoop();
              updateUI();
            });
            a.button('Pause').onClick(() => {
              if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
                statusLabel.setText('Paused');
              } else {
                startGameLoop();
                statusLabel.setText('Playing');
              }
            });
          });
        },
      });
    });

    win.show();

    // Draw arrow buttons after initialization
    setTimeout(async () => {
      const arrowSize = 80;

      const leftBuffer = new Uint8Array(arrowSize * arrowSize * 4);
      drawArrow(leftBuffer, arrowSize, 'left');
      await leftArrowCanvas.setPixelBuffer(leftBuffer);

      const rightBuffer = new Uint8Array(arrowSize * arrowSize * 4);
      drawArrow(rightBuffer, arrowSize, 'right');
      await rightArrowCanvas.setPixelBuffer(rightBuffer);
    }, 200);

    let frameCount = 0;
    let rendering = false; // Prevent overlapping renders
    function startGameLoop(): void {
      if (gameLoop) clearInterval(gameLoop);

      gameLoop = setInterval(async () => {
        if (rendering) return; // Skip if previous frame still rendering
        rendering = true;
        try {
          game.tick();

          // Hybrid approach:
          // 1. Draw grid imperatively (1600 points, efficient pixel buffer)
          drawGridToBuffer();
          await gridCanvas.setPixelBuffer(gridBuffer);

          // 2. Refresh Cosyne bindings for snake/pellet (declarative)
          cosyneCtx.refreshBindings();

          updateUI();
          frameCount++;
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
      } else if (state === 'paused') {
        statusLabel.setText('Paused');
      } else {
        statusLabel.setText('Playing');
      }
    }

    // Start game and request keyboard focus
    setTimeout(async () => {
      // Initialize grid with first frame
      drawGridToBuffer();
      await gridCanvas.setPixelBuffer(gridBuffer);

      // Request focus on gridCanvas for arrow key input
      await gridCanvas.requestFocus();
      startGameLoop();
    }, 300);
  });
}

// ============================================================================
// Arrow Drawing Utility
// ============================================================================

function drawArrow(
  buffer: Uint8Array,
  size: number,
  direction: 'left' | 'right'
): void {
  // Fill with background matching sphere
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 232;
    buffer[i + 1] = 232;
    buffer[i + 2] = 232;
    buffer[i + 3] = 255;
  }

  const margin = Math.floor(size * 0.15);
  const cy = Math.floor(size / 2);
  const halfHeight = Math.floor((size - margin * 2) / 2);

  const setPixel = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const index = (y * size + x) * 4;
      buffer[index] = 80;
      buffer[index + 1] = 80;
      buffer[index + 2] = 80;
      buffer[index + 3] = 255;
    }
  };

  if (direction === 'left') {
    const tipX = margin;
    const baseX = size - margin;
    for (let row = -halfHeight; row <= halfHeight; row++) {
      const y = cy + row;
      const t = Math.abs(row) / halfHeight;
      const leftX = Math.floor(tipX + (baseX - tipX) * t);
      for (let x = leftX; x <= baseX; x++) {
        setPixel(x, y);
      }
    }
  } else {
    const tipX = size - margin;
    const baseX = margin;
    for (let row = -halfHeight; row <= halfHeight; row++) {
      const y = cy + row;
      const t = Math.abs(row) / halfHeight;
      const rightX = Math.floor(tipX - (tipX - baseX) * t);
      for (let x = baseX; x <= rightX; x++) {
        setPixel(x, y);
      }
    }
  }
}

// Entry point
if (require.main === module) {
  app(
    resolveTransport(),
    { title: 'Spherical Snake (Cosyne)' },
    buildPseudoDeclarativeSphericalSnakeApp
  );
}
