import { brightness } from './brightness';
import { createNamedColorGrid, getPixel, blockCenter, COLORS } from './test-utils';

describe('brightness', () => {
  test('gray50 + 50 → (178,178,178)', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2); // gray50

    brightness(pixels, 50);

    const p = getPixel(pixels, width, x, y);
    expect(p).toEqual({ r: 178, g: 178, b: 178, a: 255 });
  });

  test('gray75 + 100 clamps to white', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(3, 2); // gray75 (192)

    brightness(pixels, 100);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('gray50 - 50 → (78,78,78)', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2);

    brightness(pixels, -50);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 78, g: 78, b: 78, a: 255 });
  });

  test('black - 50 clamps to black', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 2); // black

    brightness(pixels, -50);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('preserves alpha', () => {
    const { pixels, width } = createNamedColorGrid();
    brightness(pixels, 50);
    expect(getPixel(pixels, width, 5, 5).a).toBe(255);
  });
});
