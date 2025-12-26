// @tsyne-app:name Boing
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" fill="#CC0000" stroke="#FFFFFF"/><path d="M7 7L17 17M7 17L17 7M12 2v20M2 12h20" stroke="#FFFFFF" stroke-width="1.5"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder createBoingApp

/**
 * Boing Ball Demo for Tsyne
 *
 * Ported from https://github.com/vygr/ChrysaLisp/blob/master/apps/boing/app.lisp
 * Original author: Chris Hinsley (vygr)
 * License: See ChrysaLisp repository
 *
 * This is a recreation of the classic Amiga Boing Ball demo, originally created
 * by Dale Luck and R.J. Mical for the Amiga in 1984/1985. The demo was famous for
 * showcasing the Amiga's graphics capabilities at CES 1984.
 *
 * Chris Hinsley created the ChrysaLisp version and previously did TaOS version in 1992.
 *
 * Features:
 * - Classic red and white checkered rotating sphere
 * - Smooth bouncing animation with gravity
 * - Shadow that follows the ball
 * - Grid background
 *
 * Note: Audio (boing sound) is not implemented as Tsyne doesn't currently
 * have audio playback support.
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { CanvasRaster } from '../../core/src/widgets/canvas';
import type { Label } from '../../core/src/widgets/display';

// Import sprite generation from sibling module
// (The original ChrysaLisp app used proprietary .cpm image files;
// we recreate those sprites programmatically in sprites.ts)
import {
  BALL_RADIUS,
  FRAME_COUNT,
  SPRITE_SIZE,
  SHADOW_WIDTH,
  SHADOW_HEIGHT,
  BallFrame,
  generateAllFrames,
  generateAllBallSprites,
  generateShadowSprite,
} from './sprites';

// Re-export sprite functions for testing
export {
  BallFrame,
  generateBallFrame,
  generateAllFrames,
  generateBallSprite,
  generateShadowSprite,
  encodePNG,
} from './sprites';

// App-specific constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const SHADOW_OFFSET_X = 8;   // Shadow offset from ball
const SHADOW_OFFSET_Y = 64;  // Shadow offset below ball
const GRID_SPACING = 64;     // Grid line spacing
const FPS = 30;              // Target frames per second

// Colors (RGB values)
const BLACK = { r: 0, g: 0, b: 0 };
const GRID_COLOR = { r: 100, g: 100, b: 100 };

/**
 * Real-time performance monitoring
 * Tracks frame rate, operation timings, and identifies bottlenecks
 */
class PerformanceMonitor {
  private frameCount: number = 0;
  private lastSecond: number = Date.now();
  private currentFPS: number = 0;
  private frameStartTime: number = 0;
  private lastFrameTime: number = 0;

  private operationTimings: Map<string, number[]> = new Map();
  private currentOpStart: number = 0;
  private currentOp: string = '';

  // History for min/max/avg calculations
  private frameTimeHistory: number[] = [];
  private readonly HISTORY_SIZE = 120; // Keep last 4 seconds at 30 FPS

