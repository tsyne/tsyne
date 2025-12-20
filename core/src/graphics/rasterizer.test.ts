import {
  rgba,
  parseColor,
  colorToHex,
  interpolateColor,
  drawLine,
  drawCircle,
  fillRect,
  fillPolygon,
  drawImage,
  renderHeatmap,
  Color,
  HeatmapPoint
} from './rasterizer';
import { createRenderTarget, RenderTarget, clearRenderTarget } from './platform';

describe('Color utilities', () => {
  describe('rgba', () => {
    it('creates a color object', () => {
      const c = rgba(100, 150, 200, 255);
      expect(c.r).toBe(100);
      expect(c.g).toBe(150);
      expect(c.b).toBe(200);
      expect(c.a).toBe(255);
    });

    it('defaults alpha to 255', () => {
      const c = rgba(100, 150, 200);
      expect(c.a).toBe(255);
    });
  });

  describe('parseColor', () => {
    it('parses 6-digit hex color', () => {
      const c = parseColor('#ff8040');
      expect(c.r).toBe(255);
      expect(c.g).toBe(128);
      expect(c.b).toBe(64);
      expect(c.a).toBe(255);
    });

    it('parses 3-digit hex color', () => {
      const c = parseColor('#f84');
      expect(c.r).toBe(255);
      expect(c.g).toBe(136);
      expect(c.b).toBe(68);
    });

    it('parses rgb() format', () => {
      const c = parseColor('rgb(100, 150, 200)');
      expect(c.r).toBe(100);
      expect(c.g).toBe(150);
      expect(c.b).toBe(200);
    });

    it('parses rgba() format', () => {
      const c = parseColor('rgba(100, 150, 200, 0.5)');
      expect(c.r).toBe(100);
      expect(c.g).toBe(150);
      expect(c.b).toBe(200);
      expect(c.a).toBe(128);
    });

    it('returns black for unparseable colors', () => {
      const c = parseColor('not-a-color');
      expect(c.r).toBe(0);
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
      expect(c.a).toBe(255);
    });
  });

  describe('colorToHex', () => {
    it('converts color to hex string', () => {
      const hex = colorToHex(rgba(255, 128, 64, 255));
      expect(hex).toBe('#ff8040');
    });

    it('pads single digit values', () => {
      const hex = colorToHex(rgba(0, 15, 1, 255));
      expect(hex).toBe('#000f01');
    });
  });

  describe('interpolateColor', () => {
    it('returns first color at t=0', () => {
      const c1 = rgba(0, 0, 0, 255);
      const c2 = rgba(255, 255, 255, 255);
      const result = interpolateColor(c1, c2, 0);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('returns second color at t=1', () => {
      const c1 = rgba(0, 0, 0, 255);
      const c2 = rgba(255, 255, 255, 255);
      const result = interpolateColor(c1, c2, 1);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('returns midpoint at t=0.5', () => {
      const c1 = rgba(0, 0, 0, 255);
      const c2 = rgba(200, 100, 50, 255);
      const result = interpolateColor(c1, c2, 0.5);
      expect(result.r).toBe(100);
      expect(result.g).toBe(50);
      expect(result.b).toBe(25);
    });
  });
});

describe('Drawing primitives', () => {
  let target: RenderTarget;

  beforeEach(() => {
    target = createRenderTarget(50, 50);
    clearRenderTarget(target, 0, 0, 0, 255);
  });

  describe('drawLine', () => {
    it('draws a horizontal line', () => {
      drawLine(target, 10, 25, 40, 25, rgba(255, 0, 0, 255), 1);

      // Check that pixels along the line have red color (may be anti-aliased)
      const y = 25;
      let hasRedPixels = false;
      for (let x = 10; x <= 40; x++) {
        const idx = (y * 50 + x) * 4;
        if (target.pixels[idx] > 0) hasRedPixels = true;
      }
      expect(hasRedPixels).toBe(true);
    });

    it('draws a vertical line', () => {
      drawLine(target, 25, 10, 25, 40, rgba(0, 255, 0, 255), 1);

      // Check that pixels along the line have green color (may be anti-aliased)
      const x = 25;
      let hasGreenPixels = false;
      for (let y = 10; y <= 40; y++) {
        const idx = (y * 50 + x) * 4;
        if (target.pixels[idx + 1] > 0) hasGreenPixels = true;
      }
      expect(hasGreenPixels).toBe(true);
    });

    it('draws a diagonal line', () => {
      drawLine(target, 10, 10, 40, 40, rgba(0, 0, 255, 255), 1);

      // Check that at least one diagonal pixel is set
      const idx = (25 * 50 + 25) * 4;
      expect(target.pixels[idx + 2]).toBe(255); // Blue
    });
  });

  describe('drawCircle', () => {
    it('draws a filled circle', () => {
      drawCircle(target, 25, 25, 10, rgba(255, 255, 0, 255), true);

      // Center should be filled
      const centerIdx = (25 * 50 + 25) * 4;
      expect(target.pixels[centerIdx]).toBe(255);
      expect(target.pixels[centerIdx + 1]).toBe(255);

      // Outside circle should be black
      const outsideIdx = (5 * 50 + 5) * 4;
      expect(target.pixels[outsideIdx]).toBe(0);
    });

    it('draws a circle outline', () => {
      drawCircle(target, 25, 25, 10, rgba(255, 0, 255, 255), false);

      // Check that edge pixels are drawn (approximate)
      const edgeIdx = (25 * 50 + 35) * 4; // Right edge
      expect(target.pixels[edgeIdx]).toBe(255);
      expect(target.pixels[edgeIdx + 2]).toBe(255);
    });
  });

  describe('fillRect', () => {
    it('fills a rectangle', () => {
      fillRect(target, 10, 10, 20, 15, rgba(0, 255, 255, 255));

      // Check corner
      const idx = (10 * 50 + 10) * 4;
      expect(target.pixels[idx + 1]).toBe(255);
      expect(target.pixels[idx + 2]).toBe(255);

      // Check inside
      const insideIdx = (17 * 50 + 20) * 4;
      expect(target.pixels[insideIdx + 1]).toBe(255);

      // Check outside
      const outsideIdx = (5 * 50 + 5) * 4;
      expect(target.pixels[outsideIdx]).toBe(0);
    });
  });

  describe('fillPolygon', () => {
    it('fills a triangle', () => {
      const vertices = [
        { x: 25, y: 10 },
        { x: 40, y: 40 },
        { x: 10, y: 40 }
      ];
      fillPolygon(target, vertices, rgba(255, 128, 64, 255));

      // Center of triangle should be filled
      const centerIdx = (30 * 50 + 25) * 4;
      expect(target.pixels[centerIdx]).toBe(255);
      expect(target.pixels[centerIdx + 1]).toBe(128);
    });
  });
});

describe('drawImage', () => {
  let target: RenderTarget;

  beforeEach(() => {
    target = createRenderTarget(50, 50);
    clearRenderTarget(target, 0, 0, 0, 255);
  });

  it('draws an image onto the target', () => {
    // Create a small 2x2 red image
    const image = {
      width: 2,
      height: 2,
      data: new Uint8Array([
        255, 0, 0, 255, // Red
        255, 0, 0, 255, // Red
        255, 0, 0, 255, // Red
        255, 0, 0, 255  // Red
      ])
    };

    drawImage(target, image, 10, 10, 2, 2);

    // Check that pixels were drawn
    const idx = (10 * 50 + 10) * 4;
    expect(target.pixels[idx]).toBe(255);
    expect(target.pixels[idx + 1]).toBe(0);
    expect(target.pixels[idx + 2]).toBe(0);
  });

  it('scales an image when drawing', () => {
    // Create a 1x1 green image
    const image = {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 255, 0, 255])
    };

    // Draw scaled to 4x4
    drawImage(target, image, 20, 20, 4, 4);

    // All 4x4 pixels should be green
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        const idx = ((20 + dy) * 50 + (20 + dx)) * 4;
        expect(target.pixels[idx + 1]).toBe(255);
      }
    }
  });
});

