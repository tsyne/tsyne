import { replaceColor } from './replace-color';
import { createNamedColorGrid, getPixel, blockCenter, wasModified, clonePixels } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('replaceColor', () => {
  test('replaces matching color', () => {
    const { pixels, width } = createNamedColorGrid();
    // Replace red with blue
    replaceColor(pixels, 255, 0, 0, 0, 0, 255, 50);
    const replaced = getPixel(pixels, width, ...at(0, 0));
    expect(replaced.b).toBe(255);
    expect(replaced.r).toBe(0);
  });

  test('leaves non-matching colors unchanged', () => {
    const { pixels, width } = createNamedColorGrid();
    const greenBefore = getPixel(pixels, width, ...at(1, 0));
    // Replace red with blue (shouldn't affect green)
    replaceColor(pixels, 255, 0, 0, 0, 0, 255, 50);
    const greenAfter = getPixel(pixels, width, ...at(1, 0));
    expect(greenAfter.g).toBe(greenBefore.g);
  });
});
