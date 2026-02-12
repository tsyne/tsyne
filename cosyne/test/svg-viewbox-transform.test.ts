/**
 * Tests for ViewBoxMapping ↔ AffineMatrix unification.
 *
 * Verifies that the precomputed `transform` field on ViewBoxMapping
 * produces identical results to mapX/mapY/mapPoint, including after resize.
 *
 *   cd cosyne && npx jest test/svg-viewbox-transform.test.ts --forceExit
 */

import { SvgContext } from '../src';
import { AffineMatrix } from '../src/svg/transform';

/** Build a ViewBoxMapping with the same logic as createSvgContext's simple path. */
function makeMapping(
  minX: number, minY: number, vbW: number, vbH: number,
  canvasWidth: number, canvasHeight: number,
) {
  const vb = { minX, minY, width: vbW, height: vbH };
  const scaleX = canvasWidth / vbW;
  const scaleY = canvasHeight / vbH;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - vbW * scale) / 2;
  const offsetY = (canvasHeight - vbH * scale) / 2;
  const transform = AffineMatrix.translate(offsetX, offsetY)
    .multiply(AffineMatrix.scale(scale))
    .multiply(AffineMatrix.translate(-minX, -minY));
  return { vb, canvasWidth, canvasHeight, scale, offsetX, offsetY, transform };
}

/** Create an SvgContext directly (null app — we only test coordinate mapping). */
function makeCtx(
  minX: number, minY: number, vbW: number, vbH: number,
  canvasWidth: number, canvasHeight: number,
): SvgContext {
  const mapping = makeMapping(minX, minY, vbW, vbH, canvasWidth, canvasHeight);
  return new SvgContext(null as any, mapping);
}

describe('ViewBoxMapping transform', () => {
  it('transform.apply matches mapX/mapY for several points', () => {
    const ctx = makeCtx(0, 0, 100, 100, 400, 400);
    const m = ctx.getMapping();

    for (const [x, y] of [[0, 0], [50, 50], [100, 100], [25, 75]]) {
      const [tx, ty] = m.transform.apply(x, y);
      expect(tx).toBeCloseTo(ctx.mapX(x), 6);
      expect(ty).toBeCloseTo(ctx.mapY(y), 6);
    }
  });

  it('non-zero viewBox origin (minX/minY offset)', () => {
    const ctx = makeCtx(50, 50, 200, 200, 400, 400);
    const m = ctx.getMapping();

    // Point (50,50) is the viewBox origin → maps to (0,0)
    const [ox, oy] = m.transform.apply(50, 50);
    expect(ox).toBeCloseTo(ctx.mapX(50), 6);
    expect(oy).toBeCloseTo(ctx.mapY(50), 6);
    expect(ox).toBeCloseTo(0, 6);
    expect(oy).toBeCloseTo(0, 6);

    // Point (250, 250) is far corner → maps to (400, 400)
    const [cx, cy] = m.transform.apply(250, 250);
    expect(cx).toBeCloseTo(ctx.mapX(250), 6);
    expect(cy).toBeCloseTo(ctx.mapY(250), 6);
    expect(cx).toBeCloseTo(400, 6);
    expect(cy).toBeCloseTo(400, 6);
  });

  it('transform after resize matches new mapX/mapY', () => {
    const ctx = makeCtx(0, 0, 100, 100, 400, 400);

    // Resize to 200x200
    ctx.resize(200, 200);
    const m = ctx.getMapping();

    expect(m.canvasWidth).toBe(200);
    expect(m.canvasHeight).toBe(200);

    // scale = min(200/100, 200/100) = 2
    expect(m.scale).toBeCloseTo(2, 6);

    for (const [x, y] of [[0, 0], [50, 50], [100, 100]]) {
      const [tx, ty] = m.transform.apply(x, y);
      expect(tx).toBeCloseTo(ctx.mapX(x), 6);
      expect(ty).toBeCloseTo(ctx.mapY(y), 6);
    }
  });

  it('rectangular resize with centering', () => {
    const ctx = makeCtx(0, 0, 100, 100, 600, 300);
    const m = ctx.getMapping();

    // scale = min(600/100, 300/100) = 3
    // offsetX = (600 - 100*3)/2 = 150, offsetY = 0
    expect(m.scale).toBeCloseTo(3, 6);
    expect(m.offsetX).toBeCloseTo(150, 6);
    expect(m.offsetY).toBeCloseTo(0, 6);

    for (const [x, y] of [[0, 0], [50, 50], [100, 100]]) {
      const [tx, ty] = m.transform.apply(x, y);
      expect(tx).toBeCloseTo(ctx.mapX(x), 6);
      expect(ty).toBeCloseTo(ctx.mapY(y), 6);
    }

    // Verify specific mapped values: (0,0) → (150, 0), (50,50) → (300, 150)
    expect(ctx.mapX(0)).toBeCloseTo(150, 6);
    expect(ctx.mapY(0)).toBeCloseTo(0, 6);
    expect(ctx.mapX(50)).toBeCloseTo(300, 6);
    expect(ctx.mapY(50)).toBeCloseTo(150, 6);
  });

  it('mapLength consistent with transform scale', () => {
    const ctx = makeCtx(0, 0, 100, 100, 400, 400);
    const m = ctx.getMapping();

    for (const l of [1, 10, 50, 100]) {
      expect(ctx.mapLength(l)).toBeCloseTo(m.transform.a * l, 6);
    }
  });

  it('identity-like case — viewBox matches canvas size', () => {
    const ctx = makeCtx(0, 0, 400, 400, 400, 400);
    const m = ctx.getMapping();

    // scale=1, offset=0 → transform maps points 1:1
    expect(m.scale).toBeCloseTo(1, 6);
    expect(m.offsetX).toBeCloseTo(0, 6);
    expect(m.offsetY).toBeCloseTo(0, 6);

    for (const [x, y] of [[0, 0], [200, 200], [400, 400]]) {
      const [tx, ty] = m.transform.apply(x, y);
      expect(tx).toBeCloseTo(x, 6);
      expect(ty).toBeCloseTo(y, 6);
    }
  });
});
