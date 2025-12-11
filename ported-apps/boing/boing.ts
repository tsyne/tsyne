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
import * as zlib from 'zlib';

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

// Sprite dimensions (ball fits in a square, shadow is elliptical)
const SPRITE_SIZE = BALL_RADIUS * 2 + 1;  // 97x97 for ball
const SHADOW_WIDTH = BALL_RADIUS * 2 + 1;
const SHADOW_HEIGHT = BALL_RADIUS + 1;     // Half height for ellipse

// ============================================================================
// PNG Encoder - Creates PNG images from RGBA pixel data
// ============================================================================

/**
 * Create a CRC32 lookup table for PNG chunk checksums
 */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

/**
 * Calculate CRC32 for PNG chunk
 */
function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a PNG chunk with type, data, and CRC
 */
function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Encode RGBA pixel data as a PNG image
 * @param width Image width
 * @param height Image height
 * @param rgba RGBA pixel data (width * height * 4 bytes)
 * @returns PNG data as base64 data URI
 */
function encodePNG(width: number, height: number, rgba: Uint8Array): string {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);   // Bit depth
  ihdrData.writeUInt8(6, 9);   // Color type: RGBA
  ihdrData.writeUInt8(0, 10);  // Compression method
  ihdrData.writeUInt8(0, 11);  // Filter method
  ihdrData.writeUInt8(0, 12);  // Interlace method
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - filtered scanlines compressed with zlib
  // Each scanline has a filter byte (0 = no filter) followed by RGBA pixels
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter byte: none
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = rowOffset + 1 + x * 4;
      rawData[dstOffset] = rgba[srcOffset];       // R
      rawData[dstOffset + 1] = rgba[srcOffset + 1]; // G
      rawData[dstOffset + 2] = rgba[srcOffset + 2]; // B
      rawData[dstOffset + 3] = rgba[srcOffset + 3]; // A
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  const png = Buffer.concat([signature, ihdr, idat, iend]);
  return 'data:image/png;base64,' + png.toString('base64');
}

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

// ============================================================================
// Sprite Generation - Convert ball frames to PNG sprites
// ============================================================================

/**
 * Generate a PNG sprite from a ball frame
 * The sprite is centered in a SPRITE_SIZE x SPRITE_SIZE image with transparent background
 */
function generateBallSprite(frame: BallFrame): string {
  const rgba = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE * 4);
  // Initialize all pixels as transparent
  rgba.fill(0);

  const center = Math.floor(SPRITE_SIZE / 2);

  for (const pixel of frame.pixels) {
    if (!pixel.visible) continue;

    const x = center + pixel.dx;
    const y = center + pixel.dy;

    if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) continue;

    const offset = (y * SPRITE_SIZE + x) * 4;
    rgba[offset] = pixel.r;
    rgba[offset + 1] = pixel.g;
    rgba[offset + 2] = pixel.b;
    rgba[offset + 3] = 255; // Fully opaque
  }

  return encodePNG(SPRITE_SIZE, SPRITE_SIZE, rgba);
}

/**
 * Generate all ball frame sprites as PNG data URIs
 */
function generateAllBallSprites(frames: BallFrame[]): string[] {
  return frames.map(frame => generateBallSprite(frame));
}

/**
 * Generate the shadow sprite - a semi-transparent ellipse
 */
function generateShadowSprite(): string {
  const rgba = new Uint8Array(SHADOW_WIDTH * SHADOW_HEIGHT * 4);
  // Initialize all pixels as transparent
  rgba.fill(0);

  const centerX = Math.floor(SHADOW_WIDTH / 2);
  const centerY = Math.floor(SHADOW_HEIGHT / 2);
  const radiusX = BALL_RADIUS;
  const radiusY = BALL_RADIUS / 2;

  for (let y = 0; y < SHADOW_HEIGHT; y++) {
    for (let x = 0; x < SHADOW_WIDTH; x++) {
      const dx = x - centerX;
      const dy = y - centerY;

      // Ellipse equation: (x/a)^2 + (y/b)^2 <= 1
      const ellipseVal = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
      if (ellipseVal <= 1) {
        const offset = (y * SHADOW_WIDTH + x) * 4;
        rgba[offset] = 0;     // R
        rgba[offset + 1] = 0; // G
        rgba[offset + 2] = 0; // B
        rgba[offset + 3] = SHADOW_ALPHA; // Semi-transparent
      }
    }
  }

  return encodePNG(SHADOW_WIDTH, SHADOW_HEIGHT, rgba);
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

// Export for testing
export { BoingDemo, BallPhysics, generateBallFrame, generateAllFrames, generateBallSprite, generateShadowSprite, encodePNG };

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