  /**
   * Called at the start of each animation frame
   */
  frameStart(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * Mark the start of an operation (physics, moveSprite, etc.)
   */
  opStart(name: string): void {
    this.currentOpStart = performance.now();
    this.currentOp = name;
  }

  /**
   * Mark the end of the current operation
   */
  opEnd(): void {
    if (this.currentOp) {
      const elapsed = performance.now() - this.currentOpStart;
      if (!this.operationTimings.has(this.currentOp)) {
        this.operationTimings.set(this.currentOp, []);
      }
      this.operationTimings.get(this.currentOp)!.push(elapsed);
      // Keep only last 60 samples per operation
      const times = this.operationTimings.get(this.currentOp)!;
      if (times.length > 60) {
        times.shift();
      }
    }
    this.currentOp = '';
  }

  /**
   * Called at the end of each animation frame
   */
  frameEnd(): void {
    this.lastFrameTime = performance.now() - this.frameStartTime;
    this.frameTimeHistory.push(this.lastFrameTime);
    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    this.frameCount++;
    const now = Date.now();
    if (now - this.lastSecond >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastSecond = now;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): {
    fps: number;
    frameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
    avgFrameTime: number;
    operationTimings: Record<string, { avg: number; max: number }>;
    memory?: NodeJS.MemoryUsage;
  } {
    const operationTimings: Record<string, { avg: number; max: number }> = {};

    for (const [name, times] of this.operationTimings.entries()) {
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        operationTimings[name] = {
          avg: sum / times.length,
          max: Math.max(...times),
        };
      }
    }

    const minFrameTime =
      this.frameTimeHistory.length > 0
        ? Math.min(...this.frameTimeHistory)
        : 0;
    const maxFrameTime =
      this.frameTimeHistory.length > 0
        ? Math.max(...this.frameTimeHistory)
        : 0;
    const avgFrameTime =
      this.frameTimeHistory.length > 0
        ? this.frameTimeHistory.reduce((a, b) => a + b, 0) /
          this.frameTimeHistory.length
        : 0;

    return {
      fps: this.currentFPS,
      frameTime: this.lastFrameTime,
      minFrameTime,
      maxFrameTime,
      avgFrameTime,
      operationTimings,
      memory: process.memoryUsage?.(),
    };
  }
}

/**
 * Ball physics simulation
 */
class BallPhysics {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  private gravity: number = 1;

  constructor(x: number, y: number, vx: number = 4, vy: number = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Update ball position and handle bouncing
   * @param width Container width
   * @param height Container height
   * @param ballRadius Ball radius
   * @returns true if ball bounced on bottom (for sound trigger)
   */
  update(width: number, height: number, ballRadius: number): boolean {
    let bounced = false;

    // Apply gravity
    this.vy += this.gravity;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off bottom
    const bottomLimit = height - ballRadius;
    if (this.y > bottomLimit) {
      this.y = bottomLimit;
      this.vy = -22; // Fixed bounce velocity like original
      bounced = true;
    }

    // Bounce off sides
    if (this.x < ballRadius) {
      this.x = ballRadius;
      this.vx = Math.abs(this.vx);
    } else if (this.x > width - ballRadius) {
      this.x = width - ballRadius;
      this.vx = -Math.abs(this.vx);
    }

    // Bounce off top
    if (this.y < ballRadius) {
      this.y = ballRadius;
      this.vy = Math.abs(this.vy);
    }

    return bounced;
  }
}

/**
 * Boing Demo - renders the classic bouncing ball animation
 *
 * Uses the sprite/dirty-rectangle system for efficient rendering:
 * - Pre-renders ball frames and shadow as PNG sprites
 * - Registers them as resources at startup
 * - Creates sprites for ball and shadow
 * - Uses moveSprite() and setSpriteResource() to animate
 * - Uses flush() to redraw only dirty rectangles
 *
 * This is the most efficient approach - the Go bridge:
 * 1. Tracks dirty rectangles automatically when sprites move
 * 2. Restores background pixels only in dirty regions
 * 3. Re-blits sprites that overlap dirty regions
 * 4. Single refresh at the end
 *
 * Per-frame work is O(sprite_area) instead of O(canvas_size).
 */
class BoingDemo {
  private a: App;
  private win: Window | null = null;
  private canvas: CanvasRaster | null = null;
  private frames: BallFrame[];
  private physics: BallPhysics;
  private frameIndex: number = 0;
  private animationTimer: ReturnType<typeof setInterval> | null = null;
  private spritesCreated: boolean = false;
  private perfMonitor: PerformanceMonitor;
  private statsLabel: Label | null = null;
  private statsUpdateCounter: number = 0;

  // Resource names for sprites
  private readonly SHADOW_RESOURCE = 'boing-shadow';
  private readonly BALL_RESOURCE_PREFIX = 'boing-frame-';
  private readonly SHADOW_SPRITE = 'shadow';
  private readonly BALL_SPRITE = 'ball';

  constructor(a: App) {
    this.a = a;
    this.frames = generateAllFrames();
    // Start ball at top-left area
    this.physics = new BallPhysics(BALL_RADIUS + 50, BALL_RADIUS + 50);
    this.perfMonitor = new PerformanceMonitor();
  }

