/**
 * Tests for SVG transform support:
 * - AffineMatrix: factories, multiply, apply, averageScale, isIdentity
 * - AffineMatrix.fromSpec: typed TransformSpec objects
 * - parseTransform: individual functions, combined strings, edge cases
 * - Grammar integration: g with transform, element-level transform, nested transforms
 */

import { AffineMatrix, parseTransform, ProjectiveMatrix, composeTransforms, transformFromSpec } from '../src/cvg/transform';
import type { TransformSpec } from '../src/cvg/types';
import { cvg } from '../src/cvg/grammar';

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

  describe('fromSpec', () => {
    it('should handle translate only', () => {
      const m = AffineMatrix.fromSpec({ translate: [10, 20] });
      const [x, y] = m.apply(0, 0);
      expect(x).toBe(10);
      expect(y).toBe(20);
    });

    it('should handle uniform scale', () => {
      const m = AffineMatrix.fromSpec({ scale: 3 });
      const [x, y] = m.apply(2, 4);
      expect(x).toBe(6);
      expect(y).toBe(12);
    });

    it('should handle non-uniform scale', () => {
      const m = AffineMatrix.fromSpec({ scale: [2, 3] });
      const [x, y] = m.apply(1, 1);
      expect(x).toBe(2);
      expect(y).toBe(3);
    });

    it('should handle translate + scale (Big Ben pattern)', () => {
      const spec = AffineMatrix.fromSpec({ translate: [10, 0], scale: 2 });
      const str = parseTransform('translate(10, 0) scale(2)');
      const [sx, sy] = spec.apply(5, 0);
      const [px, py] = str.apply(5, 0);
      expect(near(sx, px)).toBe(true);
      expect(near(sy, py)).toBe(true);
    });

    it('should handle rotate (degrees)', () => {
      const m = AffineMatrix.fromSpec({ rotate: 90 });
      const [x, y] = m.apply(1, 0);
      expect(near(x, 0)).toBe(true);
      expect(near(y, 1)).toBe(true);
    });

    it('should handle rotate with center [deg, cx, cy]', () => {
      const m = AffineMatrix.fromSpec({ rotate: [90, 50, 50] });
      const [x, y] = m.apply(50, 0);
      expect(near(x, 100)).toBe(true);
      expect(near(y, 50)).toBe(true);
    });

    it('should handle skewX', () => {
      const m = AffineMatrix.fromSpec({ skewX: 45 });
      const [x, y] = m.apply(0, 10);
      expect(near(x, 10)).toBe(true);
      expect(y).toBe(10);
    });

    it('should handle skewY', () => {
      const m = AffineMatrix.fromSpec({ skewY: 45 });
      const [x, y] = m.apply(10, 0);
      expect(x).toBe(10);
      expect(near(y, 10)).toBe(true);
    });

    it('should return identity for empty spec', () => {
      expect(AffineMatrix.fromSpec({}).isIdentity()).toBe(true);
    });

    it('should match string equivalent for translate + scale', () => {
      const spec = AffineMatrix.fromSpec({ translate: [20, 30], scale: [1, -1] });
      const str = parseTransform('translate(20, 30) scale(1, -1)');
      // Test several points
      for (const [px, py] of [[0, 0], [10, 10], [50, 75]]) {
        const [sx, sy] = spec.apply(px, py);
        const [ex, ey] = str.apply(px, py);
        expect(near(sx, ex)).toBe(true);
        expect(near(sy, ey)).toBe(true);
      }
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
  const widget = { update(u: any) {} };
  return {
    /** Shape calls only (excludes sizing shim from cvg() wrapper). */
    calls,
    clip(fn: () => void) { fn(); return widget; },
    stack(fn: () => void) { fn(); },
    canvasStack(fn: () => void) { fn(); },
    canvasPath(opts: any) {
      calls.push({ method: 'canvasPath', args: [opts] });
      return widget;
    },
    canvasCircle(opts: any) {
      calls.push({ method: 'canvasCircle', args: [opts] });
      return widget;
    },
    canvasEllipse(opts: any) {
      calls.push({ method: 'canvasEllipse', args: [opts] });
      return widget;
    },
    canvasRectangle(opts: any) {
      // Skip the sizing shim rect (transparent, from cvg() wrapper)
      if (opts.fillColor !== 'transparent') {
        calls.push({ method: 'canvasRectangle', args: [opts] });
      }
      return widget;
    },
    canvasLine(x1: number, y1: number, x2: number, y2: number, opts: any) {
      calls.push({ method: 'canvasLine', args: [x1, y1, x2, y2, opts] });
      return widget;
    },
  };
}

describe('Grammar transform integration', () => {
  it('should apply group transform to child path', () => {
    const app = createMockApp();
    // viewBox 0 0 100 100, canvas 100x100 → 1:1 mapping
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.path({ d: 'M 0 0 L 10 0', transform: 'scale(2)' });
    });

    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 0 0');
    expect(path).toContain('L 20 0');
  });

  it('should apply group transform to circle center', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
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

// ─── Typed TransformSpec grammar integration ─────────────────────

describe('Grammar typed TransformSpec integration', () => {
  it('should apply typed translate to group children', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: { translate: [10, 20] } }, () => {
        s.path({ d: 'M 0 0 L 50 50' });
      });
    });

    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 10 20');
    expect(path).toContain('L 60 70');
  });

  it('should apply typed scale to group children', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: { scale: 2 } }, () => {
        s.path({ d: 'M 5 5 L 10 10' });
      });
    });

    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 10 10');
    expect(path).toContain('L 20 20');
  });

  it('should apply typed translate + scale (Big Ben pattern)', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: { translate: [10, 0], scale: 2 } }, () => {
        s.path({ d: 'M 0 0 L 5 0' });
      });
    });

    // Equivalent to 'translate(10, 0) scale(2)': point (5,0) → scale → (10,0) → translate → (20,0)
    expect(app.calls.length).toBe(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M 10 0');
    expect(path).toContain('L 20 0');
  });

  it('should apply typed transform on shape element (not just groups)', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.rect({ x: 0, y: 0, width: 10, height: 10, transform: { translate: [20, 30] } });
    });

    expect(app.calls.length).toBe(1);
    const rect = app.calls[0].args[0];
    expect(near(rect.x, 20)).toBe(true);
    expect(near(rect.y, 30)).toBe(true);
    expect(near(rect.x2, 30)).toBe(true);
    expect(near(rect.y2, 40)).toBe(true);
  });

  it('should produce same result as equivalent string transform', () => {
    const appTyped = createMockApp();
    const appString = createMockApp();

    cvg(appTyped, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: { translate: [15, 25], scale: [2, 3] } }, () => {
        s.path({ d: 'M 1 1 L 10 10' });
      });
    });

    cvg(appString, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: 'translate(15, 25) scale(2, 3)' }, () => {
        s.path({ d: 'M 1 1 L 10 10' });
      });
    });

    expect(appTyped.calls[0].args[0].path).toBe(appString.calls[0].args[0].path);
  });

  it('should apply typed transform to line endpoints', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.line({ x1: 0, y1: 0, x2: 10, y2: 0, transform: { translate: [5, 5] } });
    });

    expect(app.calls.length).toBe(1);
    const [x1, y1, x2, y2] = app.calls[0].args;
    expect(near(x1, 5)).toBe(true);
    expect(near(y1, 5)).toBe(true);
    expect(near(x2, 15)).toBe(true);
    expect(near(y2, 5)).toBe(true);
  });

  it('should apply typed rotate to circle center', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ transform: { rotate: [90, 50, 50] } }, () => {
        s.circle({ cx: 50, cy: 0, r: 5 });
      });
    });

    expect(app.calls.length).toBe(1);
    const circle = app.calls[0].args[0];
    // (50,0) rotated 90deg around (50,50) → (100, 50)
    expect(near(circle.x, 95)).toBe(true);   // 100 - 5
    expect(near(circle.y, 45)).toBe(true);   // 50 - 5
    expect(near(circle.x2, 105)).toBe(true); // 100 + 5
    expect(near(circle.y2, 55)).toBe(true);  // 50 + 5
  });
});

