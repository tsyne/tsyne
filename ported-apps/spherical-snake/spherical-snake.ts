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

import { App } from '../../src/app';
import { Window } from '../../src/window';
import { TappableCanvasRaster } from '../../src/widgets/canvas';
import { Label } from '../../src/widgets/display';

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
// Sphere Grid Generation (Fibonacci Sphere)
// ============================================================================

function generateSphereGrid(pointCount: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < pointCount; i++) {
    const theta = Math.acos(1 - (2 * i) / pointCount);
    const phi = (2 * Math.PI * i) / goldenRatio;

    const sinTheta = Math.sin(theta);
    points.push({
      x: Math.cos(phi) * sinTheta,
      y: Math.sin(phi) * sinTheta,
      z: Math.cos(theta)
    });
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
const GRID_POINT_COUNT = 1600;

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

  private focalLength = 200;
  private canvasWidth = 400;
  private canvasHeight = 300;

  constructor() {
    this.init();
  }

  private init(): void {
    this.sphereGrid = generateSphereGrid(GRID_POINT_COUNT);
    this.snake = [];
    for (let i = 0; i < 8; i++) {
      this.addSnakeNode();
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
    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const oldPosition = copyPoint(node);

      // Update position from rotated state
      const rotated = this.rotationMatrix.multiplyPoint(node);
      node.x = rotated.x;
      node.y = rotated.y;
      node.z = rotated.z;

      // Push to queue
      node.posQueue.unshift(oldPosition);
      node.posQueue.pop();
    }

    // Normalize to unit sphere
    for (let i = 0; i < this.snake.length; i++) {
      const node = this.snake[i];
      const len = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
      if (len > 0) {
        node.x /= len;
        node.y /= len;
        node.z /= len;
      }
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

    // Update direction
    if (this.leftDown) this.direction -= 0.08;
    if (this.rightDown) this.direction += 0.08;

    // Apply rotation
    const rotZ1 = RotationMatrix.rotateZ(-this.direction);
    const rotY = RotationMatrix.rotateY(-SNAKE_VELOCITY);
    const rotZ2 = RotationMatrix.rotateZ(this.direction);

    this.rotationMatrix = rotZ1.multiply(rotY).multiply(rotZ2);

    this.applySnakeRotation();
    this.checkCollisions();
  }

  // ========================================================================
  // Rendering & Projection
  // ========================================================================

  private project(point: Point3D): ProjectedPoint {
    const p = copyPoint(point);

    // Translate sphere origin
    p.z += 2;

    // Project to 2D
    let radius = NODE_ANGLE;
    const scale = this.focalLength / p.z;

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
  const canvasSize = game.canvasSize();

  let canvas: TappableCanvasRaster;
  let scoreLabel: Label;
  let statusLabel: Label;
  let gameLoop: NodeJS.Timeout | null = null;

  a.window({ title: 'Spherical Snake', width: 650, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Spherical Snake').withId('title');
        a.hbox(() => {
          scoreLabel = a.label('Score: 0').withId('scoreLabel');
          statusLabel = a.label('Playing').withId('statusLabel');
        });

        canvas = a
          .tappableCanvasRaster(canvasSize.width, canvasSize.height, {
            onKeyDown: (key: string) => handleKeyDown(key),
            onKeyUp: (key: string) => handleKeyUp(key)
          })
          .withId('gameCanvas');

        a.hbox(() => {
          a.button('New Game').onClick(() => {
            game.reset();
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
      });
    });

    win.show();

    let leftDown = false;
    let rightDown = false;

    function handleKeyDown(key: string): void {
      if (key === 'ArrowLeft') leftDown = true;
      if (key === 'ArrowRight') rightDown = true;
      game.setInputs(leftDown, rightDown);
    }

    function handleKeyUp(key: string): void {
      if (key === 'ArrowLeft') leftDown = false;
      if (key === 'ArrowRight') rightDown = false;
      game.setInputs(leftDown, rightDown);
    }

    async function renderFrame(): Promise<void> {
      const buffer = new Uint8Array(
        canvasSize.width * canvasSize.height * 4
      );

      // Fill background (black)
      for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 0; // R
        buffer[i + 1] = 0; // G
        buffer[i + 2] = 0; // B
        buffer[i + 3] = 255; // A
      }

      // Draw sphere grid (light gray, faint)
      const gridPoints = game.getProjectedGridPoints();
      for (const point of gridPoints) {
        drawPixel(buffer, point.x, point.y, canvasSize.width, 50, 50, 50, 100);
      }

      // Draw snake (white with fade)
      const snakeNodes = game.getProjectedSnakeNodes();
      for (let i = 0; i < snakeNodes.length; i++) {
        const point = snakeNodes[i];
        const alpha = Math.floor(200 - (i / snakeNodes.length) * 100);
        drawCircle(
          buffer,
          point.x,
          point.y,
          Math.max(3, Math.round(point.radius || 5)),
          canvasSize.width,
          canvasSize.height,
          255,
          255,
          255,
          alpha
        );
      }

      // Draw pellet (red)
      const pellet = game.getProjectedPellet();
      drawCircle(
        buffer,
        pellet.x,
        pellet.y,
        Math.max(3, Math.round(pellet.radius || 5)),
        canvasSize.width,
        canvasSize.height,
        255,
        0,
        0,
        255
      );

      await canvas.setPixelBuffer(buffer);
    }

    function startGameLoop(): void {
      if (gameLoop) clearInterval(gameLoop);

      gameLoop = setInterval(async () => {
        game.tick();
        await renderFrame();
        updateUI();
      }, 15); // 15ms ~ 67 FPS
    }

    function updateUI(): void {
      scoreLabel.setText(`Score: ${game.getScore()}`);
      const state = game.getGameState();
      if (state === 'gameover') {
        statusLabel.setText('GAME OVER');
        if (gameLoop) {
          clearInterval(gameLoop);
          gameLoop = null;
        }
      } else {
        statusLabel.setText('Playing');
      }
    }

    // Request canvas focus and start game
    (async () => {
      await canvas.requestFocus();
      startGameLoop();
      await renderFrame();
    })();
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

// Entry point
if (require.main === module) {
  const { app, resolveTransport } = require('../../src/index');
  app(resolveTransport(), { title: 'Spherical Snake' }, buildSphericalSnakeApp);
}
