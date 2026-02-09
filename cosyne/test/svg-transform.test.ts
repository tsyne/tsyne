/**
 * Tests for SVG transform support:
 * - AffineMatrix: factories, multiply, apply, averageScale, isIdentity
 * - parseTransform: individual functions, combined strings, edge cases
 * - Grammar integration: g with transform, element-level transform, nested transforms
 */

import { AffineMatrix, parseTransform } from '../src/svg/transform';
import { svg } from '../src/svg/grammar';

const EPSILON = 1e-6;

function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

// ─── AffineMatrix unit tests ────────────────────────────────────

describe('AffineMatrix', () => {
  describe('identity', () => {
    it('should return identity matrix', () => {
      const m = AffineMatrix.identity();
      expect(m.a).toBe(1);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(1);
      expect(m.e).toBe(0);
      expect(m.f).toBe(0);
    });

    it('should report isIdentity() as true', () => {
      expect(AffineMatrix.identity().isIdentity()).toBe(true);
    });
  });

  describe('translate', () => {
    it('should create translation matrix', () => {
      const m = AffineMatrix.translate(10, 20);
      expect(m.e).toBe(10);
      expect(m.f).toBe(20);
      expect(m.a).toBe(1);
      expect(m.d).toBe(1);
    });

    it('should default ty to 0', () => {
      const m = AffineMatrix.translate(5);
      expect(m.e).toBe(5);
      expect(m.f).toBe(0);
    });

    it('should apply correctly', () => {
      const [x, y] = AffineMatrix.translate(10, 20).apply(3, 4);
      expect(x).toBe(13);
      expect(y).toBe(24);
    });
  });

  describe('scale', () => {
    it('should create uniform scale', () => {
      const m = AffineMatrix.scale(2);
      expect(m.a).toBe(2);
      expect(m.d).toBe(2);
    });

    it('should create non-uniform scale', () => {
      const m = AffineMatrix.scale(2, 3);
      expect(m.a).toBe(2);
      expect(m.d).toBe(3);
    });

    it('should apply correctly', () => {
      const [x, y] = AffineMatrix.scale(2, 3).apply(5, 7);
      expect(x).toBe(10);
      expect(y).toBe(21);
    });
  });

  describe('rotate', () => {
    it('should rotate 90 degrees', () => {
      const m = AffineMatrix.rotate(90);
      const [x, y] = m.apply(1, 0);
      expect(near(x, 0)).toBe(true);
      expect(near(y, 1)).toBe(true);
    });

    it('should rotate 180 degrees', () => {
      const m = AffineMatrix.rotate(180);
      const [x, y] = m.apply(1, 0);
      expect(near(x, -1)).toBe(true);
      expect(near(y, 0)).toBe(true);
    });

    it('should rotate around center point', () => {
      const m = AffineMatrix.rotate(90, 50, 50);
      const [x, y] = m.apply(50, 0);
      // (50,0) rotated 90deg around (50,50) → (100, 50)
      expect(near(x, 100)).toBe(true);
      expect(near(y, 50)).toBe(true);
    });
  });

  describe('skewX', () => {
    it('should skew in X direction', () => {
      const m = AffineMatrix.skewX(45);
      const [x, y] = m.apply(0, 1);
      expect(near(x, 1)).toBe(true);
      expect(near(y, 1)).toBe(true);
    });
  });

  describe('skewY', () => {
    it('should skew in Y direction', () => {
      const m = AffineMatrix.skewY(45);
      const [x, y] = m.apply(1, 0);
      expect(near(x, 1)).toBe(true);
      expect(near(y, 1)).toBe(true);
    });
  });

  describe('fromMatrix', () => {
    it('should create from 6 values', () => {
      const m = AffineMatrix.fromMatrix(2, 0, 0, 3, 10, 20);
      const [x, y] = m.apply(1, 1);
      expect(x).toBe(12);
      expect(y).toBe(23);
    });
  });

  describe('multiply', () => {
    it('identity * M = M', () => {
      const m = AffineMatrix.translate(10, 20);
      const result = AffineMatrix.identity().multiply(m);
      expect(result.e).toBe(10);
      expect(result.f).toBe(20);
    });

    it('translate then scale', () => {
      // translate(10,0) then scale(2) → point (0,0) → (10,0) → (20,0)
      const m = AffineMatrix.translate(10, 0).multiply(AffineMatrix.scale(2));
      const [x, y] = m.apply(0, 0);
      expect(near(x, 10)).toBe(true);
      expect(near(y, 0)).toBe(true);
    });

    it('scale then translate', () => {
      // scale(2) then translate(10,0) → point (0,0) → (0,0) → (10,0)
      // But as matrix: scale(2) * translate(10,0) = [2,0,0,2,20,0]
      // apply to (0,0) → (20, 0)
      const m = AffineMatrix.scale(2).multiply(AffineMatrix.translate(10, 0));
      const [x, y] = m.apply(0, 0);
      expect(near(x, 20)).toBe(true);
    });

    it('chained rotations', () => {
      const m = AffineMatrix.rotate(45).multiply(AffineMatrix.rotate(45));
      const [x, y] = m.apply(1, 0);
      // 90 degree rotation
      expect(near(x, 0)).toBe(true);
      expect(near(y, 1)).toBe(true);
    });
  });

  describe('averageScale', () => {
    it('should return 1 for identity', () => {
      expect(near(AffineMatrix.identity().averageScale(), 1)).toBe(true);
    });

    it('should return scale factor for uniform scale', () => {
      expect(near(AffineMatrix.scale(3).averageScale(), 3)).toBe(true);
    });

    it('should average non-uniform scale', () => {
      const s = AffineMatrix.scale(2, 4).averageScale();
      expect(near(s, 3)).toBe(true);
    });

    it('should return ~1 for pure rotation', () => {
      expect(near(AffineMatrix.rotate(45).averageScale(), 1)).toBe(true);
    });
  });

  describe('isIdentity', () => {
    it('returns false for translate', () => {
      expect(AffineMatrix.translate(1, 0).isIdentity()).toBe(false);
    });

    it('returns false for scale', () => {
      expect(AffineMatrix.scale(2).isIdentity()).toBe(false);
    });
  });
});