// ─── ProjectiveMatrix unit tests ─────────────────────────────────

describe('ProjectiveMatrix', () => {
  it('identity should not change points', () => {
    const m = ProjectiveMatrix.identity();
    const [x, y] = m.apply(7, 13);
    expect(x).toBe(7);
    expect(y).toBe(13);
  });

  it('fromAffine should match AffineMatrix behavior', () => {
    const a = AffineMatrix.translate(10, 20).multiply(AffineMatrix.scale(2));
    const p = ProjectiveMatrix.fromAffine(a);
    for (const [px, py] of [[0, 0], [5, 5], [100, 200]]) {
      const [ax, ay] = a.apply(px, py);
      const [ppx, ppy] = p.apply(px, py);
      expect(near(ppx, ax)).toBe(true);
      expect(near(ppy, ay)).toBe(true);
    }
  });

  it('isAffine should be true for promoted affine', () => {
    const p = ProjectiveMatrix.fromAffine(AffineMatrix.scale(3));
    expect(p.isAffine()).toBe(true);
  });

  it('isAffine should be false for perspective', () => {
    const p = ProjectiveMatrix.rotateY(30, 500);
    expect(p.isAffine()).toBe(false);
  });

  describe('rotateY', () => {
    it('0 degrees should be identity-like', () => {
      const m = ProjectiveMatrix.rotateY(0, 500);
      const [x, y] = m.apply(50, 50);
      expect(near(x, 50)).toBe(true);
      expect(near(y, 50)).toBe(true);
    });

    it('should shrink the far edge (positive angle)', () => {
      // rotateY(30, 500): right side of content goes "into" the screen
      // Point at x=100 should be foreshortened more than x=0
      const m = ProjectiveMatrix.rotateY(30, 500);
      const [x0, y0] = m.apply(0, 50);
      const [x100, y100] = m.apply(100, 50);
      // x=0 should be near 0 (cos*0 / (1 + sin*0/d) = 0)
      expect(near(x0, 0)).toBe(true);
      expect(near(y0, 50)).toBe(true);
      // x=100 should be < 100 (foreshortened)
      expect(x100).toBeLessThan(100);
      expect(x100).toBeGreaterThan(0);
    });

    it('should preserve y for points on the rotation axis', () => {
      const m = ProjectiveMatrix.rotateY(45, 300, 50, 50);
      const [x, y] = m.apply(50, 25);
      // x=50 is the rotation origin, so x doesn't change
      expect(near(x, 50)).toBe(true);
      // y should be preserved (rotateY doesn't affect y at the axis)
      expect(near(y, 25)).toBe(true);
    });

    it('with origin should rotate around that point', () => {
      const m = ProjectiveMatrix.rotateY(30, 500, 50, 50);
      // Origin point should not move
      const [ox, oy] = m.apply(50, 50);
      expect(near(ox, 50)).toBe(true);
      expect(near(oy, 50)).toBe(true);
    });
  });

  describe('rotateX', () => {
    it('0 degrees should be identity-like', () => {
      const m = ProjectiveMatrix.rotateX(0, 500);
      const [x, y] = m.apply(50, 50);
      expect(near(x, 50)).toBe(true);
      expect(near(y, 50)).toBe(true);
    });

    it('should shrink the far edge (positive angle)', () => {
      const m = ProjectiveMatrix.rotateX(30, 500);
      const [x0, y0] = m.apply(50, 0);
      const [x100, y100] = m.apply(50, 100);
      // y=0 should be near 0
      expect(near(y0, 0)).toBe(true);
      expect(near(x0, 50)).toBe(true);
      // y=100 should be foreshortened
      expect(y100).toBeLessThan(100);
      expect(y100).toBeGreaterThan(0);
    });

    it('should preserve x for points on the rotation axis', () => {
      const m = ProjectiveMatrix.rotateX(45, 300, 50, 50);
      const [x, y] = m.apply(25, 50);
      expect(near(x, 25)).toBe(true);
      expect(near(y, 50)).toBe(true);
    });
  });

  describe('multiply', () => {
    it('identity * M = M', () => {
      const m = ProjectiveMatrix.rotateY(30, 500);
      const result = ProjectiveMatrix.identity().multiply(m);
      const [x1, y1] = m.apply(50, 50);
      const [x2, y2] = result.apply(50, 50);
      expect(near(x1, x2)).toBe(true);
      expect(near(y1, y2)).toBe(true);
    });

    it('affine then projective should compose correctly', () => {
      const t = ProjectiveMatrix.fromAffine(AffineMatrix.translate(10, 0));
      const p = ProjectiveMatrix.rotateY(30, 500);
      // t.multiply(p) = t × p: applies p first, then t
      const composed = t.multiply(p);
      // Point (0,0) → p (rotateY) → t (translate +10)
      const [px, py] = p.apply(0, 0);
      const [ex, ey] = AffineMatrix.translate(10, 0).apply(px, py);
      const [cx, cy] = composed.apply(0, 0);
      expect(near(cx, ex)).toBe(true);
      expect(near(cy, ey)).toBe(true);
    });
  });
});

