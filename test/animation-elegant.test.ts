import { getPointOnBezier } from '../src/animation';

describe('getPointOnBezier', () => {
  it('should return the correct point for a linear Bezier curve (degree 1)', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const points = [p0, p1];

    expect(getPointOnBezier(points, 0)).toEqual(p0);
    expect(getPointOnBezier(points, 1)).toEqual(p1);
    expect(getPointOnBezier(points, 0.5)).toEqual({ x: 50, y: 0 });
    expect(getPointOnBezier(points, 0.25)).toEqual({ x: 25, y: 0 });
  });

  it('should return the correct point for a quadratic Bezier curve (degree 2)', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 50, y: 100 };
    const p2 = { x: 100, y: 0 };
    const points = [p0, p1, p2];

    expect(getPointOnBezier(points, 0)).toEqual(p0);
    expect(getPointOnBezier(points, 1)).toEqual(p2);
    expect(getPointOnBezier(points, 0.5)).toEqual({ x: 50, y: 50 }); // (0.5)^2*0 + 2*0.5*0.5*50 + (0.5)^2*100 = 0 + 25 + 25 = 50
  });

  it('should return the correct point for a cubic Bezier curve (degree 3)', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 25, y: 100 };
    const p2 = { x: 75, y: 100 };
    const p3 = { x: 100, y: 0 };
    const points = [p0, p1, p2, p3];

    expect(getPointOnBezier(points, 0)).toEqual(p0);
    expect(getPointOnBezier(points, 1)).toEqual(p3);

    // Test a specific point, e.g., t=0.5
    // B(0.5) = (0.5)^3 P0 + 3(0.5)^2(0.5) P1 + 3(0.5)(0.5)^2 P2 + (0.5)^3 P3
    // B(0.5) = 0.125 P0 + 0.375 P1 + 0.375 P2 + 0.125 P3
    // x = 0.125*0 + 0.375*25 + 0.375*75 + 0.125*100 = 0 + 9.375 + 28.125 + 12.5 = 50
    // y = 0.125*0 + 0.375*100 + 0.375*100 + 0.125*0 = 0 + 37.5 + 37.5 + 0 = 75
    expect(getPointOnBezier(points, 0.5)).toEqual({ x: 50, y: 75 });
  });

  it('should return the correct point for a quartic Bezier curve (degree 4)', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 20, y: 100 };
    const p2 = { x: 50, y: 50 };
    const p3 = { x: 80, y: 100 };
    const p4 = { x: 100, y: 0 };
    const points = [p0, p1, p2, p3, p4];

    expect(getPointOnBezier(points, 0)).toEqual(p0);
    expect(getPointOnBezier(points, 1)).toEqual(p4);

    // B(0.5) for a quartic curve
    // x = 0.0625*0 + 0.25*20 + 0.375*50 + 0.25*80 + 0.0625*100 = 0 + 5 + 18.75 + 20 + 6.25 = 50
    // y = 0.0625*0 + 0.25*100 + 0.375*50 + 0.25*100 + 0.0625*0 = 0 + 25 + 18.75 + 25 + 0 = 68.75
    expect(getPointOnBezier(points, 0.5)).toEqual({ x: 50, y: 68.75 });
  });

  it('should handle edge cases (t=0 and t=1)', () => {
    const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
    expect(getPointOnBezier(points, 0)).toEqual(points[0]);
    expect(getPointOnBezier(points, 1)).toEqual(points[points.length - 1]);
  });

  it('should return {x:0, y:0} for empty control points array', () => {
    expect(getPointOnBezier([], 0.5)).toEqual({ x: 0, y: 0 });
  });

  it('should return the single point for a single control point array', () => {
    const p0 = { x: 123, y: 456 };
    expect(getPointOnBezier([p0], 0.5)).toEqual(p0);
  });
});