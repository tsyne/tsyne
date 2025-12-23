import { edgeDetect } from './edge-detect';
import { createNamedColorGrid, getPixel, createPixels } from './test-utils';

describe('edgeDetect', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = edgeDetect(pixels, width, height);
    expect(result).not.toBe(pixels);
  });

  test('produces grayscale output', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = edgeDetect(pixels, width, height);
    const p = getPixel(result, width, 10, 10);
    expect(p.r).toBe(p.g);
    expect(p.g).toBe(p.b);
  });

  test('uniform region has low edge values', () => {
    const pixels = createPixels(20, 20, { r: 128, g: 128, b: 128 });
    const result = edgeDetect(pixels, 20, 20);
    const center = getPixel(result, 20, 10, 10);
    expect(center.r).toBeLessThan(10);
  });

  test('edge between colors has high values', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = edgeDetect(pixels, width, height);
    // Edge at boundary between blocks
    const edge = getPixel(result, width, 10, 5);
    expect(edge.r).toBeGreaterThan(50);
  });
});