// ─── composeTransforms tests ─────────────────────────────────────

describe('composeTransforms', () => {
  it('affine + affine stays affine', () => {
    const result = composeTransforms(AffineMatrix.translate(5, 0), AffineMatrix.scale(2));
    expect(result).toBeInstanceOf(AffineMatrix);
  });

  it('affine + projective promotes to projective', () => {
    const result = composeTransforms(
      AffineMatrix.translate(10, 0),
      ProjectiveMatrix.rotateY(30, 500),
    );
    expect(result).toBeInstanceOf(ProjectiveMatrix);
  });

  it('projective + affine promotes to projective', () => {
    const result = composeTransforms(
      ProjectiveMatrix.rotateY(30, 500),
      AffineMatrix.translate(10, 0),
    );
    expect(result).toBeInstanceOf(ProjectiveMatrix);
  });
});

// ─── transformFromSpec tests ─────────────────────────────────────

describe('transformFromSpec', () => {
  it('without perspective returns AffineMatrix', () => {
    const result = transformFromSpec({ translate: [10, 20] });
    expect(result).toBeInstanceOf(AffineMatrix);
  });

  it('with cosynePerspective returns ProjectiveMatrix', () => {
    const result = transformFromSpec({
      translate: [10, 0],
      cosynePerspective: { rotateY: 30, distance: 500 },
    });
    expect(result).toBeInstanceOf(ProjectiveMatrix);
  });

  it('applies affine transforms before perspective', () => {
    const result = transformFromSpec({
      translate: [100, 0],
      cosynePerspective: { rotateY: 30, distance: 500 },
    });
    // Point (0,0) → translate → (100,0) → perspective
    const affine = AffineMatrix.translate(100, 0);
    const persp = ProjectiveMatrix.rotateY(30, 500);
    const expected = ProjectiveMatrix.fromAffine(affine).multiply(persp);
    const [rx, ry] = result.apply(0, 0);
    const [ex, ey] = expected.apply(0, 0);
    expect(near(rx, ex)).toBe(true);
    expect(near(ry, ey)).toBe(true);
  });
});