  /**
   * Register all sprite resources (ball frames and shadow)
   * Must be called before rendering starts
   */
  async registerResources(): Promise<void> {
    // Generate and register ball frame sprites
    const sprites = generateAllBallSprites(this.frames);
    for (let i = 0; i < sprites.length; i++) {
      await this.a.resources.registerResource(`${this.BALL_RESOURCE_PREFIX}${i}`, sprites[i]);
    }

    // Generate and register shadow sprite
    const shadowSprite = generateShadowSprite();
    await this.a.resources.registerResource(this.SHADOW_RESOURCE, shadowSprite);
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.animationTimer) return;

    const frameTime = Math.floor(1000 / FPS);
    this.animationTimer = setInterval(() => this.tick(), frameTime);
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  /**
   * One animation frame
   */
  private async tick(): Promise<void> {
    this.perfMonitor.frameStart();

    // Update physics
    this.perfMonitor.opStart('physics');
    const bounced = this.physics.update(
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      BALL_RADIUS
    );
    this.perfMonitor.opEnd();

    // TODO: Play boing sound when bounced is true
    // (Audio playback not currently supported in Tsyne)
    if (bounced) {
      // Future: play boing.wav
    }

    // Rotate to next frame
    this.frameIndex = (this.frameIndex + 1) % FRAME_COUNT;

    // Render the scene
    await this.render();

    // Update stats display every 10 frames
    this.statsUpdateCounter++;
    if (this.statsUpdateCounter >= 10 && this.statsLabel) {
      this.statsUpdateCounter = 0;
      this.updateStatsDisplay();
    }

    this.perfMonitor.frameEnd();
  }

  /**
   * Render the scene using sprite system with dirty rectangles
   */
  private async render(): Promise<void> {
    if (!this.canvas) return;

    const ballX = Math.round(this.physics.x);
    const ballY = Math.round(this.physics.y);
    const shadowX = ballX + SHADOW_OFFSET_X;
    const shadowY = ballY + SHADOW_OFFSET_Y;

    // Sprite positions (top-left corner)
    const ballSpriteX = ballX - BALL_RADIUS;
    const ballSpriteY = ballY - BALL_RADIUS;
    const shadowSpriteX = shadowX - BALL_RADIUS;
    const shadowSpriteY = shadowY - Math.floor(BALL_RADIUS / 2);

    try {
      // Move sprites to new positions (this marks dirty rectangles)
      this.perfMonitor.opStart('moveSprite.shadow');
      await this.canvas.moveSprite(this.SHADOW_SPRITE, shadowSpriteX, shadowSpriteY);
      this.perfMonitor.opEnd();

      this.perfMonitor.opStart('moveSprite.ball');
      await this.canvas.moveSprite(this.BALL_SPRITE, ballSpriteX, ballSpriteY);
      this.perfMonitor.opEnd();

      // Change ball frame (for rotation animation)
      this.perfMonitor.opStart('setSpriteResource');
      const ballResource = `${this.BALL_RESOURCE_PREFIX}${this.frameIndex}`;
      await this.canvas.setSpriteResource(this.BALL_SPRITE, ballResource);
      this.perfMonitor.opEnd();

      // Flush - this does the efficient dirty-rect redraw
      this.perfMonitor.opStart('flush');
      await this.canvas.flush();
      this.perfMonitor.opEnd();
    } catch (e) {
      // Ignore errors during shutdown
    }
  }

  /**
   * Render the static background (black with grid)
   * This is saved as the background for the sprite system to restore
   */
  private async renderBackground(): Promise<void> {
    if (!this.canvas) return;

    // Fill entire canvas with black
    await this.canvas.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, BLACK.r, BLACK.g, BLACK.b);

    // Draw horizontal grid lines
    for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SPACING) {
      await this.canvas.fillRect(0, y, CANVAS_WIDTH, 1, GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b);
    }

