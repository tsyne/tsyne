/** Hatched screen effect - crosshatch line pattern */
export function hatchedScreen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  lineWidth: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

      // Multiple hatching levels based on darkness
      let draw = false;

      // Diagonal lines (45 degrees)
      const d1 = (x + y) % lineWidth;
      if (lum < 192 && d1 < lineWidth / 2) draw = true;

      // Cross-hatch (135 degrees)
      const d2 = (x - y + 1000) % lineWidth;
      if (lum < 128 && d2 < lineWidth / 2) draw = true;

      // Horizontal lines for very dark
      if (lum < 64 && y % lineWidth < lineWidth / 2) draw = true;

      if (draw) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
      } else {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
      }
    }
  }
}