// ─── Perspective grammar integration ─────────────────────────────

describe('Grammar cosynePerspective integration', () => {
  it('should apply perspective to path points', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
      s.g({ transform: { cosynePerspective: { rotateY: 30, distance: 500, origin: [100, 100] } } }, () => {
        // Horizontal line at y=100 through the origin
        s.path({ d: 'M 0 100 L 200 100' });
      });
    });

    expect(app.calls.length).toBe(1);
    const pathStr = app.calls[0].args[0].path;
    // Extract coordinates from the path string
    const nums = pathStr.match(/[-\d.]+/g)!.map(Number);
    // Left point (0,100): x should shift right (foreshortened from left)
    // Right point (200,100): x should shift left (foreshortened from right)
    // Both should stay at y ≈ 100 (rotateY doesn't affect y at origin height)
    expect(near(nums[1], 100, 0.5)).toBe(true);  // y of first point
    expect(near(nums[3], 100, 0.5)).toBe(true);  // y of second point
    // The line should be shorter than 200 (perspective compression)
    expect(nums[2] - nums[0]).toBeLessThan(200);
  });

  it('should render circle as bezier path under perspective', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
      s.g({ transform: { cosynePerspective: { rotateY: 30, distance: 500, origin: [100, 100] } } }, () => {
        s.circle({ cx: 100, cy: 100, r: 20 });
      });
    });

    // Circle under perspective should be rendered as a canvasPath (bezier), not canvasCircle
    expect(app.calls.length).toBe(1);
    expect(app.calls[0].method).toBe('canvasPath');
    const pathStr = app.calls[0].args[0].path;
    // Should contain cubic bezier commands
    expect(pathStr).toContain('C');
  });

  it('should render rect as path under perspective', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
      s.g({ transform: { cosynePerspective: { rotateY: 30, distance: 500, origin: [100, 100] } } }, () => {
        s.rect({ x: 50, y: 50, width: 100, height: 100, fill: 'red' });
      });
    });

    // Rect under perspective should be rendered as a canvasPath, not canvasRectangle
    expect(app.calls.length).toBe(1);
    expect(app.calls[0].method).toBe('canvasPath');
  });

  it('perspective origin should stay fixed', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
      s.g({ transform: { cosynePerspective: { rotateY: 30, distance: 500, origin: [100, 100] } } }, () => {
        // A point at the origin should not move
        s.path({ d: 'M 100 100 L 101 100' });
      });
    });

    const pathStr = app.calls[0].args[0].path;
    const nums = pathStr.match(/[-\d.]+/g)!.map(Number);
    expect(near(nums[0], 100, 0.5)).toBe(true);
    expect(near(nums[1], 100, 0.5)).toBe(true);
  });
});
