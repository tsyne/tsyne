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

// Constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const BALL_RADIUS = 48;      // Ball radius in pixels
const SHADOW_OFFSET_X = 8;   // Shadow offset from ball
const SHADOW_OFFSET_Y = 64;  // Shadow offset below ball
const GRID_SPACING = 64;     // Grid line spacing
const FRAME_COUNT = 12;      // Number of rotation frames
const FPS = 30;              // Target frames per second

// Colors (RGB values)
const RED = { r: 204, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };
const GRID_COLOR = { r: 100, g: 100, b: 100 };
const SHADOW_ALPHA = 100;    // Shadow transparency

/**
 * Pre-rendered ball frame - array of colored pixels relative to ball center
 */
interface BallFrame {
  pixels: Array<{
    dx: number;    // Offset from center X
    dy: number;    // Offset from center Y
    r: number;
    g: number;
    b: number;
    visible: boolean;  // Front-facing
  }>;
}

/**
 * Generate a single frame of the boing ball
 * The ball is a sphere with a checkered pattern of red and white squares
 * @param frameIndex Frame index (0-11) for rotation angle
 */
function generateBallFrame(frameIndex: number): BallFrame {
  const pixels: BallFrame['pixels'] = [];
  const radius = BALL_RADIUS;

  // Rotation angle based on frame (one full rotation = 12 frames)
  const rotationAngle = (frameIndex / FRAME_COUNT) * Math.PI * 2;

  // Number of squares around the equator
  const numSquaresH = 8;
  const numSquaresV = 6;

  // For each pixel in the bounding box of the ball
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // Check if this pixel is within the sphere
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      // Calculate the Z coordinate on the sphere surface
      const z = Math.sqrt(radius * radius - dx * dx - dy * dy);

      // Only draw front-facing pixels (z > 0)
      if (z <= 0) continue;

      // Convert 2D screen coordinates to 3D sphere coordinates
      // x = dx, y = dy, z = sqrt(r^2 - x^2 - y^2)

      // Convert to spherical coordinates (theta = longitude, phi = latitude)
      // phi = angle from Y axis (0 = top, PI = bottom)
      // theta = angle around Y axis
      const phi = Math.acos(dy / radius);
      const theta = Math.atan2(dx, z) + rotationAngle;

      // Normalize theta to [0, 2*PI]
      let normalizedTheta = theta % (Math.PI * 2);
      if (normalizedTheta < 0) normalizedTheta += Math.PI * 2;

      // Calculate which square this point belongs to
      const squareH = Math.floor((normalizedTheta / (Math.PI * 2)) * numSquaresH);
      const squareV = Math.floor((phi / Math.PI) * numSquaresV);

      // Checkerboard pattern
      const isWhite = (squareH + squareV) % 2 === 1;

      // Add shading based on Z (depth) for 3D effect
      const shadeFactor = 0.5 + 0.5 * (z / radius);

      const color = isWhite ? WHITE : RED;
      pixels.push({
        dx,
        dy,
        r: Math.round(color.r * shadeFactor),
        g: Math.round(color.g * shadeFactor),
        b: Math.round(color.b * shadeFactor),
        visible: true
      });
    }
  }

  return { pixels };
}

/**
 * Pre-generate all ball frames
 */
