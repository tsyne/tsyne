import { colorBalance } from './color-balance';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('colorBalance', () => {
  test('shifts channels independently', () => {
    const { pixels, width } = createNamedColorGrid();
    colorBalance(pixels, 30, -20, 10);
    // gray50 (128,128,128) → (158,108,138)
    expect(getPixel(pixels, width, ...at(2, 2))).toEqual({ r: 158, g: 108, b: 138, a: 255 });
  });

  test('clamps to valid range', () => {
    const { pixels, width } = createNamedColorGrid();
    colorBalance(pixels, 100, 100, 100);
    // white (255,255,255) + 100 = clamped to 255
    expect(getPixel(pixels, width, ...at(0, 3))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('negative shifts work', () => {
    const { pixels, width } = createNamedColorGrid();
    colorBalance(pixels, -50, -50, -50);
    // gray50 → (78,78,78)
    expect(getPixel(pixels, width, ...at(2, 2))).toEqual({ r: 78, g: 78, b: 78, a: 255 });
  });
});
