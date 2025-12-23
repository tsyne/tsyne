/** Scanlines effect (CRT-like horizontal lines) */
export function scanlines(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  spacing: number,
  intensity: number
): void {
  const factor = 1 - intensity / 100;

  for (let y = 0; y < height; y++) {
    if (y % spacing === 0) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        pixels[idx] *= factor;
        pixels[idx + 1] *= factor;
        pixels[idx + 2] *= factor;
      }
    }
  }
}