// ─── parseTransform tests ───────────────────────────────────────

describe('parseTransform', () => {
  it('should return identity for empty string', () => {
    expect(parseTransform('').isIdentity()).toBe(true);
  });

  it('should parse translate(x, y)', () => {
    const m = parseTransform('translate(10, 20)');
    const [x, y] = m.apply(0, 0);
    expect(x).toBe(10);
    expect(y).toBe(20);
  });

  it('should parse translate(x) with implicit y=0', () => {
    const m = parseTransform('translate(10)');
    expect(m.e).toBe(10);
    expect(m.f).toBe(0);
  });

  it('should parse scale(s)', () => {
    const m = parseTransform('scale(2)');
    const [x, y] = m.apply(3, 4);
    expect(x).toBe(6);
    expect(y).toBe(8);
  });

  it('should parse scale(sx, sy)', () => {
    const m = parseTransform('scale(2, 3)');
    const [x, y] = m.apply(1, 1);
    expect(x).toBe(2);
    expect(y).toBe(3);
  });

  it('should parse rotate(degrees)', () => {
    const m = parseTransform('rotate(90)');
    const [x, y] = m.apply(1, 0);
    expect(near(x, 0)).toBe(true);
    expect(near(y, 1)).toBe(true);
  });

  it('should parse rotate(degrees, cx, cy)', () => {
    const m = parseTransform('rotate(90, 50, 50)');
    const [x, y] = m.apply(50, 0);
    expect(near(x, 100)).toBe(true);
    expect(near(y, 50)).toBe(true);
  });

  it('should parse matrix(a,b,c,d,e,f)', () => {
    const m = parseTransform('matrix(1, 0, 0, 1, 100, 200)');
    const [x, y] = m.apply(0, 0);
    expect(x).toBe(100);
    expect(y).toBe(200);
  });

  it('should parse skewX(degrees)', () => {
    const m = parseTransform('skewX(45)');
    const [x, y] = m.apply(0, 10);
    expect(near(x, 10)).toBe(true);
    expect(y).toBe(10);
  });

  it('should parse skewY(degrees)', () => {
    const m = parseTransform('skewY(45)');
    const [x, y] = m.apply(10, 0);
    expect(x).toBe(10);
    expect(near(y, 10)).toBe(true);
  });

  it('should compose multiple transforms left-to-right', () => {
    // translate(10,0) scale(2) → point (5,0) → scale first: (10,0) → translate: (20,0)
    // SVG spec: transforms applied right-to-left to the point
    // But listed left-to-right means: result = T * S
    // T*S applied to (5,0): S*(5,0) = (10,0), T*(10,0) = (20,0)
    const m = parseTransform('translate(10, 0) scale(2)');
    const [x, y] = m.apply(5, 0);
    expect(near(x, 20)).toBe(true);
    expect(near(y, 0)).toBe(true);
  });

  it('should handle space-separated args', () => {
    const m = parseTransform('translate(10 20)');
    expect(m.e).toBe(10);
    expect(m.f).toBe(20);
  });

  it('should handle no-space between transforms', () => {
    const m = parseTransform('translate(5,0)scale(2)');
    const [x, y] = m.apply(1, 0);
    expect(near(x, 7)).toBe(true);
  });

  it('should return identity for unrecognized input', () => {
    expect(parseTransform('foo(1,2)').isIdentity()).toBe(true);
  });
});

// ─── Grammar integration tests ──────────────────────────────────