    // Draw vertical grid lines
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SPACING) {
      await this.canvas.fillRect(x, 0, 1, CANVAS_HEIGHT, GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b);
    }
  }

  setupWindow(win: Window): void {
    this.win = win;

    // Set close handler to stop animation
    win.setCloseIntercept(async () => {
      this.stop();
      return true;
    });
  }

  /**
   * Build the UI content
   */
  buildContent(): void {
    this.a.vbox(() => {
      // Create the canvas for rendering
      this.canvas = this.a.canvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stats display label
      this.statsLabel = this.a.label('Stats: FPS 0 | Frame 0ms').withId('boingStats');
    });
  }

  /**
   * Update the stats display with current performance data
   */
  private updateStatsDisplay(): void {
    if (!this.statsLabel) return;

    const stats = this.perfMonitor.getStats();
    const mem = stats.memory;
    const memStr = mem ? ` | Mem ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB` : '';

    // Find the slowest operation
    let slowestOp = '';
    let slowestTime = 0;
    for (const [name, timing] of Object.entries(stats.operationTimings)) {
      if (timing.avg > slowestTime) {
        slowestTime = timing.avg;
        slowestOp = name;
      }
    }

    const slowestStr = slowestOp
      ? ` | Slow: ${slowestOp} ${slowestTime.toFixed(2)}ms`
      : '';

    const text = `FPS ${stats.fps} | Frame ${stats.frameTime.toFixed(1)}ms (avg ${stats.avgFrameTime.toFixed(1)}ms, max ${stats.maxFrameTime.toFixed(1)}ms)${slowestStr}${memStr}`;
    this.statsLabel.setText(text);
  }

  /**
   * Initialize after widgets are created
   */
  async initialize(): Promise<void> {
    if (!this.canvas) return;

    // Register sprite resources
    await this.registerResources();

    // Render static background (grid)
    await this.renderBackground();

    // Save background for dirty-rect restoration
    await this.canvas.saveBackground();

    // Initial sprite positions
    const ballX = Math.round(this.physics.x);
    const ballY = Math.round(this.physics.y);
    const shadowX = ballX + SHADOW_OFFSET_X;
    const shadowY = ballY + SHADOW_OFFSET_Y;
    const ballSpriteX = ballX - BALL_RADIUS;
    const ballSpriteY = ballY - BALL_RADIUS;
    const shadowSpriteX = shadowX - BALL_RADIUS;
    const shadowSpriteY = shadowY - Math.floor(BALL_RADIUS / 2);

    // Create sprites (shadow behind ball, lower z-index)
    await this.canvas.createSprite(
      this.SHADOW_SPRITE,
      this.SHADOW_RESOURCE,
      shadowSpriteX,
      shadowSpriteY,
      { zIndex: 0 }
    );
    await this.canvas.createSprite(
      this.BALL_SPRITE,
      `${this.BALL_RESOURCE_PREFIX}0`,
      ballSpriteX,
      ballSpriteY,
      { zIndex: 1 }
    );
    this.spritesCreated = true;

    // Initial flush to draw sprites
    await this.canvas.flush();

    // Start animation
    this.start();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();
  }
}

/**
 * Create the Boing app
 */
export function createBoingApp(a: App): BoingDemo {
  const demo = new BoingDemo(a);

  // Register cleanup
  a.registerCleanup(() => demo.cleanup());

  a.window({ title: 'Boing Ball Demo', width: CANVAS_WIDTH + 16, height: CANVAS_HEIGHT + 40 }, (win: Window) => {
    demo.setupWindow(win);

    win.setContent(() => {
      demo.buildContent();
    });

    win.show();
    // Trigger initial render after UI is set up (needed for phonetop)
    setTimeout(() => demo.initialize(), 0);
  });

  return demo;
}

// Export for testing (sprite functions are re-exported from ./sprites at top of file)
export { BoingDemo, BallPhysics, PerformanceMonitor };

/**
 * Main application entry point
 */
if (require.main === module) {
  app(resolveTransport(), { title: 'Boing Ball Demo' }, async (a: App) => {
    const demo = createBoingApp(a);
    await a.run();
    await demo.initialize();
  });
}