function generateAllFrames(): BallFrame[] {
  const frames: BallFrame[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    frames.push(generateBallFrame(i));
  }
  return frames;
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
 */
class BoingDemo {
  private a: App;
  private win: Window | null = null;
  private canvas: CanvasRaster | null = null;
  private frames: BallFrame[];
  private physics: BallPhysics;
  private frameIndex: number = 0;
  private animationTimer: ReturnType<typeof setInterval> | null = null;

  // Previous positions for dirty rect tracking
  private prevBallX: number = 0;
  private prevBallY: number = 0;
  private prevShadowX: number = 0;
  private prevShadowY: number = 0;
  private isFirstFrame: boolean = true;

  // Dirty pixels to update
  private dirtyPixels: Array<{x: number; y: number; r: number; g: number; b: number; a: number}> = [];

  constructor(a: App) {
    this.a = a;
    this.frames = generateAllFrames();
    // Start ball at top-left area
    this.physics = new BallPhysics(BALL_RADIUS + 50, BALL_RADIUS + 50);
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
   * Add a pixel to the dirty list
   */
  private setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;
    this.dirtyPixels.push({ x: Math.floor(x), y: Math.floor(y), r, g, b, a });
  }

  /**
   * Get the background color at a pixel (grid or black)
   */
  private getBackgroundColor(x: number, y: number): { r: number; g: number; b: number } {
    const onGridH = y % GRID_SPACING === 0;
    const onGridV = x % GRID_SPACING === 0;
    return (onGridH || onGridV) ? GRID_COLOR : BLACK;
  }

  /**
   * Alpha-blend a color onto the background
   */
  private blendWithBackground(x: number, y: number, r: number, g: number, b: number, a: number): void {
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;

    const bg = this.getBackgroundColor(x, y);
    const alpha = a / 255;
    const invAlpha = 1 - alpha;

    const newR = Math.round(r * alpha + bg.r * invAlpha);
    const newG = Math.round(g * alpha + bg.g * invAlpha);
    const newB = Math.round(b * alpha + bg.b * invAlpha);

    this.dirtyPixels.push({ x: Math.floor(x), y: Math.floor(y), r: newR, g: newG, b: newB, a: 255 });
  }

  /**
   * Clear a rectangular region to background (grid + black)
   */
  private clearRegion(centerX: number, centerY: number, radiusX: number, radiusY: number): void {
    const x1 = Math.max(0, Math.floor(centerX - radiusX - 2));
    const y1 = Math.max(0, Math.floor(centerY - radiusY - 2));
    const x2 = Math.min(CANVAS_WIDTH - 1, Math.ceil(centerX + radiusX + 2));
    const y2 = Math.min(CANVAS_HEIGHT - 1, Math.ceil(centerY + radiusY + 2));

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const bg = this.getBackgroundColor(x, y);
        this.setPixel(x, y, bg.r, bg.g, bg.b);
      }
    }
  }

  /**
   * Render the entire scene
   */
  private async render(): Promise<void> {
    if (!this.canvas) return;

    this.dirtyPixels = [];

    const ballX = Math.round(this.physics.x);
    const ballY = Math.round(this.physics.y);
    const shadowX = ballX + SHADOW_OFFSET_X;
    const shadowY = ballY + SHADOW_OFFSET_Y;

    if (this.isFirstFrame) {
      // First frame: render entire background
      this.renderFullBackground();
      this.isFirstFrame = false;
    } else {
      // Subsequent frames: only clear previous positions
      // Clear old shadow position
      this.clearRegion(this.prevShadowX, this.prevShadowY, BALL_RADIUS, BALL_RADIUS / 2);
      // Clear old ball position
      this.clearRegion(this.prevBallX, this.prevBallY, BALL_RADIUS, BALL_RADIUS);
    }

    // Draw shadow first (so ball appears on top)
    this.renderShadow(shadowX, shadowY);

    // Draw ball
    this.renderBall(ballX, ballY);

    // Save current positions for next frame
    this.prevBallX = ballX;
    this.prevBallY = ballY;
    this.prevShadowX = shadowX;
    this.prevShadowY = shadowY;

    // Send all dirty pixels to the canvas
    if (this.dirtyPixels.length > 0 && this.canvas) {
      try {
        // Batch pixels in chunks to avoid overwhelming the bridge
        const BATCH_SIZE = 20000;
        for (let i = 0; i < this.dirtyPixels.length; i += BATCH_SIZE) {
          const batch = this.dirtyPixels.slice(i, i + BATCH_SIZE);
          await this.canvas.setPixels(batch);
        }
      } catch (e) {
        // Ignore errors during shutdown
      }
    }
  }

  /**
   * Render the full background (grid on black) - only for first frame
   */
  private renderFullBackground(): void {
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const bg = this.getBackgroundColor(x, y);
        this.setPixel(x, y, bg.r, bg.g, bg.b);
      }
    }
  }

  /**
   * Render the ball shadow (semi-transparent ellipse)
   */
  private renderShadow(centerX: number, centerY: number): void {
    const radiusX = BALL_RADIUS;
    const radiusY = BALL_RADIUS / 2; // Flattened for perspective

    for (let dy = -radiusY; dy <= radiusY; dy++) {
      for (let dx = -radiusX; dx <= radiusX; dx++) {
        // Ellipse equation: (x/a)^2 + (y/b)^2 <= 1
        const ellipseVal = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
        if (ellipseVal <= 1) {
          const x = centerX + dx;
          const y = centerY + dy;
          // Blend dark gray/black with some transparency
          this.blendWithBackground(x, y, 0, 0, 0, SHADOW_ALPHA);
        }
      }
    }
  }

  /**
   * Render the ball at the specified position
   */
  private renderBall(centerX: number, centerY: number): void {
    const frame = this.frames[this.frameIndex];

    for (const pixel of frame.pixels) {
      if (!pixel.visible) continue;

      const x = centerX + pixel.dx;
      const y = centerY + pixel.dy;

      this.setPixel(x, y, pixel.r, pixel.g, pixel.b);
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

// Export for testing
export { BoingDemo, BallPhysics, generateBallFrame, generateAllFrames };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Boing Ball Demo' }, async (a: App) => {
    const demo = createBoingApp(a);
    await a.run();
    await demo.initialize();
  });
}
