import { nightVision } from './night-vision';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('nightVision', () => {
  test('produces green-only output', () => {
    const { pixels, width } = createNamedColorGrid();
    nightVision(pixels);
    const p = getPixel(pixels, width, ...at(2, 2));
    expect(p.r).toBe(0);
    expect(p.b).toBe(0);
    expect(p.g).toBeGreaterThan(0);
  });

  test('black stays black', () => {
    const { pixels, width } = createNamedColorGrid();
    nightVision(pixels);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });
});
