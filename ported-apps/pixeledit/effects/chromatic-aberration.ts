/** Chromatic aberration (RGB channel offset) */
export function chromaticAberration(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  offset: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const rx = Math.max(0, Math.min(width - 1, x - offset));
      const bx = Math.max(0, Math.min(width - 1, x + offset));
      result[i] = pixels[(y * width + rx) * 4];
      result[i + 1] = pixels[i + 1];
      result[i + 2] = pixels[(y * width + bx) * 4 + 2];
      result[i + 3] = pixels[i + 3];
    }
  }
  return result;
}
