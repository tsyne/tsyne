import { wave } from './wave';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('wave', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = wave(pixels, width, height, 5, 0.5);
    expect(result).not.toBe(pixels);
  });

  test('modifies pixel positions', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = wave(pixels, width, height, 5, 0.5);
    expect(wasModified(pixels, result)).toBe(true);
  });

  test('amplitude 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = wave(pixels, width, height, 0, 0.5);
    expect(wasModified(pixels, result)).toBe(false);
  });

  test('preserves array length', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = wave(pixels, width, height, 3, 1);
    expect(result.length).toBe(pixels.length);
  });
});
