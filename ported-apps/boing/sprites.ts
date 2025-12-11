/**
 * Boing Ball Sprite Generation
 *
 * The original ChrysaLisp boing app used proprietary .cpm image files for the ball sprites.
 * This module recreates those sprites programmatically, generating:
 * - 12 rotation frames of the classic red/white checkered sphere
 * - A semi-transparent shadow ellipse
 *
 * The sprites are encoded as PNG images for use with Tsyne's resource system
 * and blitImage() API.
 */

import * as zlib from 'zlib';

// ============================================================================
// Constants
// ============================================================================

export const BALL_RADIUS = 48;
export const FRAME_COUNT = 12;
export const SHADOW_ALPHA = 100;

// Sprite dimensions
export const SPRITE_SIZE = BALL_RADIUS * 2 + 1;  // 97x97 for ball
export const SHADOW_WIDTH = BALL_RADIUS * 2 + 1;
export const SHADOW_HEIGHT = BALL_RADIUS + 1;    // Half height for ellipse

// Colors
const RED = { r: 204, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

// ============================================================================
// PNG Encoder
// ============================================================================

/**
 * CRC32 lookup table for PNG chunk checksums
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
export function encodePNG(width: number, height: number, rgba: Uint8Array): string {
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

// ============================================================================
// Ball Frame Generation
// ============================================================================

/**
 * Pre-rendered ball frame - array of colored pixels relative to ball center
 */
export interface BallFrame {
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
export function generateBallFrame(frameIndex: number): BallFrame {
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

      // Convert to spherical coordinates (theta = longitude, phi = latitude)
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
export function generateAllFrames(): BallFrame[] {
  const frames: BallFrame[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    frames.push(generateBallFrame(i));
  }
  return frames;
}

// ============================================================================
// Sprite Generation - Convert frames to PNG
// ============================================================================

/**
 * Generate a PNG sprite from a ball frame
 * The sprite is centered in a SPRITE_SIZE x SPRITE_SIZE image with transparent background
 */
export function generateBallSprite(frame: BallFrame): string {
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
export function generateAllBallSprites(frames: BallFrame[]): string[] {
  return frames.map(frame => generateBallSprite(frame));
}

/**
 * Generate the shadow sprite - a semi-transparent ellipse
 */
export function generateShadowSprite(): string {
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
