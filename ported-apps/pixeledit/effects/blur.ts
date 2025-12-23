/** Box blur effect */
export function blur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels.length);
  const size = radius * 2 + 1;
  const divisor = size * size;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const i = (py * width + px) * 4;
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          a += pixels[i + 3];
        }
      }
      const i = (y * width + x) * 4;
      result[i] = r / divisor;
      result[i + 1] = g / divisor;
      result[i + 2] = b / divisor;
      result[i + 3] = a / divisor;
    }
  }
  return result;
}
