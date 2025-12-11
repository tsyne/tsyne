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

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { CanvasRaster } from '../../src/widgets/canvas';

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
 * Uses texture blitting for efficient rendering:
 * - Pre-renders ball frames and shadow as PNG sprites
 * - Registers them as resources at startup
 * - Uses blitImage() to draw sprites instead of individual setPixels()
 * - Uses fillRect() to efficiently clear previous positions
 *
 * This reduces per-frame bridge traffic from ~14,000 pixel updates to just 4-5 blit/fill calls.
 */
class BoingDemo {
  private a: App;
  private win: Window | null = null;
  private canvas: CanvasRaster | null = null;
  private frames: BallFrame[];
  private physics: BallPhysics;
  private frameIndex: number = 0;
  private animationTimer: ReturnType<typeof setInterval> | null = null;

  // Previous positions for dirty rect clearing
  private prevBallX: number = 0;
  private prevBallY: number = 0;
  private prevShadowX: number = 0;
  private prevShadowY: number = 0;
  private isFirstFrame: boolean = true;

  // Resource names for sprites
  private readonly SHADOW_RESOURCE = 'boing-shadow';
  private readonly BALL_RESOURCE_PREFIX = 'boing-frame-';

  constructor(a: App) {
    this.a = a;
    this.frames = generateAllFrames();
    // Start ball at top-left area
    this.physics = new BallPhysics(BALL_RADIUS + 50, BALL_RADIUS + 50);
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
    // Update physics
    const bounced = this.physics.update(
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      BALL_RADIUS
    );

    // TODO: Play boing sound when bounced is true
    // (Audio playback not currently supported in Tsyne)
    if (bounced) {
      // Future: play boing.wav
    }

    // Rotate to next frame
    this.frameIndex = (this.frameIndex + 1) % FRAME_COUNT;

    // Render the scene
    await this.render();
  }

  /**
   * Render the entire scene using sprite blitting
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
      if (this.isFirstFrame) {
        // First frame: render entire background with grid
        await this.renderFullBackground();
        this.isFirstFrame = false;
      } else {
        // Clear previous ball position (black background - grid will be redrawn by blit)
        const prevBallSpriteX = this.prevBallX - BALL_RADIUS;
        const prevBallSpriteY = this.prevBallY - BALL_RADIUS;
        await this.canvas.fillRect(
          prevBallSpriteX - 1, prevBallSpriteY - 1,
          SPRITE_SIZE + 2, SPRITE_SIZE + 2,
          BLACK.r, BLACK.g, BLACK.b
        );

        // Clear previous shadow position
        const prevShadowSpriteX = this.prevShadowX - BALL_RADIUS;
        const prevShadowSpriteY = this.prevShadowY - Math.floor(BALL_RADIUS / 2);
        await this.canvas.fillRect(
          prevShadowSpriteX - 1, prevShadowSpriteY - 1,
          SHADOW_WIDTH + 2, SHADOW_HEIGHT + 2,
          BLACK.r, BLACK.g, BLACK.b
        );

        // Redraw grid lines in cleared areas
        await this.redrawGridInRegion(prevBallSpriteX - 1, prevBallSpriteY - 1, SPRITE_SIZE + 2, SPRITE_SIZE + 2);
        await this.redrawGridInRegion(prevShadowSpriteX - 1, prevShadowSpriteY - 1, SHADOW_WIDTH + 2, SHADOW_HEIGHT + 2);
      }

      // Draw shadow first (so ball appears on top)
      await this.canvas.blitImage(this.SHADOW_RESOURCE, shadowSpriteX, shadowSpriteY);

      // Draw ball
      const ballResource = `${this.BALL_RESOURCE_PREFIX}${this.frameIndex}`;
      await this.canvas.blitImage(ballResource, ballSpriteX, ballSpriteY);

      // Save current positions for next frame
      this.prevBallX = ballX;
      this.prevBallY = ballY;
      this.prevShadowX = shadowX;
      this.prevShadowY = shadowY;
    } catch (e) {
      // Ignore errors during shutdown
    }
  }

  /**
   * Render the full background (black with grid)
   * Uses fillRect for efficient initial fill, then draws grid lines
   */
  private async renderFullBackground(): Promise<void> {
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

  /**
   * Redraw grid lines in a specific region (after clearing)
   */
  private async redrawGridInRegion(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.canvas) return;

    const x1 = Math.max(0, x);
    const y1 = Math.max(0, y);
    const x2 = Math.min(CANVAS_WIDTH, x + width);
    const y2 = Math.min(CANVAS_HEIGHT, y + height);

    // Find grid lines that intersect this region
    const startGridX = Math.floor(x1 / GRID_SPACING) * GRID_SPACING;
    const startGridY = Math.floor(y1 / GRID_SPACING) * GRID_SPACING;

    // Draw horizontal grid lines
    for (let gy = startGridY; gy < y2; gy += GRID_SPACING) {
      if (gy >= y1 && gy < y2) {
        await this.canvas.fillRect(x1, gy, x2 - x1, 1, GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b);
      }
    }

    // Draw vertical grid lines
    for (let gx = startGridX; gx < x2; gx += GRID_SPACING) {
      if (gx >= x1 && gx < x2) {
        await this.canvas.fillRect(gx, y1, 1, y2 - y1, GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b);
      }
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
    });
  }

  /**
   * Initialize after widgets are created
   */
  async initialize(): Promise<void> {
    // Register sprite resources
    await this.registerResources();

    // Render initial frame
    await this.render();

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
  });

  return demo;
}

// Export for testing (sprite functions are re-exported from ./sprites at top of file)
export { BoingDemo, BallPhysics };

/**
 * Main application entry point
 */
if (require.main === module) {
  // Use msgpack-uds for best performance (this app sends many pixels per frame)
  app({ title: 'Boing Ball Demo', bridgeMode: 'msgpack-uds' }, async (a: App) => {
    const demo = createBoingApp(a);
    await a.run();
    await demo.initialize();
  });
}
