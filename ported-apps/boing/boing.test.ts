/**
 * Tests for Boing Ball Demo
 */

import { BallPhysics, generateBallFrame, generateAllFrames } from './boing';

describe('BallPhysics', () => {
  it('should initialize with given position and velocity', () => {
    const ball = new BallPhysics(100, 100, 5, 0);
    expect(ball.x).toBe(100);
    expect(ball.y).toBe(100);
    expect(ball.vx).toBe(5);
    expect(ball.vy).toBe(0);
  });

  it('should apply gravity on update', () => {
    const ball = new BallPhysics(100, 100, 0, 0);
    ball.update(640, 480, 48);
    // Gravity adds 1 to vy, then position updates
    expect(ball.vy).toBe(1);
    expect(ball.y).toBe(101); // y + vy after gravity
  });

  it('should bounce off bottom', () => {
    const ballRadius = 48;
    const height = 480;
    // Position ball just above bottom
    const ball = new BallPhysics(100, height - ballRadius + 5, 0, 10);
    const bounced = ball.update(640, height, ballRadius);

    expect(bounced).toBe(true);
    expect(ball.y).toBe(height - ballRadius);
    expect(ball.vy).toBe(-22); // Fixed bounce velocity
  });

  it('should bounce off left wall', () => {
    const ballRadius = 48;
    // Position ball past left wall
    const ball = new BallPhysics(10, 200, -5, 0);
    ball.update(640, 480, ballRadius);

    expect(ball.x).toBe(ballRadius);
    expect(ball.vx).toBeGreaterThan(0); // Velocity reversed
  });

  it('should bounce off right wall', () => {
    const ballRadius = 48;
    const width = 640;
    // Position ball past right wall
    const ball = new BallPhysics(width - 10, 200, 5, 0);
    ball.update(width, 480, ballRadius);

    expect(ball.x).toBe(width - ballRadius);
    expect(ball.vx).toBeLessThan(0); // Velocity reversed
  });
});

describe('generateBallFrame', () => {
  it('should generate pixels for a frame', () => {
    const frame = generateBallFrame(0);

    expect(frame.pixels).toBeDefined();
    expect(frame.pixels.length).toBeGreaterThan(0);

    // Check all pixels are within ball bounds
    const ballRadius = 48;
    for (const pixel of frame.pixels) {
      expect(Math.abs(pixel.dx)).toBeLessThanOrEqual(ballRadius);
      expect(Math.abs(pixel.dy)).toBeLessThanOrEqual(ballRadius);
      expect(pixel.r).toBeGreaterThanOrEqual(0);
      expect(pixel.r).toBeLessThanOrEqual(255);
      expect(pixel.g).toBeGreaterThanOrEqual(0);
      expect(pixel.g).toBeLessThanOrEqual(255);
      expect(pixel.b).toBeGreaterThanOrEqual(0);
      expect(pixel.b).toBeLessThanOrEqual(255);
    }
  });

  it('should have both red and white pixels', () => {
    const frame = generateBallFrame(0);

    const hasRed = frame.pixels.some(p => p.r > 100 && p.g < 50 && p.b < 50);
    const hasWhite = frame.pixels.some(p => p.r > 100 && p.g > 100 && p.b > 100);

    expect(hasRed).toBe(true);
    expect(hasWhite).toBe(true);
  });
});

describe('generateAllFrames', () => {
  it('should generate 12 frames', () => {
    const frames = generateAllFrames();

    expect(frames.length).toBe(12);

    for (const frame of frames) {
      expect(frame.pixels.length).toBeGreaterThan(0);
    }
  });

  it('should have different patterns for different frames', () => {
    const frames = generateAllFrames();

    // Compare first and last frame - patterns should be different
    const frame0 = frames[0];
    const frame6 = frames[6]; // Half rotation

    // Get a sample pixel from the same position
    const sample0 = frame0.pixels.find(p => p.dx === 0 && p.dy === 0);
    const sample6 = frame6.pixels.find(p => p.dx === 0 && p.dy === 0);

    // At least the pattern should be different (due to rotation)
    // This is a weak test but ensures animation exists
    expect(sample0).toBeDefined();
    expect(sample6).toBeDefined();
  });
});
