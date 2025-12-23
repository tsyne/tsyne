import { colorTemperature } from './color-temperature';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('colorTemperature', () => {
  test('positive = warmer (more red, less blue)', () => {
    const { pixels, width } = createNamedColorGrid();
    const before = getPixel(pixels, width, ...at(2, 2));
    colorTemperature(pixels, 50);
    const after = getPixel(pixels, width, ...at(2, 2));
    expect(after.r).toBeGreaterThan(before.r);
    expect(after.b).toBeLessThan(before.b);
  });

  test('negative = cooler (more blue, less red)', () => {
    const { pixels, width } = createNamedColorGrid();
    const before = getPixel(pixels, width, ...at(2, 2));
    colorTemperature(pixels, -50);
    const after = getPixel(pixels, width, ...at(2, 2));
    expect(after.b).toBeGreaterThan(before.b);
    expect(after.r).toBeLessThan(before.r);
  });
});
