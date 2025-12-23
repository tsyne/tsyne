import { chromaticAberration } from './chromatic-aberration';
import { createNamedColorGrid, wasModified } from './test-utils';

describe('chromaticAberration', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = chromaticAberration(pixels, width, height, 2);
    expect(result).not.toBe(pixels);
  });

  test('offset 0 = original', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = chromaticAberration(pixels, width, height, 0);
    expect(wasModified(pixels, result)).toBe(false);
  });

  test('offset > 0 shifts channels', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = chromaticAberration(pixels, width, height, 3);
    expect(wasModified(pixels, result)).toBe(true);
  });
});