function createMockApp() {
  const calls: { method: string; args: any[] }[] = [];
  return {
    calls,
    canvasPath(opts: any) {
      calls.push({ method: 'canvasPath', args: [opts] });
      return { update(u: any) {} };
    },
    canvasCircle(opts: any) {
      calls.push({ method: 'canvasCircle', args: [opts] });
      return { update(u: any) {} };
    },
    canvasEllipse(opts: any) {
      calls.push({ method: 'canvasEllipse', args: [opts] });
      return { update(u: any) {} };
    },
    canvasRectangle(opts: any) {
      calls.push({ method: 'canvasRectangle', args: [opts] });
      return { update(u: any) {} };
    },
    canvasLine(x1: number, y1: number, x2: number, y2: number, opts: any) {
      calls.push({ method: 'canvasLine', args: [x1, y1, x2, y2, opts] });
      return { update(u: any) {} };
    },
  };
}

describe('Grammar transform integration', () => {
  it('should apply group transform to child path', () => {
    const app = createMockApp();
    // viewBox 0 0 100 100, canvas 100x100 → 1:1 mapping
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'translate(10, 20)' }, () => {
        s.path({ d: 'M 0 0 L 50 50' });
      });
    });

    expect(app.calls.length).toBe(1);
    const pathCall = app.calls[0];
    expect(pathCall.method).toBe('canvasPath');
    // M 0,0 → translate(10,20) → M 10,20
    // L 50,50 → translate(10,20) → L 60,70
    expect(pathCall.args[0].path).toContain('M 10 20');
    expect(pathCall.args[0].path).toContain('L 60 70');
  });

  it('should apply element-level transform to path', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.path({ d: 'M 0 0 L 10 0', transform: 'scale(2)' });
    });

    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 0 0');
    expect(path).toContain('L 20 0');
  });

  it('should apply group transform to circle center', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'translate(10, 20)' }, () => {
        s.circle({ cx: 0, cy: 0, r: 5 });
      });
    });

    expect(app.calls.length).toBe(1);
    const circle = app.calls[0].args[0];
    // center should be at (10, 20), radius 5
    expect(near(circle.x, 5)).toBe(true);   // cx - r = 10 - 5
    expect(near(circle.y, 15)).toBe(true);  // cy - r = 20 - 5
    expect(near(circle.x2, 15)).toBe(true); // cx + r = 10 + 5
    expect(near(circle.y2, 25)).toBe(true); // cy + r = 20 + 5
  });

  it('should apply scale to circle radius', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'scale(2)' }, () => {
        s.circle({ cx: 10, cy: 10, r: 5 });
      });
    });

    expect(app.calls.length).toBe(1);
    const circle = app.calls[0].args[0];
    // center (10,10) * scale(2) = (20,20), radius 5 * 2 = 10
    expect(near(circle.x, 10)).toBe(true);  // 20 - 10
    expect(near(circle.y, 10)).toBe(true);
    expect(near(circle.x2, 30)).toBe(true); // 20 + 10
    expect(near(circle.y2, 30)).toBe(true);
  });

  it('should nest transforms', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'translate(10, 0)' }, () => {
        s.g({ transform: 'translate(0, 10)' }, () => {
          s.path({ d: 'M 0 0 L 5 5' });
        });
      });
    });

    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 10 10');
    expect(path).toContain('L 15 15');
  });

  it('should isolate transform to group scope', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'translate(10, 10)' }, () => {
        s.path({ d: 'M 0 0 L 5 0' });
      });
      // After group, transform should be popped
      s.path({ d: 'M 0 0 L 5 0' });
    });

    expect(app.calls.length).toBe(2);
    // First path is translated
    expect(app.calls[0].args[0].path).toContain('M 10 10');
    // Second path is NOT translated
    expect(app.calls[1].args[0].path).toContain('M 0 0');
  });

  it('should apply transform to rect via corner mapping', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.rect({ x: 0, y: 0, width: 10, height: 10, transform: 'translate(20, 30)' });
    });

    expect(app.calls.length).toBe(1);
    const rect = app.calls[0].args[0];
    expect(near(rect.x, 20)).toBe(true);
    expect(near(rect.y, 30)).toBe(true);
    expect(near(rect.x2, 30)).toBe(true);
    expect(near(rect.y2, 40)).toBe(true);
  });

  it('should apply transform to line endpoints', () => {
    const app = createMockApp();
    svg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.line({ x1: 0, y1: 0, x2: 10, y2: 0, transform: 'translate(5, 5)' });
    });

    expect(app.calls.length).toBe(1);
    const [x1, y1, x2, y2] = app.calls[0].args;
    expect(near(x1, 5)).toBe(true);
    expect(near(y1, 5)).toBe(true);
    expect(near(x2, 15)).toBe(true);
    expect(near(y2, 5)).toBe(true);
  });
});