describe('renderHeatmap', () => {
  let target: RenderTarget;

  beforeEach(() => {
    target = createRenderTarget(100, 100);
    clearRenderTarget(target, 0, 0, 0, 255);
  });

  it('renders heatmap points', () => {
    const points: HeatmapPoint[] = [
      { x: 50, y: 50, weight: 1.0 }
    ];

    renderHeatmap(target, points, {
      radius: 20,
      intensity: 1.0,
      colorStops: [
        { stop: 0.0, color: rgba(0, 0, 255, 0) },
        { stop: 0.5, color: rgba(0, 255, 0, 128) },
        { stop: 1.0, color: rgba(255, 0, 0, 255) }
      ]
    });

    // Center should have color from heatmap
    const centerIdx = (50 * 100 + 50) * 4;
    // Should have some color applied (not pure black)
    const hasColor = target.pixels[centerIdx] > 0 ||
                     target.pixels[centerIdx + 1] > 0 ||
                     target.pixels[centerIdx + 2] > 0;
    expect(hasColor).toBe(true);
  });

  it('supports elliptical radius with radiusY', () => {
    const points: HeatmapPoint[] = [
      { x: 50, y: 50, weight: 1.0 }
    ];

    renderHeatmap(target, points, {
      radius: 30,
      radiusY: 15, // Shorter in Y direction
      intensity: 1.0,
      colorStops: [
        { stop: 0.0, color: rgba(255, 255, 255, 0) },
        { stop: 1.0, color: rgba(255, 0, 0, 255) }
      ]
    });

    // Point at radiusX distance horizontally should be at edge
    // Point at same distance vertically should be outside
    const horizontalIdx = ((50) * 100 + 70) * 4; // 20 pixels right
    const verticalIdx = ((70) * 100 + 50) * 4;   // 20 pixels down (outside Y radius)

    // Horizontal should still have some color
    const hasHorizontalColor = target.pixels[horizontalIdx] > 0;
    // Vertical should be background (outside the ellipse)
    const verticalIsBackground = target.pixels[verticalIdx] === 0 &&
                                  target.pixels[verticalIdx + 1] === 0 &&
                                  target.pixels[verticalIdx + 2] === 0;

    expect(hasHorizontalColor).toBe(true);
    expect(verticalIsBackground).toBe(true);
  });

  it('respects point weights', () => {
    // Two points with different weights
    const points: HeatmapPoint[] = [
      { x: 25, y: 50, weight: 0.2 },
      { x: 75, y: 50, weight: 1.0 }
    ];

    renderHeatmap(target, points, {
      radius: 15,
      intensity: 1.0,
      colorStops: [
        { stop: 0.0, color: rgba(0, 0, 0, 0) },
        { stop: 1.0, color: rgba(255, 255, 255, 255) }
      ]
    });

    const lowWeightIdx = (50 * 100 + 25) * 4;
    const highWeightIdx = (50 * 100 + 75) * 4;

    // Higher weight should produce brighter pixel
    const lowBrightness = target.pixels[lowWeightIdx] + target.pixels[lowWeightIdx + 1] + target.pixels[lowWeightIdx + 2];
    const highBrightness = target.pixels[highWeightIdx] + target.pixels[highWeightIdx + 1] + target.pixels[highWeightIdx + 2];

    expect(highBrightness).toBeGreaterThan(lowBrightness);
  });
});
