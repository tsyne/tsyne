import { highPass } from './high-pass';
import { createPixels, createGradientPixels } from './test-utils';

describe('highPass', () => {
  test('uniform area → neutral gray', () => {
    const pixels = createPixels(20, 20, { r: 100, g: 100, b: 100 });
    const result = highPass(pixels, 20, 20, 2);
    // Uniform areas should be close to 128 (neutral)
    expect(Math.abs(result[40] - 128)).toBeLessThan(10);
  });

  test('enhances edges in gradient', () => {
    const pixels = createGradientPixels(20, 20);
    const result = highPass(pixels, 20, 20, 2);
    // Should have variation from neutral gray
    let hasVariation = false;
    for (let i = 0; i < result.length; i += 4) {
      if (Math.abs(result[i] - 128) > 5) hasVariation = true;
    }
    expect(hasVariation).toBe(true);
  });
});
