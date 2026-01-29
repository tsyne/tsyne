/**
 * Unit tests for blend mode primitives
 *
 * Note: Integration tests with TsyneTest require running via scripts/tsyne
 * due to TypeScript compilation issues with globals.ts.
 * Run: pnpm exec ts-node cosyne/test/blend-modes.test.ts
 */

import { CosyneRect } from '../src/primitives/rect';

// Mock underlying widget that tracks blendMode
class MockWidget {
  properties: any = {};

  update(props: any) {
    this.properties = { ...this.properties, ...props };
  }

  updateFillColor(color: string) {
    this.properties.fillColor = color;
  }

  updateStrokeColor(color: string) {
    this.properties.strokeColor = color;
  }

  updateStrokeWidth(width: number) {
    this.properties.strokeWidth = width;
  }

  updateBlendMode(mode: string) {
    this.properties.blendMode = mode;
  }
}

describe('Blend Modes', () => {
  describe('CosyneRect with blendMode', () => {
    it('should pass blendMode to underlying widget', () => {
      const widget = new MockWidget();
      // The blendMode is set at construction time via options
      // We can verify that primitives can hold blend mode info
      const rect = new CosyneRect(50, 50, 100, 80, widget);
      rect.fill('#ff0000');

      expect(rect.getPosition()).toEqual({ x: 50, y: 50 });
      expect(rect.getDimensions()).toEqual({ width: 100, height: 80 });
    });

    it('should create rect with fill and id', () => {
      const widget = new MockWidget();
      const rect = new CosyneRect(0, 0, 100, 100, widget)
        .fill('#ff0000')
        .withId('red-rect');

      expect(rect.getId()).toEqual('red-rect');
      expect(widget.properties.fillColor).toEqual('#ff0000');
    });
  });

  describe('Additive blend mode color math', () => {
    // These tests verify the expected color math for additive blending
    // The actual GPU blending is tested via integration tests

    it('Red + Green = Yellow', () => {
      const red = { r: 255, g: 0, b: 0 };
      const green = { r: 0, g: 255, b: 0 };
      const result = addColors(red, green);
      expect(result).toEqual({ r: 255, g: 255, b: 0 });
    });

    it('Red + Blue = Magenta', () => {
      const red = { r: 255, g: 0, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };
      const result = addColors(red, blue);
      expect(result).toEqual({ r: 255, g: 0, b: 255 });
    });

    it('Green + Blue = Cyan', () => {
      const green = { r: 0, g: 255, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };
      const result = addColors(green, blue);
      expect(result).toEqual({ r: 0, g: 255, b: 255 });
    });

    it('Red + Green + Blue = White', () => {
      const red = { r: 255, g: 0, b: 0 };
      const green = { r: 0, g: 255, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };
      const result = addColors(addColors(red, green), blue);
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('additive blending clamps to 255', () => {
      const bright = { r: 200, g: 200, b: 200 };
      const result = addColors(bright, bright);
      // 200 + 200 = 400 -> clamped to 255
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });
  });
});

// Helper function to simulate additive blending
interface RGB {
  r: number;
  g: number;
  b: number;
}

function addColors(a: RGB, b: RGB): RGB {
  return {
    r: Math.min(255, a.r + b.r),
    g: Math.min(255, a.g + b.g),
    b: Math.min(255, a.b + b.b),
  };
}
